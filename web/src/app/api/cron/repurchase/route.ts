import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone, sendPlainNotice } from "@/lib/notify";
import { pointBalance } from "@/lib/points";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * 재구매 리마인드 — 구매분 소진이 임박한 고객에게 1회 발송한다.
 * Vercel Cron이 매일 호출(vercel.json). notifications(kind=repurchase)로 중복을 막는다.
 *
 * 소진 추정: 수령일 + 개월수×30일. 소진 5일 전(LEAD)부터 발송하고,
 * 크론이 며칠 쉬어도 따라잡도록 +14일(CATCHUP) 창을 둔다.
 *
 * ⚠️ 광고성 메시지 규정 (정보통신망법 §50):
 * - 기존 거래 고객에게는 거래 종료 후 6개월 내 동종 재화 광고를 사전동의 없이
 *   보낼 수 있다 → MAX_DAYS 180일로 제한.
 * - "(광고)" 표기와 080 무료수신거부 번호는 의무 → SOLAPI_080_NUMBER 가 설정되지
 *   않으면 발송하지 않고 후보 목록만 돌려준다(드라이런).
 * - 야간(21~08시) 발송 금지 → 크론은 11시(KST)에 돈다.
 */

const LEAD_DAYS = 5;
const CATCHUP_DAYS = 14;
const MAX_DAYS_SINCE_DELIVERED = 180;
const MAX_SENDS_PER_RUN = 50;
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://glo-us.com";

type OrderRow = {
  order_id: string;
  user_id: string | null;
  order_name: string | null;
  quantity: number | null;
  delivered_at: string;
  customer_name: string | null;
  customer_phone: string | null;
  shipping_address: { recipient?: string; phone?: string } | null;
};

/** "glo GL-01 2개월 분" × quantity → 총 개월수 (파싱 실패 시 1개월) */
function monthsOf(o: OrderRow): number {
  const m = /(\d+)\s*개월/.exec(o.order_name ?? "");
  return (m ? parseInt(m[1], 10) : 1) * Math.max(1, o.quantity ?? 1);
}

function repurchaseText(opts: { name: string | null; orderName: string; points: number; unsub: string }): string {
  return [
    `(광고) [glo] 소진 시기 안내`,
    ``,
    `${opts.name ? opts.name + " 고객님, " : ""}주문하신 ${opts.orderName}이 곧 소진되는 시기입니다.`,
    `피부 컨디션은 꾸준함이 만듭니다. 끊기지 않게 미리 준비해두세요.`,
    ``,
    ...(opts.points > 0
      ? [`보유 포인트 ${opts.points.toLocaleString("ko-KR")}P는 재구매 시 바로 사용하실 수 있습니다.`, ``]
      : []),
    `주문하기`,
    `${SITE}/product`,
    ``,
    `무료수신거부 ${opts.unsub}`,
  ].join("\n");
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const admin = createAdminClient();
  const now = Date.now();
  const floor = new Date(now - MAX_DAYS_SINCE_DELIVERED * 86400000).toISOString();

  const { data, error } = await admin
    .from("orders")
    .select("order_id, user_id, order_name, quantity, delivered_at, customer_name, customer_phone, shipping_address")
    .eq("status", "delivered")
    .gte("delivered_at", floor)
    .limit(500)
    .returns<OrderRow[]>();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // 소진 창(LEAD~CATCHUP)에 들어온 주문만 후보로
  const candidates = (data ?? []).filter((o) => {
    const days = Math.floor((now - Date.parse(o.delivered_at)) / 86400000);
    const total = monthsOf(o) * 30;
    return days >= total - LEAD_DAYS && days <= total + CATCHUP_DAYS && days <= MAX_DAYS_SINCE_DELIVERED;
  });

  const unsub = process.env.SOLAPI_080_NUMBER;
  let sent = 0;
  let skipped = 0;
  const failures: Array<{ order_id: string; error: string }> = [];
  const dryRun: string[] = [];
  const sentPhones = new Set<string>(); // 같은 회차에 같은 번호로 중복 발송 방지

  for (const o of candidates) {
    if (sent >= MAX_SENDS_PER_RUN) break;

    // 주문당 평생 1회 — 이미 보냈으면 건너뛴다
    const { data: already } = await admin
      .from("notifications")
      .select("id")
      .eq("order_id", o.order_id)
      .eq("kind", "repurchase")
      .eq("status", "sent")
      .maybeSingle();
    if (already) {
      skipped += 1;
      continue;
    }

    // 이미 재구매한 고객은 제외 (이 주문 수령 이후 새 유효 주문이 있으면)
    if (o.user_id) {
      const { data: newer } = await admin
        .from("orders")
        .select("id")
        .eq("user_id", o.user_id)
        .in("status", ["paid", "preparing", "shipped", "delivered"])
        .gt("created_at", o.delivered_at)
        .limit(1)
        .maybeSingle();
      if (newer) {
        // 재구매 완료 — 다음 회차에도 조회되지 않게 발송됨으로 기록
        await admin.from("notifications").insert({
          order_id: o.order_id,
          kind: "repurchase",
          channel: "lms",
          status: "sent",
          error: "재구매 확인되어 미발송 처리",
        });
        skipped += 1;
        continue;
      }
    }

    const to = normalizePhone(o.shipping_address?.phone ?? o.customer_phone);
    if (!to || sentPhones.has(to)) {
      skipped += 1;
      continue;
    }

    if (!unsub) {
      // 080 수신거부 번호가 없으면 광고 발송 불가 — 후보만 보고한다
      dryRun.push(o.order_id);
      continue;
    }

    const points = o.user_id ? await pointBalance(admin, o.user_id) : 0;
    const name = o.shipping_address?.recipient ?? o.customer_name;
    const orderName = o.order_name ?? "glo GL-01";
    const r = await sendPlainNotice({
      to,
      subject: "(광고) glo 소진 시기 안내",
      text: repurchaseText({ name, orderName, points, unsub }),
      templateEnvKey: "SOLAPI_TEMPLATE_REPURCHASE",
      variables: {
        "#{고객명}": name ?? "고객",
        "#{상품명}": orderName,
        "#{포인트}": String(points),
      },
    });

    await admin.from("notifications").insert({
      order_id: o.order_id,
      kind: "repurchase",
      channel: r.channel,
      to_phone: to,
      status: r.ok ? "sent" : "failed",
      provider_message_id: r.messageId ?? null,
      error: r.error ?? null,
    });
    if (r.ok) {
      sent += 1;
      sentPhones.add(to);
    } else {
      failures.push({ order_id: o.order_id, error: r.error ?? "발송 실패" });
    }
  }

  return Response.json({
    checked: candidates.length,
    sent,
    skipped,
    ...(dryRun.length > 0 ? { dryRun: "SOLAPI_080_NUMBER 미설정 — 발송 보류", candidates: dryRun } : {}),
    failures: failures.slice(0, 20),
  });
}
