"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, Sparkles, Trash2, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import RecordButton from "./record-button";
import DatePicker from "./date-picker";
import type { Memo } from "./types";

function timeOf(createdAt: string) {
  return new Date(createdAt).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MemoTimeline({
  date,
  categoryId,
  initialMemos,
}: {
  date: string;
  // 항상 하나의 카테고리를 보고 있다('전체' 탭 없음).
  // 새 메모도 이 카테고리로 들어가므로 입력 영역에 별도 선택기가 필요 없다.
  categoryId: string;
  initialMemos: Memo[];
}) {
  const router = useRouter();
  const [memos, setMemos] = useState<Memo[]>(initialMemos);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [error, setError] = useState("");

  // 요약은 별도 화면이다. 지금 보고 있는 날짜를 그대로 넘긴다.
  const summaryHref = `/summary?date=${date}`;

  async function addMemo(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;

    setPending(true);
    const res = await fetch("/api/memos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // 화면에서 보고 있는 날짜를 그대로 보낸다. 서버가 '오늘'을 계산하지 않으므로
      // 서버 타임존과 무관하고, 과거 날짜를 채워 넣는 것도 같은 경로다.
      body: JSON.stringify({ text, logDate: date, categoryId }),
    });
    setPending(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error?.message ?? "메모를 저장하지 못했어요.");
      return;
    }

    const memo: Memo = await res.json();
    setError("");
    setText("");
    setMemos((prev) => [...prev, memo]);
    // 카테고리별 메모 건수(관리 팝업의 삭제 경고)를 최신으로 유지한다.
    router.refresh();
  }

  async function deleteMemo(id: string) {
    const res = await fetch(`/api/memos/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMemos((prev) => prev.filter((memo) => memo.id !== id));
      router.refresh();
    }
  }

  function startEdit(memo: Memo) {
    setEditingId(memo.id);
    setEditingText(memo.text);
  }

  async function saveEdit(id: string) {
    if (!editingText.trim()) return;
    const res = await fetch(`/api/memos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: editingText }),
    });
    if (res.ok) {
      const updated: Memo = await res.json();
      setMemos((prev) =>
        prev.map((memo) => (memo.id === id ? { ...memo, ...updated } : memo))
      );
      setEditingId(null);
    }
  }

  function goToDate(next: string) {
    router.push(`/dashboard?date=${next}&category=${categoryId}`);
  }

  return (
    // 남는 높이를 전부 차지하고, 그 안에서 카드가 늘어난다.
    // 메모가 몇 개든 입력창 위치가 움직이지 않게 하기 위한 구조다.
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <Card className="min-h-0 flex-1">
        <CardHeader className="shrink-0">
          <DatePicker date={date} onSelect={goToDate} />
          <CardAction>
            <Link
              href={summaryHref}
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              <Sparkles className="size-4" />
              요약
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-hidden">
          {/* 메모가 쌓여도 이 영역의 크기는 그대로고 안에서만 스크롤된다.
              스크롤바는 숨긴다 — 카드의 둥근 모서리에 걸려 잘려 보이는 게 더 거슬린다. */}
          <div className="flex h-full flex-col gap-2 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {memos.length === 0 && (
              <p className="text-sm text-muted-foreground">아직 메모가 없어요.</p>
            )}

            {memos.map((memo) => (
              <div
                key={memo.id}
                className="flex items-start gap-2 rounded-md border px-3 py-2"
              >
                {editingId === memo.id ? (
                  <>
                    <Textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      className="min-h-9 flex-1 resize-none"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="저장"
                      onClick={() => saveEdit(memo.id)}
                    >
                      <Check className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="취소"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="size-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="pt-1.5 text-xs tabular-nums text-muted-foreground">
                      {timeOf(memo.createdAt)}
                    </span>
                    <span className="flex-1 pt-1.5 text-sm whitespace-pre-wrap">
                      {memo.text}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="수정"
                      onClick={() => startEdit(memo)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="삭제"
                      onClick={() => deleteMemo(memo.id)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <form onSubmit={addMemo} className="flex shrink-0 flex-col gap-3">
        {/* 버튼을 입력창 옆에 두면 textarea가 auto-grow할 때마다 높이가 어긋난다.
            (items-stretch로 늘리면 이번엔 버튼이 세로로 길쭉해진다)
            입력창 안 우하단에 앉히면 높이 관계 자체가 사라진다. */}
        <div className="relative">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="메모를 입력하거나 마이크로 말해보세요"
            // 모바일이 주 사용 환경이라 Enter는 줄바꿈으로 두고 전송은 버튼으로만 한다.
            // resize 핸들은 끈다 — 우하단에서 버튼과 겹치고, 어차피 내용에 맞춰 자란다.
            // max-h를 넘어가면 이 안에서 스크롤되는데, 스크롤바는 메모 목록과 같이 숨긴다.
            className="max-h-40 min-h-24 resize-none pb-12 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          />
          <Button
            type="submit"
            size="sm"
            disabled={pending}
            className="absolute right-2 bottom-2"
          >
            {pending && <Loader2 className="animate-spin" />}
            추가
          </Button>
        </div>

        <div className="flex justify-center">
          {/* 메인 기능이라 터치 타겟을 크게 잡는다(HIG 44pt / Material 48dp 이상). */}
          <RecordButton
            className="size-16 rounded-full [&_svg]:size-6"
            onTranscript={(transcript) => {
              setError("");
              setText(transcript);
            }}
            onError={setError}
          />
        </div>
      </form>
    </div>
  );
}
