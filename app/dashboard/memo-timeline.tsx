"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Loader2,
  Pencil,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
import DatePicker, { DateTitle } from "./date-picker";
import SummarySheet from "./summary-sheet";
import type { Memo } from "./types";

function timeOf(createdAt: string) {
  return new Date(createdAt).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// 이 길이를 넘거나 줄바꿈이 잦으면 4줄로 접어두고 "더보기"를 띄운다. DOM을 재서
// 실제 넘침 여부를 판정하는 대신 쓴 근사치다 — 음성 메모는 원래 짧고, 이 판정이
// 틀려도 최악의 경우 "더보기"가 불필요하게 뜨는 정도라 감수할 만하다.
const MEMO_COLLAPSE_THRESHOLD = 200;

function isLongMemo(text: string) {
  return text.length > MEMO_COLLAPSE_THRESHOLD || text.split("\n").length > 4;
}

async function fetchMemos(date: string, categoryId: string): Promise<Memo[]> {
  const res = await fetch(`/api/memos?date=${date}&category=${categoryId}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.memos as Memo[];
}

// 목록이 비었거나 불러오는 중일 때 카드 가운데에 놓는 안내.
function ListNotice({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="m-auto flex flex-col items-center gap-1 px-4 text-center">
      <p className="text-base font-semibold">{title}</p>
      {detail && <p className="text-sm text-muted-foreground">{detail}</p>}
    </div>
  );
}

const EMPTY_TITLE = "메모 없음";
const EMPTY_DETAIL = "마이크를 누르고 말하면 받아 적어요.";

// 행 사이 구분선은 본문 칸에만 긋는다. 체크박스 칸을 비워둔 iOS식 들여쓴 구분선이다.
// 첫 행에는 긋지 않는다 — 카드 머리와 목록 사이는 여백으로 충분하다.
const ROW_BODY =
  "flex min-w-0 flex-1 flex-col gap-1 py-3 [:not(:first-child)>&]:border-t";

// 드래그 중 옆 날짜를 미리 보여주는 읽기 전용 목록. 체크박스·수정·삭제는 없다 —
// 아직 보고 있지 않은(확정되지 않은) 날의 메모를 건드릴 수 있게 하면 혼란스럽다.
// 넘기는 동안 글자가 옆으로 밀려 보이지 않도록 체크박스 칸(size-5 + gap-3)만큼 비워둔다.
function MemoPreviewList({ memos }: { memos: Memo[] | null }) {
  return (
    <div className="flex h-full flex-col overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {memos === null && <ListNotice title="불러오는 중…" />}
      {memos?.length === 0 && (
        <ListNotice title={EMPTY_TITLE} detail={EMPTY_DETAIL} />
      )}
      {memos?.map((memo) => (
        <div key={memo.id} className="flex pl-8">
          <div className={ROW_BODY}>
            <span className="text-base whitespace-pre-wrap line-clamp-4">
              {memo.text}
            </span>
            <span className="text-[13px] tabular-nums text-muted-foreground">
              {timeOf(memo.createdAt)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// 드래그 중 옆에 살짝 보이는 이전·다음 날 카드. 헤더까지 포함해 카드 전체를
// 통째로 그린다 — 헤더는 고정해두고 목록만 옮기면, 옮겨지는 영역과 고정된
// 헤더 사이 경계에서 메모 박스가 잘리거나 다음 카드가 겹쳐 보이는 문제가 있었다.
// 카드 하나를 그대로 복제해 통째로 슬라이드시키면 그 경계 자체가 없어진다.
function DayCardPreview({
  date,
  memos,
}: {
  date: string;
  memos: Memo[] | null;
}) {
  return (
    <Card className="h-full min-h-0 ring-0">
      <CardHeader className="shrink-0">
        <DateTitle date={date} />
        <CardAction>
          <Button variant="secondary" size="sm" disabled>
            <Sparkles className="size-4" />
            요약
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-hidden">
        <MemoPreviewList memos={memos} />
      </CardContent>
    </Card>
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
  // 긴 메모를 펼쳐서 보고 있는 메모 id. 접힌 상태가 기본이다.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
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

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
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

  const { containerRef, panelWidth, offset, dragging, handlers } =
    useSwipeDrag((direction) => {
      goToDate(shiftDate(date, direction === "left" ? 1 : -1));
    });

  return (
    // 남는 높이를 전부 차지하고, 그 안에서 카드가 늘어난다.
    // 메모가 몇 개든 입력창 위치가 움직이지 않게 하기 위한 구조다.
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {navigating && <NavOverlay />}
      {/* 헤더까지 포함해 카드 전체가 드래그 대상이다. 목록만 옮기고 헤더는
          고정해두면 그 경계에서 메모 박스가 잘려 보이는 문제가 있었다. */}
      <div
        ref={containerRef}
        className="min-h-0 flex-1 overflow-x-hidden"
        {...handlers}
      >
        {/* 이전·오늘·다음 세 날짜의 카드를 나란히 두고 손가락 이동량만큼 통째로 옮긴다.
            기본 위치(offset 0)는 가운데(오늘) 카드가 꽉 채워 보이는 지점이다. */}
        <div
          className="flex h-full"
          style={{
            // 측정 전(마운트 첫 프레임) 잠깐은 퍼센트로 대략 맞춰두고, 측정되는
            // 즉시(useLayoutEffect라 페인트 전에 끝난다) 픽셀 값으로 넘어간다.
            width: panelWidth ? panelWidth * 3 : "300%",
            transform: panelWidth
              ? `translateX(${-panelWidth + offset}px)`
              : "translateX(calc(-100% / 3))",
            transition: dragging ? "none" : "transform 200ms ease-out",
          }}
        >
          <div
            style={{ width: panelWidth || "33.3333%" }}
            className="h-full shrink-0 pr-2"
          >
            <DayCardPreview date={shiftDate(date, -1)} memos={prevMemos} />
          </div>

          <div
            style={{ width: panelWidth || "33.3333%" }}
            className="h-full shrink-0"
          >
            {/* 테두리 없이 회색 배경 위의 흰 표면(다크는 검정 위의 #1c1c1e)으로 구분한다. */}
            <Card className="h-full min-h-0 ring-0">
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
              <CardContent className="min-h-0 flex-1 overflow-hidden">
                {/* 메모가 쌓여도 이 영역의 크기는 그대로고 안에서만 스크롤된다.
                    스크롤바는 숨긴다 — 카드의 둥근 모서리에 걸려 잘려 보이는 게 더 거슬린다. */}
                <div className="flex h-full flex-col overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {memos.length === 0 && (
                    <ListNotice title={EMPTY_TITLE} detail={EMPTY_DETAIL} />
                  )}

                  {/* 행마다 테두리 상자를 두지 않고, 카드 하나 안에 행을 쌓고 구분선으로 나눈다. */}
                  {memos.map((memo) => (
                    <div key={memo.id} className="flex items-start gap-3">
                      {/* 본문 첫 줄(py-3 + 줄높이 24px)의 가운데에 맞춘 위치.
                          Root가 flex가 아니라 체크 아이콘이 상자 위쪽에 붙는다 — 기본 size-4에서는
                          차이가 1px 남짓이라 안 보였지만 size-5로 키우니 드러났다. 여기서 가운데로 모은다. */}
                      <Checkbox
                        checked={selectedIds.has(memo.id)}
                        onCheckedChange={(checked) => toggleMemo(memo.id, checked)}
                        aria-label="요약에 포함"
                        className="mt-3.5 flex size-5 items-center justify-center rounded-full"
                      />
                      <div className={ROW_BODY}>
                        {editingId === memo.id ? (
                          <Textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="min-h-9 resize-none"
                          />
                        ) : (
                          <div className="relative">
                            {/* 접힌 상태: 마지막 줄에 자리를 pr-10으로 미리 비워두고
                                "더보기"를 그 자리에 겹쳐 앉힌다 — 줄바꿈해서 아래 줄에
                                따로 두는 것보다 텍스트가 잘리는 지점 바로 옆에 있는 게
                                자연스럽다는 판단. 배경은 bg-card로 덮어 밑에 깔린 글자가
                                버튼 뒤로 비치지 않게 한다. */}
                            <span
                              className={cn(
                                "text-base whitespace-pre-wrap",
                                isLongMemo(memo.text) &&
                                  !expandedIds.has(memo.id) &&
                                  "line-clamp-4 pr-10"
                              )}
                            >
                              {memo.text}
                            </span>
                            {isLongMemo(memo.text) && (
                              <button
                                type="button"
                                onClick={() => toggleExpanded(memo.id)}
                                className={cn(
                                  "text-sm text-muted-foreground hover:text-foreground",
                                  expandedIds.has(memo.id)
                                    ? "mt-1 block"
                                    : "absolute right-0 bottom-0 bg-card pl-1"
                                )}
                              >
                                {expandedIds.has(memo.id) ? "접기" : "더보기"}
                              </button>
                            )}
                          </div>
                        )}

                        {/* 시각은 본문 아래 보조 텍스트, 동작은 같은 줄 오른쪽 끝.
                            음수 마진으로 아이콘 버튼의 여백만큼 줄 높이와 오른쪽 끝을 맞춘다. */}
                        <div className="-my-1 -mr-1.5 flex items-center gap-0.5">
                          {editingId === memo.id ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="저장"
                                className="ml-auto"
                                onClick={() => saveEdit(memo.id)}
                              >
                                <Check className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="취소"
                                onClick={() => setEditingId(null)}
                              >
                                <X className="size-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <span className="mr-auto text-[13px] tabular-nums text-muted-foreground">
                                {timeOf(memo.createdAt)}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="수정"
                                className="text-muted-foreground"
                                onClick={() => startEdit(memo)}
                              >
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="삭제"
                                className="text-muted-foreground"
                                onClick={() => deleteMemo(memo.id)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div
            style={{ width: panelWidth || "33.3333%" }}
            className="h-full shrink-0 pl-2"
          >
            <DayCardPreview date={shiftDate(date, 1)} memos={nextMemos} />
          </div>
        </div>
      </div>

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
            className="max-h-40 min-h-24 resize-none border-transparent bg-card pb-12 [scrollbar-width:none] dark:bg-card [&::-webkit-scrollbar]:hidden"
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

        {/* 메인 기능이라 터치 타겟을 크게 잡는다(64px, HIG 44pt 이상). */}
        <RecordButton
          onTranscript={(transcript) => {
            setError("");
            setText(transcript);
          }}
          onError={setError}
        />
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
