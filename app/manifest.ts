import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Workwrap",
    short_name: "Workwrap",
    description: "작업 중 남긴 음성 메모를 모아 하루를 요약해주는 서비스",
    lang: "ko",
    start_url: "/",
    display: "standalone",
    // 설치 직후 스플래시 화면 색. 아이콘 배경과 같은 값이라 아이콘이 배경에 얹혀 보인다.
    background_color: "#171717",
    theme_color: "#171717",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // 안드로이드는 아이콘을 원형/스퀘어클로 잘라내므로 여백을 더 준 별도 파일이 필요하다.
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
