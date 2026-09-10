"use client";

import { useRef, useState } from "react";

/**
 * 공동구매 전용 링크 카드 — 셀러가 프로필·스토리에 붙여넣을 주소.
 *
 * 이전에는 회차 제목 밑에 작은 mono 한 줄로만 적어둬서 셀러들이 못 찾는다는
 * 피드백이 있었다. 라벨 + 전체 주소 + 복사 버튼을 가진 카드로 올린다.
 * 주소는 정규 호스트(www)를 쓴다 — 리다이렉트를 한 번 덜 탄다.
 */

const SITE = "https://www.glo-us.com";

type Status = "idle" | "copied" | "manual";

const BUTTON_LABEL: Record<Status, string> = {
  idle: "링크 복사",
  copied: "복사됨",
  manual: "Ctrl+C 로 복사",
};

export default function RoundLink({
  handle,
  live,
}: {
  handle: string;
  /** 시작 전이면 링크가 아직 열리지 않는다는 안내를 덧붙인다 */
  live: boolean;
}) {
  const url = `${SITE}/product/@${handle}`;
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [status, setStatus] = useState<Status>("idle");

  const flash = (next: Status, ms: number) => {
    setStatus(next);
    window.setTimeout(() => setStatus("idle"), ms);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      flash("copied", 1800);
    } catch {
      // 클립보드 권한이 막힌 브라우저(구형 인앱 브라우저 등) — 주소를 선택해
      // 두면 셀러가 바로 Ctrl+C / 길게 눌러 복사할 수 있다.
      const el = linkRef.current;
      const sel = window.getSelection();
      if (el && sel) {
        const range = document.createRange();
        range.selectNodeContents(el);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      flash("manual", 3000);
    }
  };

  return (
    <div className="mt-4 rounded-lg border border-accent/35 bg-bg-3 px-4 py-3.5">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
        공동구매 링크
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        <a
          ref={linkRef}
          href={url}
          target="_blank"
          rel="noreferrer"
          className="break-all font-mono text-[15px] font-semibold text-burg-600 underline decoration-accent/40 underline-offset-4 hover:decoration-accent"
        >
          {url}
        </a>
        <button
          type="button"
          onClick={copy}
          aria-live="polite"
          className="shrink-0 rounded-full border border-accent/45 bg-bg-1 px-3.5 py-1.5 text-xs font-semibold text-accent hover:bg-accent hover:text-cream"
        >
          {BUTTON_LABEL[status]}
        </button>
      </div>
      <p className="mt-2.5 text-xs text-ink-mute">
        {live
          ? "프로필 링크와 스토리 링크 스티커에 이 주소를 넣어주세요. 이 링크로 들어온 주문만 매출로 집계됩니다."
          : "시작 전에는 일반 상세페이지로 넘어갑니다. 시작 일시부터 열립니다."}
      </p>
    </div>
  );
}
