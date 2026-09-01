"use client";

import { useRef, useState, type TouchEvent } from "react";

// 손가락 이동에 맞춰 카드를 실시간으로 옮기다가, 놓는 순간 넘길지 되돌아갈지 정한다.
//
// 처음 10px는 축을 정하는 데만 쓴다 — 가로가 더 크면 그 뒤로 dx를 그대로 offset에
// 반영하고, 세로가 더 크면 이 드래그를 무시해 브라우저 스크롤에 그대로 맡긴다.
//
// 넘기는 기준은 둘 중 하나다: 카드 폭의 35% 이상 이동했거나, 20px 넘게 움직인
// 상태로 빠르게(0.5px/ms 이상) 놓았을 때 — 짧게 튕기듯 넘기는 제스처도 잡아준다.
const AXIS_LOCK_PX = 10;
const COMMIT_RATIO = 0.35;
const FLICK_MIN_PX = 20;
const FLICK_VELOCITY_PX_MS = 0.5;

export function useSwipeDrag(onCommit: (direction: "left" | "right") => void) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const origin = useRef<{ x: number; y: number; t: number } | null>(null);
  const axis = useRef<"x" | "y" | null>(null);
  const last = useRef<{ x: number; t: number } | null>(null);

  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  function onTouchStart(e: TouchEvent) {
    const touch = e.touches[0];
    if (!touch) return;
    const now = Date.now();
    origin.current = { x: touch.clientX, y: touch.clientY, t: now };
    last.current = { x: touch.clientX, t: now };
    axis.current = null;
    setDragging(true);
  }

  function onTouchMove(e: TouchEvent) {
    if (!origin.current) return;
    const touch = e.touches[0];
    if (!touch) return;

    const dx = touch.clientX - origin.current.x;
    const dy = touch.clientY - origin.current.y;

    if (!axis.current) {
      if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
      axis.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (axis.current !== "x") return;

    last.current = { x: touch.clientX, t: Date.now() };
    setOffset(dx);
  }

  function onTouchEnd() {
    const start = origin.current;
    origin.current = null;
    setDragging(false);

    if (!start || axis.current !== "x") {
      axis.current = null;
      setOffset(0);
      return;
    }
    axis.current = null;

    const width = containerRef.current?.getBoundingClientRect().width ?? 0;
    const end = last.current ?? { x: start.x, t: start.t };
    const dx = end.x - start.x;
    const velocity = Math.abs(dx) / Math.max(end.t - start.t, 1);

    const shouldCommit =
      width > 0 &&
      (Math.abs(dx) > width * COMMIT_RATIO ||
        (Math.abs(dx) > FLICK_MIN_PX && velocity > FLICK_VELOCITY_PX_MS));

    if (shouldCommit) {
      const direction = dx < 0 ? "left" : "right";
      setOffset(direction === "left" ? -width : width);
      onCommit(direction);
    } else {
      setOffset(0);
    }
  }

  return {
    containerRef,
    offset,
    dragging,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}
