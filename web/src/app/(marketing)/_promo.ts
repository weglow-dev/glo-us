/**
 * 기간 프로모션 안내 UI — 상단 고정 띠(마케팅 페이지 공통) + 상세 히어로 배지 +
 * 모바일 하단 구매 바 안내. 프로모션 창(lib/product PROMO) 안에서만 붙고,
 * 기간이 끝나면 아무것도 그리지 않는다. HTML 에는 아무것도 박지 않는다 —
 * 종료 후 첫 페인트·미리보기에 할인 안내가 남지 않게.
 *
 * NOT generated — _interactions.tsx 의 각 페이지 effect 에서 호출한다.
 */
import { OPTIONS, PROMO, promoActive, regularOf } from "@/lib/product";

const STRIP_H = 36;

const CSS = `
.promo-strip{position:fixed;top:0;left:0;right:0;height:${STRIP_H}px;z-index:70;display:flex;align-items:center;justify-content:center;gap:12px;padding:0 16px;background:#2a1218;color:#f4ebeb;font-size:13px;letter-spacing:-.1px;text-decoration:none;white-space:nowrap;overflow:hidden;}
.promo-strip:hover .promo-strip-go{color:#fff;}
.promo-strip-badge{flex:none;padding:3px 10px;border-radius:100px;background:#8a4a52;color:#fff;font-size:11px;font-weight:700;letter-spacing:.2px;}
.promo-strip-txt b{font-weight:700;color:#fff;}
.promo-strip-dday{flex:none;padding:2px 8px;border:1px solid rgba(244,235,235,.35);border-radius:100px;font-size:11px;font-weight:700;font-variant-numeric:tabular-nums;}
.promo-strip-go{flex:none;color:#d4b5b5;font-weight:600;}
.promo-strip-short{display:none;}
/* 홈 히어로는 배경이 어두워 같은 톤이면 묻힌다 — 강조색으로 반전 */
html.glo-home-nav .promo-strip{background:#8a4a52;}
html.glo-home-nav .promo-strip-badge{background:#2a1218;}
html.glo-home-nav .promo-strip-go{color:#fff;}
html.has-promo nav{top:${18 + STRIP_H}px;}
html.has-promo .ptabs{top:${STRIP_H}px;}
html.has-promo .glohome .hero-brand{top:calc(clamp(30px,6.5vh,68px) + ${STRIP_H}px);}
.promo-pill{display:inline-flex;align-self:flex-start;width:fit-content;max-width:100%;align-items:center;gap:8px;margin-bottom:16px;padding:7px 14px 7px 12px;border-radius:100px;background:#8a4a52;color:#fff;font-size:12.5px;font-weight:600;letter-spacing:-.1px;}
.promo-pill-dot{width:7px;height:7px;border-radius:50%;background:#fff;animation:promoPulse 1.6s ease-in-out infinite;}
.promo-pill b{font-weight:800;}
@keyframes promoPulse{0%,100%{opacity:1}50%{opacity:.35}}
.promo-float-note{margin:0 0 8px;text-align:center;font-size:12px;font-weight:600;color:#8a4a52;letter-spacing:-.1px;}
.promo-float-note b{font-weight:800;}
.promo-band{margin:0 0 18px;padding:16px 18px 14px;border-radius:14px;background:linear-gradient(135deg,#2a1218 0%,#5a2229 55%,#8a4a52 100%);color:#fff;box-shadow:0 12px 28px rgba(58,26,34,.22);}
.promo-band-top{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;}
.promo-band-badge{display:inline-flex;align-items:center;gap:8px;padding:5px 12px 5px 10px;border-radius:100px;background:rgba(255,255,255,.16);font-size:12.5px;font-weight:700;}
.promo-band-off{font-size:14px;color:rgba(255,255,255,.85);}
.promo-band-off b{font-size:20px;font-weight:800;color:#fff;letter-spacing:-.5px;}
.promo-stock{margin-top:14px;}
.promo-stock-top{display:flex;align-items:baseline;justify-content:space-between;gap:8px;font-size:12.5px;color:rgba(255,255,255,.78);}
.promo-stock-top b{font-weight:800;color:#fff;}
.promo-stock-left b{font-size:22px;letter-spacing:-.5px;font-variant-numeric:tabular-nums;}
.promo-band-bar{position:relative;height:10px;margin-top:8px;border-radius:100px;background:rgba(255,255,255,.18);overflow:hidden;}
.promo-band-bar>div{height:100%;border-radius:100px;background:linear-gradient(90deg,#f4ebeb,#ffffff);transition:width .8s ease;}
.promo-band-msg{margin-top:14px;padding:11px 14px;border-radius:10px;background:rgba(0,0,0,.26);font-size:17px;font-weight:700;letter-spacing:-.3px;line-height:1.35;word-break:keep-all;}
.promo-band-msg b{display:inline-block;margin-right:6px;padding:2px 8px;border-radius:6px;background:#f4ebeb;color:#5a2229;font-size:13px;font-weight:800;vertical-align:2px;}
.promo-band-foot{margin-top:9px;font-size:12px;color:rgba(255,255,255,.72);}
.promo-cost{display:flex;flex-direction:column;align-items:center;gap:10px;max-width:560px;margin:0 auto 44px;padding:22px 24px;border:1px solid rgba(138,74,82,.28);border-radius:16px;background:#fff;text-align:center;box-shadow:0 10px 30px rgba(58,26,34,.06);}
.promo-cost-badge{display:inline-flex;align-items:center;gap:8px;padding:6px 14px 6px 12px;border-radius:100px;background:#8a4a52;color:#fff;font-size:12.5px;font-weight:700;}
.promo-cost-txt{margin:0;font-size:15px;line-height:1.6;color:#2a1218;word-break:keep-all;}
.promo-cost-txt b{font-weight:800;color:#8a4a52;}
.promo-cost-go{font-size:13.5px;font-weight:700;color:#8a4a52;text-decoration:none;border-bottom:1px solid rgba(138,74,82,.4);padding-bottom:1px;}
.promo-cost-go:hover{border-bottom-color:#8a4a52;}
@media (max-width:640px){
  .promo-band{padding:14px 14px 12px;}
  .promo-band-msg{font-size:15.5px;padding:10px 12px;}
  .promo-cost{margin-bottom:32px;padding:18px 16px;}
  .promo-cost-txt{font-size:14px;}
  .promo-strip{gap:8px;font-size:12px;}
  .promo-strip-long{display:none;}
  .promo-strip-short{display:inline;}
}
@media (prefers-reduced-motion:reduce){.promo-pill-dot{animation:none;}}
`;

function maxOff(): number {
  return Math.max(
    ...OPTIONS.map((o) =>
      o.promoPrice ? Math.round((1 - o.promoPrice / regularOf(o)) * 100) : 0,
    ),
  );
}

/** 프로모션 기간이면 안내 UI 를 붙이고 cleanup 을 돌려준다. 기간 밖이면 no-op. */
export function mountPromoUi(
  opts: { heroPill?: boolean; floatNote?: boolean; costNote?: boolean } = {},
): () => void {
  if (!promoActive()) return () => {};
  // 공구 회차 페이지는 회차 전용 가격·카운트다운이 따로 있다
  if (location.pathname.startsWith("/product/@")) return () => {};

  const added: Element[] = [];
  const off = maxOff();
  const html = document.documentElement;

  if (!document.getElementById("promo-style")) {
    const st = document.createElement("style");
    st.id = "promo-style";
    st.textContent = CSS;
    document.head.appendChild(st);
    added.push(st);
  }

  // ① 상단 고정 띠 — 어느 페이지에서든 단가표로
  const strip = document.createElement("a");
  strip.className = "promo-strip";
  strip.href = "/product#buy";
  strip.setAttribute("aria-label", `${PROMO.label} 진행 중 — 최대 ${off}% 할인, ${PROMO.publicNote}`);
  strip.innerHTML =
    `<span class="promo-strip-badge">${PROMO.label} 진행 중</span>` +
    `<span class="promo-strip-txt promo-strip-long">최대 <b>${off}%</b> 할인 · ${PROMO.publicNote}</span>` +
    `<span class="promo-strip-txt promo-strip-short">최대 <b>${off}%</b> · 한정 수량</span>` +
    `<span class="promo-strip-go">보러가기 →</span>`;
  document.body.prepend(strip);
  added.push(strip);
  html.classList.add("has-promo");

  // ② 상세 히어로 — 헤드라인 바로 위 배지
  if (opts.heroPill) {
    const lbl = document.querySelector<HTMLElement>("#buy .ph-lbl");
    if (lbl && !document.querySelector(".promo-pill")) {
      const pill = document.createElement("div");
      pill.className = "promo-pill";
      pill.innerHTML = `<span class="promo-pill-dot"></span><span>${PROMO.label} 진행 중 · 최대 <b>${off}%</b> 할인 · 한정 수량</span>`;
      lbl.before(pill);
      added.push(pill);
    }
  }

  // ③ 모바일 하단 구매 바 — 버튼 위 한 줄
  if (opts.floatNote) {
    const bar = document.querySelector<HTMLElement>(".buy-float");
    if (bar && !bar.querySelector(".promo-float-note")) {
      const note = document.createElement("p");
      note.className = "promo-float-note";
      note.innerHTML = `${PROMO.label}가 · <b>${PROMO.publicNote}</b>`;
      bar.prepend(note);
      added.push(note);
    }
  }

  // ④ 가격 비교 섹션 머리 — 의사 영상 바로 다음, 비교표가 프로모션가로 계산된다는 연결
  if (opts.costNote) {
    const inner = document.querySelector<HTMLElement>("#cost .po-cost-in");
    const one = OPTIONS.find((o) => o.key === "1m");
    if (inner && one?.promoPrice && !inner.querySelector(".promo-cost")) {
      const box = document.createElement("div");
      box.className = "promo-cost";
      box.innerHTML =
        `<span class="promo-cost-badge"><span class="promo-pill-dot"></span>${PROMO.label} 진행 중</span>` +
        `<p class="promo-cost-txt">지금 1박스 <b>${one.promoPrice.toLocaleString("ko-KR")}원</b> · 최대 <b>${off}%</b> 할인 · ${PROMO.publicNote}</p>` +
        `<a class="promo-cost-go" href="#buy">프로모션가로 구매하기 →</a>`;
      inner.prepend(box);
      added.push(box);
    }
  }

  return () => {
    added.forEach((el) => el.remove());
    html.classList.remove("has-promo");
  };
}
