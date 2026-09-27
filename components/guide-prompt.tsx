"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

const DISMISSED_KEY = "workwrap:guide-dismissed";

// InstallPrompt와 같은 방식 — 한 번 읽고 끝나는 값이라 구독은 비워 두고,
// 서버 스냅샷을 false로 둬 SSR에서는 배너 없이 그린다.
const neverChanges = () => () => {};
const readEligible = () => !localStorage.getItem(DISMISSED_KEY);

// 처음 대시보드에 온 사람에게 한 번만 가이드를 알린다. 자동으로 /guide로 보내지 않는다 —
// 첫 화면을 가로채면 일단 눌러보고 싶은 사람을 막는다.
// "보기"를 눌러도 닫힌 것으로 기록한다. 다시 찾을 곳은 상단의 ? 아이콘이다.
export function GuidePrompt() {
  const eligible = useSyncExternalStore(neverChanges, readEligible, () => false);
  const [dismissed, setDismissed] = useState(false);

  if (!eligible || dismissed) return null;

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
      <span className="flex-1">처음이라면 사용법부터 둘러보세요.</span>
      <Link
        href="/guide"
        onClick={dismiss}
        className={buttonVariants({ size: "xs", variant: "outline" })}
      >
        보기
      </Link>
      <Button size="icon-xs" variant="ghost" aria-label="닫기" onClick={dismiss}>
        <X />
      </Button>
    </div>
  );
}
