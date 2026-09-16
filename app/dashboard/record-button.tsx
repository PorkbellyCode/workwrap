"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "idle" | "recording" | "transcribing";

// 브라우저마다 지원하는 컨테이너가 다르다. Chrome/Firefox는 webm, Safari는 mp4만 된다.
// OpenAI 전사 API는 확장자로 포맷을 판별하므로 mimeType과 확장자를 짝지어 둔다.
const CANDIDATES = [
  { mimeType: "audio/webm", extension: "webm" },
  { mimeType: "audio/mp4", extension: "m4a" },
];

// 녹음 중 파형 막대 수. 가장 오른쪽이 지금 소리다.
const BAR_COUNT = 20;
// 파형을 한 칸 밀어내는 간격. 매 프레임 밀면 너무 빨라 읽히지 않는다.
const BAR_INTERVAL_MS = 80;

function formatElapsed(ms: number) {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function pickMimeType() {
  return CANDIDATES.find((candidate) =>
    MediaRecorder.isTypeSupported(candidate.mimeType)
  );
}

// 녹음 버튼 한 줄: [경과 시간] (버튼) [파형].
// 녹음 순간이 이 서비스의 핵심 동작이라 화면에서 유일하게 움직이는 곳으로 둔다.
// 양옆 칸은 대기 중에도 자리를 차지해 버튼이 가운데에서 움직이지 않는다.
export default function RecordButton({
  onTranscript,
  onError,
}: {
  // 전사가 진행되는 동안 누적 텍스트로 반복 호출된다.
  onTranscript: (text: string) => void;
  onError: (message: string) => void;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  // 파형은 초당 십여 번 바뀌므로 state 대신 막대 DOM을 직접 고친다.
  const barsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const stopMeterRef = useRef<(() => void) | null>(null);

  // 녹음 도중 화면을 떠나도 마이크 분석을 정리한다.
  useEffect(() => () => stopMeterRef.current?.(), []);

  // 마이크 음량을 파형 막대로 그린다. 녹음 자체(MediaRecorder)와는 따로 도는 관찰자라,
  // 실패해도 녹음에는 영향이 없도록 조용히 넘어간다.
  function startMeter(context: AudioContext | null, stream: MediaStream) {
    const startedAt = performance.now();
    const timer = setInterval(
      () => setElapsed(performance.now() - startedAt),
      250
    );
    let sampler: ReturnType<typeof setInterval> | undefined;

    const levels: number[] = new Array(BAR_COUNT).fill(0);
    if (context) {
      try {
        const analyser = context.createAnalyser();
        // 2048샘플 ≈ 44.1kHz에서 46ms. 막대 한 칸(80ms)의 절반 남짓을 매번 새로 잰다.
        analyser.fftSize = 2048;
        context.createMediaStreamSource(stream).connect(analyser);
        const samples = new Uint8Array(analyser.fftSize);

        // requestAnimationFrame 대신 타이머로 잰다. 파형은 칸 단위로만 바뀌어 프레임마다
        // 잴 필요가 없고, rAF는 창이 가려지면 멈춰서 녹음 중인데도 파형이 멈춰 버린다.
        sampler = setInterval(() => {
          analyser.getByteTimeDomainData(samples);
          let sum = 0;
          for (const sample of samples) {
            const centered = (sample - 128) / 128;
            sum += centered * centered;
          }
          // 말소리 RMS는 보통 0.02~0.3이라 그대로 쓰면 막대가 거의 안 선다. 제곱근으로 펴준다.
          const level = Math.min(1, Math.sqrt(Math.sqrt(sum / samples.length)) * 1.6);
          levels.shift();
          levels.push(level);
          levels.forEach((value, index) => {
            const bar = barsRef.current[index];
            // Tailwind v4의 scale-y-*는 transform이 아니라 scale 속성을 쓴다 — 같은 속성을 덮어써야
            // 클래스의 기본 높이(0.12)와 곱해지지 않는다.
            if (bar) bar.style.scale = `1 ${Math.max(0.12, value)}`;
          });
        }, BAR_INTERVAL_MS);
      } catch {
        // 파형 없이 녹음만 한다.
      }
    }

    stopMeterRef.current = () => {
      clearInterval(timer);
      clearInterval(sampler);
      void context?.close();
      barsRef.current.forEach((bar) => {
        if (bar) bar.style.scale = "";
      });
      stopMeterRef.current = null;
    };
  }

  async function startRecording() {
    const picked = pickMimeType();
    if (!picked) {
      onError("이 브라우저는 녹음을 지원하지 않아요.");
      return;
    }

    // iOS Safari는 사용자 탭과 같은 흐름에서 만든 AudioContext만 소리를 흘려준다.
    // getUserMedia를 기다린 뒤에 만들면 멈춘 상태로 생기므로 await 앞에서 만든다.
    let context: AudioContext | null = null;
    try {
      context = new AudioContext();
      void context.resume();
    } catch {
      context = null;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      void context?.close();
      onError("마이크 권한이 필요해요.");
      return;
    }

    const recorder = new MediaRecorder(stream, { mimeType: picked.mimeType });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = async () => {
      stopMeterRef.current?.();
      // 마이크를 놓아줘야 브라우저의 녹음 표시가 사라진다.
      stream.getTracks().forEach((track) => track.stop());

      // timeslice 없이 한 번에 받았으므로 이 blob은 그 자체로 완결된 오디오 파일이다.
      const blob = new Blob(chunks, { type: picked.mimeType });
      await transcribe(blob, picked.extension);
    };

    recorderRef.current = recorder;
    recorder.start();
    setElapsed(0);
    startMeter(context, stream);
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

  const recording = status === "recording";
  const transcribing = status === "transcribing";

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
      {/* 경과 시간 / 전사 중 안내. 버튼 쪽으로 붙여 읽힌다. */}
      <p
        aria-live="polite"
        className="justify-self-end text-[15px] tabular-nums text-muted-foreground"
      >
        {recording && (
          <span className="text-foreground">{formatElapsed(elapsed)}</span>
        )}
        {transcribing && "받아 적는 중"}
      </p>

      {/* 바깥 고리는 그대로 두고 안쪽 모양만 바뀐다 — 동그라미(대기)가 둥근 사각형(정지)으로
          줄어드는 건 iOS 음성 메모·카메라와 같은 문법이라 설명 없이 읽힌다. */}
      <button
        type="button"
        disabled={transcribing}
        aria-label={recording ? "녹음 멈추기" : "음성으로 메모하기"}
        onClick={recording ? stopRecording : startRecording}
        className="group grid size-16 place-items-center rounded-full ring-[3px] ring-foreground/15 ring-inset outline-none focus-visible:ring-ring disabled:cursor-default"
      >
        <span
          className={cn(
            "grid place-items-center bg-brand text-brand-foreground transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-active:scale-90 motion-reduce:transition-none",
            recording ? "size-6 rounded-md" : "size-[52px] rounded-full",
            transcribing && "bg-muted text-muted-foreground"
          )}
        >
          {transcribing ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <Mic
              aria-hidden
              className={cn(
                "size-6 transition-opacity duration-150",
                recording && "opacity-0"
              )}
            />
          )}
        </span>
      </button>

      {/* 파형. 녹음 중에만 보이고, 소리가 들어오고 있다는 확인 역할만 한다. */}
      <div
        aria-hidden
        className={cn(
          "flex h-8 items-center gap-[3px] justify-self-start transition-opacity duration-200",
          recording ? "opacity-100" : "opacity-0"
        )}
      >
        {Array.from({ length: BAR_COUNT }, (_, index) => (
          <span
            key={index}
            ref={(el) => {
              barsRef.current[index] = el;
            }}
            className="h-full w-[3px] origin-center scale-y-[0.12] rounded-full bg-brand transition-transform duration-75"
          />
        ))}
      </div>
    </div>
  );
}
