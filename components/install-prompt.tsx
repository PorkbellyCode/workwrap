"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// 크롬이 설치 조건을 만족했을 때만 던지는 이벤트. TS 표준 lib에는 없다.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "workwrap:install-dismissed";

// 브라우저 환경을 한 번 읽는 것이지 시간에 따라 변하는 상태가 아니라서 구독은 비워 둔다.
// useEffect + setState로 읽으면 렌더가 한 번 더 도는 데다 린트(react-hooks/set-state-in-effect)에
// 걸린다. 서버 스냅샷을 false로 두면 SSR에서는 배너가 없고 hydration 직후에 판정된다.
const neverChanges = () => () => {};

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS가 홈 화면 실행 여부를 이 값으로만 알려주던 시절의 잔재. 아직 남아 있다.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function readEligible() {
  return !isStandalone() && !localStorage.getItem(DISMISSED_KEY);
}

function readIsIos() {
  // iPadOS는 UA를 맥으로 보내므로 터치 지원 여부로 갈라야 한다.
  const ua = navigator.userAgent;
  return (
    /iphone|ipod|ipad/i.test(ua) ||
    (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)
  );
}

export function InstallPrompt() {
  const eligible = useSyncExternalStore(neverChanges, readEligible, () => false);
  const isIos = useSyncExternalStore(neverChanges, readIsIos, () => false);
  const [dismissed, setDismissed] = useState(false);
  // 안드로이드는 이 이벤트가 와야 설치를 걸 수 있고, iOS는 영영 오지 않는다.
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (!eligible) return;

    const onBeforeInstall = (event: Event) => {
      // 크롬 자체 설치 배너를 막고 이 배너로 대신한다.
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferred(null);

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [eligible]);

  if (!eligible || dismissed) return null;
  if (!deferred && !isIos) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
      {deferred ? (
        <>
          <span className="flex-1">홈 화면에 추가하면 앱처럼 쓸 수 있어요.</span>
          <Button
            size="xs"
            variant="outline"
            onClick={async () => {
              await deferred.prompt();
              // 거절해도 같은 이벤트를 다시 쓸 수 없다. 배너는 접고,
              // 다음 방문에 크롬이 이벤트를 또 주면 그때 다시 뜬다.
              setDeferred(null);
            }}
          >
            설치
          </Button>
        </>
      ) : (
        <span className="flex-1">
          공유 <Share className="inline size-3 align-[-0.1em]" /> → &ldquo;홈
          화면에 추가&rdquo;로 앱처럼 쓸 수 있어요.
        </span>
      )}
      <Button
        size="icon-xs"
        variant="ghost"
        aria-label="닫기"
        onClick={() => {
          localStorage.setItem(DISMISSED_KEY, "1");
          setDismissed(true);
        }}
      >
        <X />
      </Button>
    </div>
  );
}
