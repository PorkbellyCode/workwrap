import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

// 개발 중에는 서비스 워커를 끈다. 켜두면 "고쳤는데 화면이 안 바뀐다"가 상시로 발생한다.
const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSerwist(nextConfig);
