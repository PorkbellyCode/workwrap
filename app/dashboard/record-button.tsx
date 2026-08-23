"use client";

import { useRef, useState } from "react";
import { Loader2, Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

type Status = "idle" | "recording" | "transcribing";

// 브라우저마다 지원하는 컨테이너가 다르다. Chrome/Firefox는 webm, Safari는 mp4만 된다.
// OpenAI 전사 API는 확장자로 포맷을 판별하므로 mimeType과 확장자를 짝지어 둔다.
const CANDIDATES = [
  { mimeType: "audio/webm", extension: "webm" },
  { mimeType: "audio/mp4", extension: "m4a" },
];

function pickMimeType() {
  return CANDIDATES.find((candidate) =>
    MediaRecorder.isTypeSupported(candidate.mimeType)
  );
}

export default function RecordButton({
  onTranscript,
  onError,
}: {
  // 전사가 진행되는 동안 누적 텍스트로 반복 호출된다.
  onTranscript: (text: string) => void;
  onError: (message: string) => void;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);

  async function startRecording() {
    const picked = pickMimeType();
    if (!picked) {
      onError("이 브라우저는 녹음을 지원하지 않아요.");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      onError("마이크 권한이 필요해요.");
      return;
    }

    const recorder = new MediaRecorder(stream, { mimeType: picked.mimeType });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = async () => {
      // 마이크를 놓아줘야 브라우저의 녹음 표시가 사라진다.
      stream.getTracks().forEach((track) => track.stop());

      // timeslice 없이 한 번에 받았으므로 이 blob은 그 자체로 완결된 오디오 파일이다.
      const blob = new Blob(chunks, { type: picked.mimeType });
      await transcribe(blob, picked.extension);
    };

    recorderRef.current = recorder;
    recorder.start();
    setStatus("recording");
  }

  async function transcribe(blob: Blob, extension: string) {
    setStatus("transcribing");

    const form = new FormData();
    form.append("audio", new File([blob], `memo.${extension}`, { type: blob.type }));

    const res = await fetch("/api/transcribe", { method: "POST", body: form });

    // 스트림이 열리기 전 실패(401/400/413 등)는 일반 JSON 에러로 온다.
    if (!res.ok || !res.body) {
      const data = await res.json().catch(() => null);
      onError(data?.error?.message ?? "전사에 실패했어요.");
      setStatus("idle");
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
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        if (!part.startsWith("data: ")) continue;
        const event = JSON.parse(part.slice(6));

        if (event.type === "delta") {
          text += event.text;
          onTranscript(text);
        } else if (event.type === "done") {
          onTranscript(event.text);
        } else if (event.type === "error") {
          onError(event.message);
        }
      }
    }

    setStatus("idle");
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
  }

  if (status === "transcribing") {
    return (
      <Button type="button" variant="outline" size="icon" disabled>
        <Loader2 className="animate-spin" />
      </Button>
    );
  }

  const recording = status === "recording";

  return (
    <Button
      type="button"
      variant={recording ? "secondary" : "outline"}
      size="icon"
      aria-label={recording ? "녹음 멈추기" : "음성으로 메모하기"}
      onClick={recording ? stopRecording : startRecording}
    >
      {recording ? (
        <Square className="size-4 fill-current" />
      ) : (
        <Mic className="size-4" />
      )}
    </Button>
  );
}
