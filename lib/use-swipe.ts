import { useRef, type TouchEvent } from "react";

// 가로 이동이 이만큼 넘어야 스와이프로 본다.
const SWIPE_THRESHOLD_PX = 60;
// 세로 스크롤과 헷갈리지 않으려면 가로 이동이 세로 이동보다 확실히 커야 한다.
const AXIS_DOMINANCE = 1.5;

// touchmove에서는 아무것도 하지 않는다 — touchend에서 전체 이동량으로만 판단하므로
// preventDefault가 필요 없고, 세로 스크롤도 그대로 통과한다.
export function useSwipe(onSwipe: (direction: "left" | "right") => void) {
  const start = useRef<{ x: number; y: number } | null>(null);

  function onTouchStart(e: TouchEvent) {
    const touch = e.touches[0];
    if (!touch) return;
    start.current = { x: touch.clientX, y: touch.clientY };
  }

  function onTouchEnd(e: TouchEvent) {
    if (!start.current) return;
    const origin = start.current;
    start.current = null;

    const touch = e.changedTouches[0];
    if (!touch) return;

    const dx = touch.clientX - origin.x;
    const dy = touch.clientY - origin.y;

    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
    if (Math.abs(dx) < Math.abs(dy) * AXIS_DOMINANCE) return;

    onSwipe(dx < 0 ? "left" : "right");
  }

  return { onTouchStart, onTouchEnd };
}
