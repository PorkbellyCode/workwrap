"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { streamSummary } from "@/lib/summary-stream";

type Summary = {
  id: string;
  version: number;
  content: string;
  createdAt: string;
};

export default function SummaryPanel({
  date,
  categoryId,
  initialSummaries,
}: {
  date: string;
  categoryId: string;
  initialSummaries: Summary[];
}) {
  const [versions, setVersions] = useState<Summary[]>(initialSummaries);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSummaries.at(-1)?.id ?? null
  );
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState("");

  // 이 화면은 버전 히스토리다. 기간의 메모 전체로 다시 요약한다 —
  // 메모를 골라 요약하는 일은 대시보드의 바텀시트가 맡는다.
  async function generate() {
    setStreaming(true);
    setStreamText("");
    setError("");

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
        createdAt: outcome.createdAt,
      },
    ]);
    setSelectedId(outcome.id);
    setStreaming(false);
  }

  const selected = versions.find((v) => v.id === selectedId);
  // 스트리밍 중에는 실시간 텍스트를, 끝난 뒤에는 선택된 버전을 보여준다.
  const shown = streaming ? streamText : selected?.content;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {date} 요약
            </CardTitle>
            {versions.length > 0 && (
              <CardDescription>
                {versions.length}개 버전 생성됨
              </CardDescription>
            )}
          </div>
          <Button
            size="sm"
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
        {versions.length > 1 && !streaming && (
          <div className="flex flex-wrap gap-1.5">
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
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

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
