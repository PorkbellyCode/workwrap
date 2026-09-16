"use client";

import Link from "next/link";
import { Loader2, Sparkles } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import SummaryActions from "@/components/summary-actions";
import SummaryMarkdown from "@/components/summary-markdown";
import { dateTitle } from "./date-picker";
import type { Memo } from "./types";

// 대시보드 아래에서 올라오는 요약 시트. 포함할 메모를 고르는 체크리스트와
// 스트리밍되는 요약 결과를 한 곳에서 본다 — 화면을 옮겨 다니며 문맥을 잃지 않게.
// 아래로 끌어내리면 닫힌다.
export default function SummarySheet({
  open,
  onOpenChange,
  date,
  categoryId,
  hasContext,
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
  hasContext: boolean;
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
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{dateTitle(date)} 요약</DrawerTitle>
          <DrawerDescription>
            {selectedIds.size > 0
              ? `체크한 메모 ${selectedIds.size}개로 요약해요`
              : "요약에 담을 메모를 체크해주세요"}
          </DrawerDescription>
        </DrawerHeader>

        <DrawerBody>
          {/* 포함 메모 체크리스트. 대시보드 목록과 같은 모양(원형 체크 + 들여 쓴 구분선)이고,
              생성 중에는 바뀌어도 반영되지 않으니 잠근다. */}
          <div className="flex max-h-56 min-h-11 shrink-0 flex-col overflow-y-auto rounded-xl bg-card px-4 [scrollbar-width:none] dark:bg-popover [&::-webkit-scrollbar]:hidden">
            {memos.length === 0 && (
              <p className="py-3 text-sm text-muted-foreground">이 날 메모가 없어요.</p>
            )}
            {memos.map((memo) => (
              <label key={memo.id} className="flex items-start gap-3">
                <Checkbox
                  checked={selectedIds.has(memo.id)}
                  onCheckedChange={(checked) => onToggleMemo(memo.id, checked)}
                  disabled={streaming}
                  aria-label="요약에 포함"
                  className="mt-2.5 flex size-5 items-center justify-center rounded-full"
                />
                <span className="min-w-0 flex-1 py-2.5 text-[15px] whitespace-pre-wrap [:not(:first-child)>&]:border-t">
                  {memo.text}
                </span>
              </label>
            ))}
          </div>

          <div className="flex min-h-32 flex-col rounded-xl bg-card p-4 dark:bg-popover">
            {error && <p className="text-sm text-destructive">{error}</p>}
            {shown ? (
              <SummaryMarkdown content={shown} streaming={streaming} />
            ) : (
              !streaming &&
              !error && (
                <p className="m-auto text-sm text-muted-foreground">
                  {selectedIds.size === 0
                    ? "요약에 담을 메모를 체크해주세요."
                    : "요약하기를 누르면 여기에 정리돼요."}
                </p>
              )
            )}
            {streaming && !streamText && (
              <p className="m-auto text-sm text-muted-foreground">요약을 만드는 중…</p>
            )}
          </div>

          {/* 컨텍스트 편집은 요약 화면에 있다(#6). 주 요약 경로인 이 시트에서
              그리로 가는 통로가 없으면 기능의 존재를 알 방법이 없어서, 아직
              아무것도 안 적었을 때만 한 줄로 안내한다. 적고 나면 사라진다. */}
          {!hasContext && (
            <p className="px-1 text-xs text-muted-foreground">
              업무 배경을 적어두면 요약이 더 정확해져요.{" "}
              <Link
                href={`/summary?date=${date}&category=${categoryId}`}
                className="text-foreground underline underline-offset-4"
              >
                배경 적기
              </Link>
            </p>
          )}
        </DrawerBody>

        <DrawerFooter className="justify-between">
          <div className="flex items-center gap-1">
            <Link
              href={`/summary?date=${date}&category=${categoryId}`}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              버전 히스토리
            </Link>
            {/* 만든 직후가 복사하고 싶은 순간이라 시트에도 둔다. */}
            {result && !streaming && <SummaryActions content={result} />}
          </div>
          <Button
            variant="brand"
            className="h-10 rounded-full px-4"
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
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
