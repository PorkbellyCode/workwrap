"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { streamSummary } from "@/lib/summary-stream";
import NavOverlay from "@/components/nav-overlay";
import DatePicker from "../dashboard/date-picker";

type Summary = {
  id: string;
  version: number;
  content: string;
  memoIds: string[];
  createdAt: string;
};

export default function SummaryPanel({
  date,
  categoryId,
  initialSummaries,
  waitForContextSave,
}: {
  date: string;
  categoryId: string;
  initialSummaries: Summary[];
  // 컨텍스트 저장이 끝나기 전에 요약을 시작하면 옛 컨텍스트로 요약된다.
  waitForContextSave: () => Promise<void>;
}) {
  const router = useRouter();
  const [navigating, startNavigation] = useTransition();
  const [versions, setVersions] = useState<Summary[]>(initialSummaries);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSummaries.at(-1)?.id ?? null
  );
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState("");
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [removing, setRemoving] = useState(false);

  // 대시보드와 같은 방식으로 URL에 날짜를 남긴다. 서버가 그 날짜의 버전 목록을
  // 다시 내려주고, page.tsx의 key가 이 패널을 다시 마운트한다.
  function goToDate(next: string) {
    startNavigation(() => {
      router.push(`/summary?date=${next}&category=${categoryId}`);
    });
  }

  // 이 화면은 버전 히스토리다. 기간의 메모 전체로 다시 요약한다 —
  // 메모를 골라 요약하는 일은 대시보드의 바텀시트가 맡는다.
  async function generate() {
    setStreaming(true);
    setStreamText("");
    setError("");
    // 확인창을 열어둔 채 요약을 돌리면 끝난 뒤 엉뚱한 버전에 확인창이 붙는다.
    setConfirmingRemove(false);

    // 방금 고친 컨텍스트가 저장되기 전에 요약이 출발하면 옛 값으로 요약된다.
    // 버튼을 누른 직후라 스피너가 이미 돌고 있어 기다림이 드러나지 않는다.
    await waitForContextSave();

    const outcome = await streamSummary(
      { dateRange: { from: date, to: date }, categoryId },
      setStreamText
    );

    if (!outcome.ok) {
      setError(outcome.message);
      setStreaming(false);
      return;
    }

    setVersions((prev) => [
      ...prev,
      {
        id: outcome.id,
        version: outcome.version,
        content: outcome.content,
        memoIds: outcome.memoIds,
        createdAt: outcome.createdAt,
      },
    ]);
    setSelectedId(outcome.id);
    setStreaming(false);
  }

  const selected = versions.find((v) => v.id === selectedId);
  // 스트리밍 중에는 실시간 텍스트를, 끝난 뒤에는 선택된 버전을 보여준다.
  const shown = streaming ? streamText : selected?.content;

  // 삭제는 소프트 삭제라 quota는 그대로 소모된 채 남는다. 지운 만큼 다시 만들 수 있는 게 아니다.
  async function remove() {
    if (!selected) return;

    setRemoving(true);
    const res = await fetch(`/api/summaries/${selected.id}`, {
      method: "DELETE",
    });
    setRemoving(false);
    setConfirmingRemove(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error?.message ?? "요약을 삭제하지 못했어요.");
      return;
    }

    setError("");
    const rest = versions.filter((v) => v.id !== selected.id);
    setVersions(rest);
    // 보고 있던 버전이 사라졌으니 남은 것 중 가장 최근으로 옮긴다. 다 지웠으면 빈 상태로 돌아간다.
    setSelectedId(rest.at(-1)?.id ?? null);
  }

  return (
    <Card>
      {navigating && <NavOverlay />}
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <DatePicker date={date} onSelect={goToDate} />
            {versions.length > 0 && (
              <CardDescription>
                {versions.length}개 버전 생성됨
              </CardDescription>
            )}
          </div>
          <Button
            size="sm"
            variant="brand"
            onClick={() => generate()}
            disabled={streaming}
          >
            {streaming ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {versions.length > 0 ? "다시 요약" : "요약하기"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* 버전이 하나뿐이어도 이 줄을 띄운다 — 삭제 버튼이 여기 붙기 때문이다.
            칩마다 ×를 달지는 않는다. 모바일엔 hover가 없어 ×가 항상 떠 있게 되고
            칩의 터치 타겟이 좁아진다(카테고리 탭에서 같은 이유로 폐기한 안).
            지울 수 있는 건 언제나 "지금 보고 있는 버전" 하나다. */}
        {versions.length > 0 && !streaming && (
          <div className="flex flex-wrap items-center gap-1.5">
            {versions.map((v) => (
              <Button
                key={v.id}
                size="sm"
                variant={v.id === selectedId ? "secondary" : "ghost"}
                onClick={() => setSelectedId(v.id)}
              >
                v{v.version}
              </Button>
            ))}

            {selected &&
              (confirmingRemove ? (
                // 확인은 별도 모달 없이 이 줄에서 끝낸다(카테고리 관리 팝업과 같은 방식).
                <span className="ml-auto flex items-center gap-1.5">
                  <span className="text-sm text-muted-foreground">
                    v{selected.version} 삭제
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={removing}
                    onClick={() => setConfirmingRemove(false)}
                  >
                    취소
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={removing}
                    onClick={() => remove()}
                  >
                    {removing && <Loader2 className="animate-spin" />}
                    삭제
                  </Button>
                </span>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto"
                  aria-label={`v${selected.version} 삭제`}
                  onClick={() => setConfirmingRemove(true)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              ))}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* 버전 번호만으로는 무엇으로 만든 요약인지 알 수 없다 — 시트는 체크한
            메모만, 이 화면의 "다시 요약"은 그 날 전체를 쓰기 때문이다. */}
        {selected && !streaming && (
          <p className="text-xs text-muted-foreground">
            메모 {selected.memoIds.length}건 기준
          </p>
        )}

        {shown ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{shown}</p>
        ) : (
          !streaming &&
          !error && (
            <p className="text-sm text-muted-foreground">
              이 날 쌓인 메모를 모아 요약을 만들어드려요.
            </p>
          )
        )}

        {streaming && !streamText && (
          <p className="text-sm text-muted-foreground">요약을 만드는 중…</p>
        )}
      </CardContent>
    </Card>
  );
}
