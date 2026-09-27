"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Loader2, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

// 가이드의 시연 애니메이션. 예시가 화면에 들어오면 재생하고, 나가면 처음 상태로 돌린다 —
// 다시 스크롤해 오면 한 번 더 볼 수 있다. 모션 줄이기를 켠 사용자에게는 완료 화면만 보여준다.

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );
}

function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.6 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, inView] as const;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// --- 말로 남기기 ---------------------------------------------------------------

type RecordPhase = "idle" | "recording" | "transcribing" | "done";

const TRANSCRIPT = "A사 발주 수량 1,200개로 변경, 납기는 다음 주 수요일";
const BAR_COUNT = 12;

export function RecordDemo() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<RecordPhase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [bars, setBars] = useState<number[]>(() => Array(BAR_COUNT).fill(0.12));

  useEffect(() => {
    if (!inView || reduced) return;
    let cancelled = false;
    const timers: ReturnType<typeof setInterval>[] = [];

    (async () => {
      await wait(500);
      if (cancelled) return;
      setPhase("recording");
      // 실제 녹음 버튼처럼 경과 시간이 흐르고 파형이 소리에 따라 움직인다.
      timers.push(setInterval(() => setElapsed((s) => s + 1), 1000));
      timers.push(
        setInterval(
          () => setBars(Array.from({ length: BAR_COUNT }, () => 0.2 + Math.random() * 0.8)),
          120
        )
      );
      await wait(2600);
      timers.forEach(clearInterval);
      if (cancelled) return;
      setPhase("transcribing");
      await wait(1100);
      if (cancelled) return;
      setPhase("done");
    })();

    return () => {
      cancelled = true;
      timers.forEach(clearInterval);
      // 화면을 벗어나면 처음으로 돌려 둔다. 보이지 않는 동안이라 되감기가 눈에 띄지 않는다.
      setPhase("idle");
      setElapsed(0);
      setBars(Array(BAR_COUNT).fill(0.12));
    };
  }, [inView, reduced]);

  const shown: RecordPhase = reduced ? "done" : phase;
  const recording = shown === "recording";
  const transcribing = shown === "transcribing";

  return (
    <div ref={ref} aria-hidden className="flex flex-col gap-4 py-2">
      {/* 입력창. 받아 적은 글은 여기로 들어오고, 추가를 눌러야 저장된다(실제 앱과 같다). */}
      <div className="relative min-h-[5.5rem] rounded-lg bg-background px-3 pt-2.5 pb-11 text-[15px] dark:bg-popover">
        <span
          className={cn(
            "transition-opacity duration-300",
            shown === "done" ? "opacity-0" : "text-muted-foreground"
          )}
        >
          {shown !== "done" && "메모를 입력하거나 마이크로 말해보세요"}
        </span>
        {shown === "done" && (
          <span className="animate-in fade-in duration-500">{TRANSCRIPT}</span>
        )}
        <span
          className={cn(
            "absolute right-2 bottom-2 flex h-7 items-center rounded-md px-2.5 text-[0.8rem] font-medium transition-colors duration-300",
            shown === "done"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          추가
        </span>
      </div>

      {/* record-button.tsx와 같은 구성: 왼쪽 경과 시간, 가운데 버튼, 오른쪽 파형. */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <p className="justify-self-end text-[15px] tabular-nums text-muted-foreground">
          {recording && (
            <span className="text-foreground">
              0:{String(elapsed).padStart(2, "0")}
            </span>
          )}
          {transcribing && "받아 적는 중"}
        </p>
        <div className="grid size-16 place-items-center rounded-full ring-[3px] ring-foreground/15 ring-inset">
          <span
            className={cn(
              "grid place-items-center bg-brand text-brand-foreground transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
              recording ? "size-6 rounded-md" : "size-[52px] rounded-full",
              transcribing && "bg-muted text-muted-foreground"
            )}
          >
            {transcribing ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Mic
                className={cn(
                  "size-6 transition-opacity duration-150",
                  recording && "opacity-0"
                )}
              />
            )}
          </span>
        </div>
        <div
          className={cn(
            "flex h-8 items-center gap-[3px] justify-self-start transition-opacity duration-200",
            recording ? "opacity-100" : "opacity-0"
          )}
        >
          {bars.map((scale, index) => (
            <span
              key={index}
              className="h-full w-[3px] rounded-full bg-brand transition-transform duration-100"
              style={{ transform: `scaleY(${scale})` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// --- 요약 스트리밍 ----------------------------------------------------------------

const SUMMARY: { heading?: boolean; text: string }[] = [
  { heading: true, text: "오늘 한 일" },
  { text: "A사 발주 수량 1,200개로 변경 (납기 다음 주 수요일)" },
  { heading: true, text: "진행 중 / 남은 일" },
  { text: "3라인 컨베이어 벨트 교체: 부품 입고 대기" },
];
const TOTAL = SUMMARY.reduce((sum, block) => sum + block.text.length, 0);

function SummaryBlocks({ count }: { count: number }) {
  let remaining = count;
  return SUMMARY.map((block, index) => {
    const visible = block.text.slice(0, Math.max(0, remaining));
    remaining -= block.text.length;
    return (
      <p
        key={index}
        className={cn(block.heading && "font-semibold", block.heading && index > 0 && "pt-1")}
      >
        {visible || " "}
      </p>
    );
  });
}

export function SummaryDemo() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const reduced = useReducedMotion();
  // null: 아직 시작 전 / "waiting": 첫 글자가 오기 전 / 숫자: 지금까지 흘러나온 글자 수
  const [progress, setProgress] = useState<number | "waiting" | null>(null);

  useEffect(() => {
    if (!inView || reduced) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    (async () => {
      await wait(400);
      if (cancelled) return;
      setProgress("waiting");
      await wait(900);
      if (cancelled) return;
      // 실제 스트림처럼 몇 글자씩 덩어리로 도착한다.
      let count = 0;
      timer = setInterval(() => {
        count = Math.min(TOTAL, count + 2 + Math.floor(Math.random() * 3));
        setProgress(count);
        if (count >= TOTAL) clearInterval(timer);
      }, 45);
    })();

    return () => {
      cancelled = true;
      clearInterval(timer);
      setProgress(null);
    };
  }, [inView, reduced]);

  const shown = reduced ? TOTAL : progress;

  return (
    // 완성본을 투명하게 깔아 높이를 미리 잡는다. 글자가 흘러나오는 동안 아래 내용이 밀리지 않는다.
    <div ref={ref} aria-hidden className="grid py-1 text-[15px] leading-relaxed">
      <div className="invisible col-start-1 row-start-1 flex flex-col gap-1.5">
        <SummaryBlocks count={TOTAL} />
      </div>
      <div className="col-start-1 row-start-1 flex flex-col gap-1.5">
        {shown === "waiting" ? (
          <p className="text-muted-foreground">요약을 만드는 중…</p>
        ) : shown === null ? (
          <p className="text-muted-foreground">요약하기를 누르면 여기에 정리돼요.</p>
        ) : (
          <SummaryBlocks count={shown} />
        )}
      </div>
    </div>
  );
}
