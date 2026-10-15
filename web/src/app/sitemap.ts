import type { MetadataRoute } from "next";

/**
 * 색인 대상 = 마케팅 페이지 4개. 리걸 페이지(privacy/terms/refund)는 noindex,
 * 커머스 경로는 robots 에서 차단되므로 싣지 않는다.
 * "지엘공일" 브랜드 검색 전략의 기초 — 이 파일이 있어야 서치콘솔 등록이 쉽다.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://www.glo-us.com";
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/product`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/science`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.6 },
  ];
}
