"use client";

import Spinner from "./spinner";

// 화면 전환을 기다리는 동안 기존 화면 위에 얹는 레이어.
//
// loading.tsx를 쓰면 Next가 라우트 내용을 통째로 fallback으로 갈아끼워서 네비까지 사라졌다가
// 다시 그려진다 — 새로고침처럼 보인다. 기존 화면을 그대로 두려면 전환 상태를 클라이언트에서
// 들고 있다가 이렇게 위에 덮는 수밖에 없다.
//
// fixed라 트리 어디에서 렌더하든 화면 가운데에 뜬다. 그래서 전환을 일으키는 쪽마다
// 각자 이 컴포넌트를 렌더하면 되고, 공유 상태나 컨텍스트가 필요 없다.
export default function NavOverlay() {
  return (
    <div
      // 클릭을 막아 전환 중에 다른 곳을 또 누르는 걸 방지한다.
      className="delayed-appear fixed inset-0 z-50 grid place-items-center bg-background/60"
    >
      <Spinner className="size-10 text-brand" label="불러오는 중" />
    </div>
  );
}
