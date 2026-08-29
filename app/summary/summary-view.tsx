"use client";

import { useRef } from "react";
import SummaryPanel from "./summary-panel";
import ContextEditor from "./context-editor";

type Summary = {
  id: string;
  version: number;
  content: string;
  memoIds: string[];
  createdAt: string;
};

// 두 카드를 묶는 이유는 순서 하나 때문이다.
//
// 컨텍스트 저장(PATCH)과 요약 생성(POST)이 동시에 출발하면 요약이 옛 컨텍스트를 읽는다.
// "고치고 바로 다시 요약"이 이 화면의 기본 흐름이라 실제로 겹친다 — 텍스트 영역에서
// 요약 버튼으로 마우스를 옮기는 순간 blur 저장이 시작되고, 클릭은 그 직후에 온다.
//
// 저장 중에 버튼을 비활성화하는 방법도 있지만, 그러면 그 클릭이 아무 반응 없이
// 사라져 사용자가 한 번 더 눌러야 한다. 기다리게 하는 편이 낫다.
export default function SummaryView({
  date,
  categoryId,
  categoryName,
  initialSummaries,
  userContext,
  categoryContext,
}: {
  date: string;
  categoryId: string;
  categoryName: string;
  initialSummaries: Summary[];
  userContext: string;
  categoryContext: string;
}) {
  const saves = useRef(new Set<Promise<unknown>>());

  function trackSave(request: Promise<unknown>) {
    saves.current.add(request);
    void request.finally(() => saves.current.delete(request));
  }

  // 진행 중인 저장이 끝나기를 기다린다. 기다리는 동안 새 저장이 시작될 수는 없다 —
  // 저장은 blur에서만 일어나고, 버튼을 누른 시점에 포커스는 이미 빠져나갔다.
  async function waitForContextSave() {
    await Promise.allSettled([...saves.current]);
  }

  return (
    <>
      <SummaryPanel
        key={`${date}:${categoryId}`}
        date={date}
        categoryId={categoryId}
        initialSummaries={initialSummaries}
        waitForContextSave={waitForContextSave}
      />

      <ContextEditor
        key={`context:${categoryId}`}
        userContext={userContext}
        categoryId={categoryId}
        categoryName={categoryName}
        categoryContext={categoryContext}
        onSave={trackSave}
      />
    </>
  );
}
