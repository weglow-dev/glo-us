import type { MetadataRoute } from "next";

/**
 * 검색엔진 크롤링 규칙. 커머스 내부 경로(관리자·API·결제·계정)는 차단하고
 * 마케팅 페이지만 색인을 허용한다. 리걸 페이지는 페이지 자체의 noindex 메타가
 * 처리하므로 여기서 또 막지 않는다 (막으면 noindex 를 읽지 못한다).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api/",
          "/checkout",
          "/account",
          "/auth/",
          "/cs-login-done",
          "/login",
        ],
      },
    ],
    sitemap: "https://www.glo-us.com/sitemap.xml",
  };
}
