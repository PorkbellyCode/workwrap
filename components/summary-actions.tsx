"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// navigator.share의 유무는 한 번 정해지면 바뀌지 않는다 — 구독할 것이 없다.
const subscribe = () => () => {};

// 요약 본문을 밖으로 내보내는 두 버튼. 대시보드 시트와 /summary가 함께 쓴다.
//
// 복사하는 값은 화면에서 긁은 텍스트가 아니라 원본 마크다운 문자열이다.
// 붙여넣는 곳이 노션·슬랙이라 "##"과 "-"가 살아 있어야 값어치가 있다.
export default function SummaryActions({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  // navigator.share는 서버에 없어 SSR에서 판정할 수 없다. 서버 스냅샷을 false로
  // 두면 하이드레이션은 서버와 같은 값으로 맞춰지고, 그 뒤 클라이언트 값으로 바뀐다.
  const canShare = useSyncExternalStore(
    subscribe,
    () => !!navigator.share,
    () => false
  );
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      // 비보안 컨텍스트이거나 권한이 없으면 쓰기가 거부된다. 되돌릴 것이 없어 그대로 둔다.
      return;
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  }

  async function share() {
    try {
      await navigator.share({ text: content });
    } catch {
      // 사용자가 공유 시트를 닫으면 AbortError가 난다. 취소는 실패가 아니다.
    }
  }

  return (
    <span className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={copy}
        aria-label={copied ? "복사됨" : "요약 복사"}
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      </Button>
      {/* 공유 시트 하나로 메일·메신저·노트 앱이 전부 열린다. 지원하지 않는
          브라우저(대부분의 데스크톱)에서는 복사만 남긴다. */}
      {canShare && (
        <Button
          variant="ghost"
          size="icon"
          onClick={share}
          aria-label="요약 공유"
        >
          <Share2 className="size-4" />
        </Button>
      )}
    </span>
  );
}
