/**
 * Single source of truth for the GL-01 product + purchase options.
 * Korea-first launch: KRW, one-time purchase (no subscription).
 */
export const PRODUCT = {
  code: "GL-01",
  name: "glo GL-01",
  /** regular price per month after the 7/22 launch */
  regularPrice: 119000,
  currency: "KRW" as const,
} as const;

export type ProductOption = {
  key: string;
  months: number;
  label: string;
  /** 현재 판매가(KRW, 번들 전체) — getOption() 이 이벤트 기간에 따라 해석 */
  price: number;
  /** 런칭 이벤트 종료 후 일반 판매가 */
  postPrice: number;
  /** 기간 프로모션가 — PROMO 창 안에서만 적용 (없으면 일반가) */
  promoPrice?: number;
  badge?: string;
};

/** 공식 런칭 이벤트 종료 시각 — 2026-08-11 자정(KST) = 08-11T15:00Z.
 *  이후 getOption() 이 자동으로 일반 판매가(postPrice)를 반환한다. */
export const LAUNCH_EVENT_ENDS_AT = Date.parse("2026-08-11T15:00:00Z");

export function launchEventActive(now: number = Date.now()): boolean {
  return now < LAUNCH_EVENT_ENDS_AT;
}

/** 기간 프로모션 — 이 창 안에서만 promoPrice 가 결제가가 된다.
 *  종료 시각이 지나면 결제·화면 모두 자동으로 일반 판매가로 돌아간다.
 *  2026-10 프로모션: 10/16 ~ 10/30(금) 24:00 KST */
export const PROMO = {
  label: "10월 프로모션",
  startsAt: Date.parse("2026-10-16T00:00:00+09:00"),
  endsAt: Date.parse("2026-10-31T00:00:00+09:00"),
  /** 내부용 마감 표기 — 고객 화면에는 마감일을 노출하지 않는다 */
  endLabel: "10월 30일(금) 자정",
  shortEnd: "10/30",
  /** 고객 화면 종료 안내 */
  publicNote: "한정 수량 소진 시 종료",
  /** 이벤트 수량 (전 판매 채널 합산, 운영 추정치) — 판매 속도가 달라지면 여기만 고친다 */
  stockTotal: 1000,
  /** 오픈 시점 남은 수량 — stockFrom 부터 선형으로 줄어 종료 시각에 0 */
  stockAtStart: 762,
  /** 수량 감소 시작 시각 (사이트 오픈 시점) */
  stockFrom: Date.parse("2026-10-16T18:20:00+09:00"),
} as const;

export function promoActive(now: number = Date.now()): boolean {
  return now >= PROMO.startsAt && now < PROMO.endsAt;
}

/** 시점 기준 이벤트 남은 수량 (박스) — 기간 안에서는 최소 1 */
export function promoStockLeft(now: number = Date.now()): number {
  const span = PROMO.endsAt - PROMO.stockFrom;
  const frac = Math.min(1, Math.max(0, (now - PROMO.stockFrom) / span));
  return Math.max(1, Math.ceil(PROMO.stockAtStart * (1 - frac)));
}

/** Selectable duration bundles. Price is the trusted server-side amount.
 *  price   = 런칭 이벤트가 (2026-07-22~08-11): 소비자가 119,000/월에 30–50% 할인
 *  postPrice = 일반 판매가 (2026-08-10 개정): 수량별 16/21/26/33/40% 할인 */
export const OPTIONS: ProductOption[] = [
  { key: "1m", months: 1, label: "1개월 분", price: 83300, postPrice: 99960, promoPrice: 86900 },
  { key: "2m", months: 2, label: "2개월 분", price: 159460, postPrice: 188020, promoPrice: 164900, badge: "추천" },
  { key: "3m", months: 3, label: "3개월 분", price: 224910, postPrice: 264180, promoPrice: 236900, badge: "베스트" },
  { key: "4m", months: 4, label: "4개월 분", price: 276080, postPrice: 318920, promoPrice: 299900 },
  { key: "6m", months: 6, label: "6개월 분", price: 357000, postPrice: 428400, promoPrice: 419900 },
];

/** 시점 기준 실판매가 — 런칭 이벤트 → (기간 프로모션) → 일반 판매가 순. */
export function currentPrice(o: ProductOption, now: number = Date.now()): number {
  if (launchEventActive(now)) return o.price;
  if (o.promoPrice && promoActive(now)) return o.promoPrice;
  return o.postPrice;
}

export function getOption(key: string | undefined | null): ProductOption {
  const o = OPTIONS.find((x) => x.key === key) ?? OPTIONS[0];
  return { ...o, price: currentPrice(o) };
}

/** Regular (pre-discount) price for an option = months × monthly regular price. */
export function regularOf(o: ProductOption): number {
  return o.months * PRODUCT.regularPrice;
}

/** Discount percent vs the regular price (e.g. 52.5). */
export function discountOf(o: ProductOption): number {
  return Math.round((1 - o.price / regularOf(o)) * 1000) / 10;
}

export function formatPct(d: number): string {
  return `${Number.isInteger(d) ? d : d.toFixed(1)}%`;
}

export function orderNameOf(o: ProductOption): string {
  return `${PRODUCT.name} ${o.label}`;
}

export function formatKRW(value: number): string {
  return `${value.toLocaleString("ko-KR")}원`;
}

/** Toss requires orderId to be 6–64 chars, [A-Za-z0-9_-]. */
export function generateOrderId(): string {
  return `glo_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
}
