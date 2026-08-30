import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// 런타임 캐싱 전략은 일부러 넣지 않았다. 빌드 산출물 precache까지만 하고,
// 무엇을 얼마나 캐싱할지는 모바일에서 실제로 써 본 뒤에 정한다.
// (특히 /api/transcribe·요약은 SSE라 캐싱 전략을 잘못 걸면 스트림이 끊긴다.)
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
});

serwist.addEventListeners();
