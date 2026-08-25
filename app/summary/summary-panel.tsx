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

type Summary = {
  id: string;
  version: number;
  content: string;
  createdAt: string;
};

type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "done"; id: string; version: number; createdAt: string }
  | { type: "error"; code: string; message: string };

export default function SummaryPanel({
  date,
  initialSummaries,
}: {
  date: string;
  initialSummaries: Summary[];
}) {
  const [versions, setVersions] = useState<Summary[]>(initialSummaries);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSummaries.at(-1)?.id ?? null
  );
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState("");

  async function generate() {
    setStreaming(true);
    setStreamText("");
    setError("");

    const res = await fetch("/api/summaries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dateRange: { from: date, to: date } }),
    });

    // 스트림이 열리기 전에 실패한 경우(401/422/429 등)는 일반 JSON 에러로 온다.
    if (!res.ok || !res.body) {
      const data = await res.json().catch(() => null);
      setError(data?.error?.message ?? "요약 생성에 실패했습니다.");
      setStreaming(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      // SSE는 빈 줄 두 개로 이벤트를 구분한다. 마지막 조각은 아직 미완성일 수 있어 남겨둔다.
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        if (!part.startsWith("data: ")) continue;
        const event: StreamEvent = JSON.parse(part.slice(6));

        if (event.type === "delta") {
          text += event.text;
          setStreamText(text);
        } else if (event.type === "done") {
          const saved: Summary = {
            id: event.id,
            version: event.version,
            content: text,
            createdAt: event.createdAt,
          };
          setVersions((prev) => [...prev, saved]);
          setSelectedId(saved.id);
          setStreamText("");
        } else if (event.type === "error") {
          setError(event.message);
        }
      }
    }

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
          <Button size="sm" onClick={generate} disabled={streaming}>
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
