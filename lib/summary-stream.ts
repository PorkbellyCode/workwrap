// /api/summaries의 SSE 응답을 끝까지 읽어 결과를 모은다.
// 대시보드의 요약 시트와 요약 히스토리 화면이 같은 파싱을 쓰도록 한 곳에 뒀다.

export type SummaryStreamBody = {
  dateRange: { from: string; to: string };
  categoryId: string;
  memoIds?: string[];
};

type StreamEvent =
  | { type: "delta"; text: string }
  | {
      type: "done";
      id: string;
      version: number;
      memoIds: string[];
      createdAt: string;
    }
  | { type: "error"; code: string; message: string };

export type SummaryStreamResult =
  | {
      ok: true;
      id: string;
      version: number;
      memoIds: string[];
      createdAt: string;
      content: string;
    }
  | { ok: false; message: string };

// onDelta에는 지금까지 누적된 본문 전체가 들어간다 — 호출부는 그대로 state에 담아
// 실시간 타이핑처럼 보여주면 된다.
export async function streamSummary(
  body: SummaryStreamBody,
  onDelta: (accumulatedText: string) => void
): Promise<SummaryStreamResult> {
  const res = await fetch("/api/summaries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  // 스트림이 열리기 전에 실패한 경우(401/422/429 등)는 일반 JSON 에러로 온다.
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => null);
    return {
      ok: false,
      message: data?.error?.message ?? "요약 생성에 실패했습니다.",
    };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let saved: Extract<StreamEvent, { type: "done" }> | null = null;
  let failure = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    // SSE는 빈 줄 두 개로 이벤트를 구분한다. 마지막 조각은 아직 미완성일 수 있어 남겨둔다.
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      if (!part.startsWith("data: ")) continue;
      const event = JSON.parse(part.slice(6)) as StreamEvent;

      if (event.type === "delta") {
        text += event.text;
        onDelta(text);
      } else if (event.type === "done") {
        saved = event;
      } else if (event.type === "error") {
        failure = event.message;
      }
    }
  }

  if (saved) {
    return {
      ok: true,
      id: saved.id,
      version: saved.version,
      memoIds: saved.memoIds,
      createdAt: saved.createdAt,
      content: text,
    };
  }
  return { ok: false, message: failure || "요약 생성에 실패했습니다." };
}
