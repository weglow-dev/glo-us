import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone, sendReviewRequest } from "@/lib/notify";
import { getPointPolicy } from "@/lib/points";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const AFTER_DAYS = 7;
/** 1차 요청 후 이만큼 지나도 미작성이면 2차 리마인드 1회 */
const REMIND_AFTER_DAYS = 14;
/** 1차가 이보다 오래된 건 리마인드하지 않는다 — 도입 시점 소급 폭주 방지 + 시의성 */
const REMIND_WINDOW_DAYS = 60;
/** 광고성 문자는 거래(수령) 후 180일 내로 제한 (정보통신망법 §50 기존거래 예외) */
const AD_MAX_DAYS = 180;

/**
 * 배송완료 7일이 지난 주문에 리뷰 요청 문자를 1회 발송하고(1차,
 * review_requested_at 으로 중복 방지), 1차 후 14일이 지나도 리뷰가 없으면
 * 2차 리마인드를 1회 더 보낸다(notifications kind=review_remind 로 중복 방지).
 * Vercel Cron이 매일 호출(vercel.json). 이미 리뷰를 쓴 주문은 건너뛴다.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - AFTER_DAYS * 86400000).toISOString();

  const { data, error } = await admin
    .from("orders")
    .select("order_id, customer_name, customer_phone, shipping_address")
    .eq("status", "delivered")
    .lte("delivered_at", cutoff)
    .is("review_requested_at", null)
    .limit(100)
    .returns<
      {
        order_id: string;
        customer_name: string | null;
        customer_phone: string | null;
        shipping_address: { recipient?: string; phone?: string } | null;
      }[]
    >();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const orders = data ?? [];
  const policy = await getPointPolicy(admin);
  let sent = 0;
  let skipped = 0;
  const failures: Array<{ order_id: string; error: string }> = [];

  for (const o of orders) {
    // 이미 리뷰를 쓴 주문은 요청하지 않는다 (요청됨으로 표시해 다음번에도 제외).
    const { data: existing } = await admin
      .from("reviews")
      .select("id")
      .eq("order_id", o.order_id)
      .maybeSingle();
    if (existing) {
      await admin
        .from("orders")
        .update({ review_requested_at: new Date().toISOString() })
        .eq("order_id", o.order_id);
      skipped += 1;
      continue;
    }

    const to = normalizePhone(o.shipping_address?.phone ?? o.customer_phone);
    if (!to) {
      await admin
        .from("orders")
        .update({ review_requested_at: new Date().toISOString() })
        .eq("order_id", o.order_id);
      failures.push({ order_id: o.order_id, error: "연락처 없음" });
      continue;
    }

    const r = await sendReviewRequest({
      to,
      name: o.shipping_address?.recipient ?? o.customer_name,
      textPoint: policy.review_text,
      totalPoint: policy.review_text + policy.review_media,
    });
    await admin.from("notifications").insert({
      order_id: o.order_id,
      kind: "review_request",
      channel: r.channel,
      to_phone: to,
      status: r.ok ? "sent" : "failed",
      provider_message_id: r.messageId ?? null,
      error: r.error ?? null,
    });
    if (r.ok) {
      sent += 1;
      await admin
        .from("orders")
        .update({ review_requested_at: new Date().toISOString() })
        .eq("order_id", o.order_id);
    } else {
      failures.push({ order_id: o.order_id, error: r.error ?? "발송 실패" });
    }
  }

  // ---- 2차 리마인드: 1차 발송 후 14일 경과 + 리뷰 미작성 ----
  const remindCutoff = new Date(Date.now() - REMIND_AFTER_DAYS * 86400000).toISOString();
  const adFloor = new Date(Date.now() - AD_MAX_DAYS * 86400000).toISOString();
  let reminded = 0;

  const { data: remindData } = await admin
    .from("orders")
    .select("order_id, customer_name, customer_phone, shipping_address")
    .eq("status", "delivered")
    .not("review_requested_at", "is", null)
    .lte("review_requested_at", remindCutoff)
    .gte("review_requested_at", new Date(Date.now() - REMIND_WINDOW_DAYS * 86400000).toISOString())
    .gte("delivered_at", adFloor)
    .limit(100)
    .returns<
      {
        order_id: string;
        customer_name: string | null;
        customer_phone: string | null;
        shipping_address: { recipient?: string; phone?: string } | null;
      }[]
    >();

  for (const o of remindData ?? []) {
    // 리마인드는 주문당 1회
    const { data: already } = await admin
      .from("notifications")
      .select("id")
      .eq("order_id", o.order_id)
      .eq("kind", "review_remind")
      .eq("status", "sent")
      .maybeSingle();
    if (already) continue;

    // 그 사이 리뷰를 썼으면 리마인드하지 않는다 (발송됨으로 기록해 다음에도 제외)
    const { data: reviewed } = await admin
      .from("reviews")
      .select("id")
      .eq("order_id", o.order_id)
      .maybeSingle();
    if (reviewed) {
      await admin.from("notifications").insert({
        order_id: o.order_id,
        kind: "review_remind",
        channel: "lms",
        status: "sent",
        error: "리뷰 작성 확인되어 미발송 처리",
      });
      continue;
    }

    const to = normalizePhone(o.shipping_address?.phone ?? o.customer_phone);
    if (!to) continue;

    const r = await sendReviewRequest({
      to,
      name: o.shipping_address?.recipient ?? o.customer_name,
      textPoint: policy.review_text,
      totalPoint: policy.review_text + policy.review_media,
      remind: true,
    });
    await admin.from("notifications").insert({
      order_id: o.order_id,
      kind: "review_remind",
      channel: r.channel,
      to_phone: to,
      status: r.ok ? "sent" : "failed",
      provider_message_id: r.messageId ?? null,
      error: r.error ?? null,
    });
    if (r.ok) reminded += 1;
    else failures.push({ order_id: o.order_id, error: r.error ?? "리마인드 실패" });
  }

  return Response.json({
    checked: orders.length,
    sent,
    reminded,
    skipped,
    failures: failures.slice(0, 20),
  });
}
