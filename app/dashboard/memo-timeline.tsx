"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { streamSummary } from "@/lib/summary-stream";
import { shiftDate } from "@/lib/date";
import { useSwipeDrag } from "@/lib/use-swipe";
import RecordButton from "./record-button";
import NavOverlay from "@/components/nav-overlay";
import DatePicker from "./date-picker";
import SummarySheet from "./summary-sheet";
import type { Memo } from "./types";

function timeOf(createdAt: string) {
  return new Date(createdAt).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function fetchMemos(date: string, categoryId: string): Promise<Memo[]> {
  const res = await fetch(`/api/memos?date=${date}&category=${categoryId}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.memos as Memo[];
}

// 드래그 중 옆 날짜를 미리 보여주는 읽기 전용 목록. 체크박스·수정·삭제는 없다 —
// 아직 보고 있지 않은(확정되지 않은) 날의 메모를 건드릴 수 있게 하면 혼란스럽다.
function MemoPreviewList({ memos }: { memos: Memo[] | null }) {
  return (
    <div className="flex h-full flex-col gap-2 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {memos === null && (
        <p className="text-sm text-muted-foreground">불러오는 중…</p>
      )}
      {memos?.length === 0 && (
        <p className="text-sm text-muted-foreground">아직 메모가 없어요.</p>
      )}
      {memos?.map((memo) => (
        <div
          key={memo.id}
          className="flex items-center gap-2 rounded-md border px-3 py-2"
        >
          <span className="flex-1 text-sm whitespace-pre-wrap">
            {memo.text}
          </span>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {timeOf(memo.createdAt)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function MemoTimeline({
  date,
  categoryId,
  initialMemos,
  hasContext,
}: {
  date: string;
  // 항상 하나의 카테고리를 보고 있다('전체' 탭 없음).
  // 새 메모도 이 카테고리로 들어가므로 입력 영역에 별도 선택기가 필요 없다.
  categoryId: string;
  initialMemos: Memo[];
  // 사용자 전역 또는 이 카테고리에 컨텍스트가 하나라도 적혀 있는지.
  hasContext: boolean;
}) {
  const router = useRouter();
  const [navigating, startNavigation] = useTransition();
  const [memos, setMemos] = useState<Memo[]>(initialMemos);
  // 요약에 포함할 메모를 고르는 상태. 새 메모는 기본으로 포함된다.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(initialMemos.map((memo) => memo.id))
  );
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [error, setError] = useState("");

  // 요약 시트 상태. 결과와 에러는 시트를 닫았다 열어도 유지된다.
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryStreaming, setSummaryStreaming] = useState(false);
  const [summaryStreamText, setSummaryStreamText] = useState("");
  const [summaryResult, setSummaryResult] = useState("");
  const [summaryError, setSummaryError] = useState("");

  function toggleMemo(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  async function runSummary(memoIds: string[]) {
    setSummaryStreaming(true);
    setSummaryStreamText("");
    setSummaryError("");

    const outcome = await streamSummary(
      { dateRange: { from: date, to: date }, categoryId, memoIds },
      setSummaryStreamText
    );

    setSummaryStreaming(false);
    if (outcome.ok) {
      setSummaryResult(outcome.content);
    } else {
      setSummaryError(outcome.message);
    }
  }

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
    setSelectedIds((prev) => new Set(prev).add(memo.id));
    // 카테고리별 메모 건수(관리 팝업의 삭제 경고)를 최신으로 유지한다.
    router.refresh();
  }

  async function deleteMemo(id: string) {
    const res = await fetch(`/api/memos/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMemos((prev) => prev.filter((memo) => memo.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
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

  // router.push는 프로미스를 돌려주지 않아서, 전환이 끝나는 시점을 알려면
  // useTransition으로 감싸는 수밖에 없다.
  function goToDate(next: string) {
    startNavigation(() => {
      router.push(`/dashboard?date=${next}&category=${categoryId}`);
    });
  }

  // 드래그로 옆 날짜를 바로 따라오게 보여주려면, 넘어가기 전에 그 날의 데이터를
  // 미리 들고 있어야 한다. 마운트 시 한 번만 가져온다 — date·categoryId가 바뀌면
  // 부모가 key로 이 컴포넌트를 통째로 다시 마운트시키므로 다시 가져올 일이 없다.
  const [prevMemos, setPrevMemos] = useState<Memo[] | null>(null);
  const [nextMemos, setNextMemos] = useState<Memo[] | null>(null);

  useEffect(() => {
    let active = true;
    fetchMemos(shiftDate(date, -1), categoryId).then((data) => {
      if (active) setPrevMemos(data);
    });
    fetchMemos(shiftDate(date, 1), categoryId).then((data) => {
      if (active) setNextMemos(data);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { containerRef, offset, dragging, handlers } = useSwipeDrag(
    (direction) => {
      goToDate(shiftDate(date, direction === "left" ? 1 : -1));
    }
  );

  return (
    // 남는 높이를 전부 차지하고, 그 안에서 카드가 늘어난다.
    // 메모가 몇 개든 입력창 위치가 움직이지 않게 하기 위한 구조다.
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {navigating && <NavOverlay />}
      <Card className="min-h-0 flex-1">
        <CardHeader className="shrink-0">
          <DatePicker date={date} onSelect={goToDate} />
          <CardAction>
            {/* 시트를 열기만 한다. 요약 생성은 시트 안의 "요약하기" 버튼으로만 시작된다 —
                요약은 API 호출이고 quota를 소모하므로 명시적인 의도로만 발생해야 한다. */}
            <Button
              variant="secondary"
              size="sm"
              disabled={selectedIds.size === 0}
              onClick={() => setSummaryOpen(true)}
            >
              <Sparkles className="size-4" />
              {selectedIds.size === memos.length
                ? "요약"
                : `요약 (${selectedIds.size})`}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent
          ref={containerRef}
          className="min-h-0 flex-1 overflow-hidden"
          {...handlers}
        >
          {/* 이전·오늘·다음 세 날짜를 나란히 두고 손가락 이동량만큼 통째로 옮긴다.
              기본 위치(offset 0)는 가운데(오늘) 패널이 꽉 채워 보이는 지점이다. */}
          <div
            className="flex h-full"
            style={{
              width: "300%",
              transform: `translateX(calc(-100% / 3 + ${offset}px))`,
              transition: dragging ? "none" : "transform 200ms ease-out",
            }}
          >
            <div
              style={{ width: `${100 / 3}%` }}
              className="h-full shrink-0 pr-2"
            >
              <MemoPreviewList memos={prevMemos} />
            </div>

            <div
              style={{ width: `${100 / 3}%` }}
              className="h-full shrink-0 px-2"
            >
              {/* 메모가 쌓여도 이 영역의 크기는 그대로고 안에서만 스크롤된다.
                  스크롤바는 숨긴다 — 카드의 둥근 모서리에 걸려 잘려 보이는 게 더 거슬린다. */}
              <div className="flex h-full flex-col gap-2 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {memos.length === 0 && (
                  <p className="text-sm text-muted-foreground">아직 메모가 없어요.</p>
                )}

                {memos.map((memo) => (
                  <div
                    key={memo.id}
                    className="flex items-center gap-2 rounded-md border px-3 py-2"
                  >
                    {/* 편집 중에도 선택 상태는 그대로 보인다 — 요약 포함 여부는
                        내용 수정과 독립적인 판단이므로 자리를 바꾸지 않는다. */}
                    <Checkbox
                      checked={selectedIds.has(memo.id)}
                      onCheckedChange={(checked) => toggleMemo(memo.id, checked)}
                      aria-label="요약에 포함"
                    />
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
                        <span className="flex-1 text-sm whitespace-pre-wrap">
                          {memo.text}
                        </span>
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          {timeOf(memo.createdAt)}
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
            </div>

            <div
              style={{ width: `${100 / 3}%` }}
              className="h-full shrink-0 pl-2"
            >
              <MemoPreviewList memos={nextMemos} />
            </div>
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

      <SummarySheet
        open={summaryOpen}
        onOpenChange={setSummaryOpen}
        date={date}
        categoryId={categoryId}
        hasContext={hasContext}
        memos={memos}
        selectedIds={selectedIds}
        onToggleMemo={toggleMemo}
        streaming={summaryStreaming}
        streamText={summaryStreamText}
        result={summaryResult}
        error={summaryError}
        onGenerate={() => void runSummary([...selectedIds])}
      />
    </div>
  );
}
