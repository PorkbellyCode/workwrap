"use client";

import Link from "next/link";
import { Loader2, Sparkles } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Memo } from "./types";

// 대시보드 위에서 열리는 요약 바텀시트. 포함할 메모를 고르는 체크리스트와
// 스트리밍되는 요약 결과를 한 곳에서 본다 — 화면을 옮겨 다니며 문맥을 잃지 않게.
export default function SummarySheet({
  open,
  onOpenChange,
  date,
  categoryId,
  memos,
  selectedIds,
  onToggleMemo,
  streaming,
  streamText,
  result,
  error,
  onGenerate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  categoryId: string;
  memos: Memo[];
  selectedIds: Set<string>;
  onToggleMemo: (id: string, checked: boolean) => void;
  streaming: boolean;
  streamText: string;
  result: string;
  error: string;
  onGenerate: () => void;
}) {
  // 스트리밍 중에는 실시간 텍스트를, 끝난 뒤에는 마지막 결과를 보여준다.
  const shown = streaming ? streamText : result;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* 기본 중앙 배치를 쓰되, 체크리스트와 요약이 들어가므로 폭만 넓힌다.
          내용이 길어져도 화면을 넘지 않게 상한을 둔다. */}
      <DialogContent className="max-h-[85dvh] gap-3 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{date} 요약</DialogTitle>
          <DialogDescription>
            체크한 메모만 요약에 담깁니다
            {selectedIds.size > 0 && ` · ${selectedIds.size}개 선택됨`}
          </DialogDescription>
        </DialogHeader>

        {/* 포함 메모 체크리스트. 생성 중에는 바뀌어도 반영되지 않으니 잠근다. */}
        <div className="flex max-h-40 min-h-9 flex-col gap-1.5 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {memos.length === 0 && (
            <p className="text-sm text-muted-foreground">이 날 메모가 없어요.</p>
          )}
          {memos.map((memo) => (
            <label
              key={memo.id}
              className="flex items-center gap-2 rounded-md border px-3 py-2"
            >
              <Checkbox
                checked={selectedIds.has(memo.id)}
                onCheckedChange={(checked) => onToggleMemo(memo.id, checked)}
                disabled={streaming}
                aria-label="요약에 포함"
              />
              <span className="flex-1 text-sm whitespace-pre-wrap">
                {memo.text}
              </span>
            </label>
          ))}
        </div>

        <div className="flex min-h-24 flex-1 flex-col overflow-y-auto rounded-md border bg-muted/30 p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {shown ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {shown}
            </p>
          ) : (
            !streaming &&
            !error && (
              <p className="text-sm text-muted-foreground">
                {selectedIds.size === 0
                  ? "요약에 담을 메모를 선택해주세요."
                  : "선택한 메모로 요약을 만들어드려요."}
              </p>
            )
          )}
          {streaming && !streamText && (
            <p className="text-sm text-muted-foreground">요약을 만드는 중…</p>
          )}
        </div>

        <DialogFooter className="flex-row items-center justify-between">
          <Link
            href={`/summary?date=${date}&category=${categoryId}`}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            버전 히스토리
          </Link>
          <Button
            size="sm"
            onClick={onGenerate}
            disabled={streaming || selectedIds.size === 0}
          >
            {streaming ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {result || error ? "다시 요약" : "요약하기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
