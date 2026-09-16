"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { MAX_CONTEXT_LENGTH } from "@/lib/context";

// 요약 프롬프트에 붙는 배경 정보를 여기서 편집한다.
//
// ⋮ 카테고리 관리 팝업이 아니라 이 화면에 둔 이유: 그 팝업은 "카테고리 자체의
// 관리(이름·삭제)"고 컨텍스트는 요약의 입력값이다. 대시보드 요약 시트에 넣는 안도
// 폐기했다 — 요약을 보려고 연 시트에서 요약이 화면 밖으로 밀린다.
//
// 모양의 변천: 늘 펼친 카드 → 접이식 카드(적어둔 게 있으면 펼침) → 지금의 설정 행.
// 한번 적으면 거의 고치지 않는 값인데, 접이식에서는 적어둔 사람일수록 1000자 입력창
// 두 개가 요약 아래에 늘 펼쳐져 있었다. iOS 설정 화면처럼 값은 한 줄 미리보기로만
// 보여주고, 고칠 때만 시트를 열어 입력창을 꺼낸다. 비어 있어도 행은 남아 있어
// 기능의 존재를 잊지 않는다.
type Target = "me" | "category";

export default function ContextEditor({
  userContext,
  categoryId,
  categoryName,
  categoryContext,
  onSave,
}: {
  userContext: string;
  categoryId: string;
  categoryName: string;
  categoryContext: string;
  // 요약이 이 저장을 기다릴 수 있도록 진행 중인 요청을 부모에게 넘긴다.
  onSave: (request: Promise<unknown>) => void;
}) {
  const router = useRouter();
  // 마지막으로 저장된 값. 서버 값에서 출발하고, 저장이 성공하면 이쪽을 먼저 바꿔
  // router.refresh()를 기다리지 않고 행 미리보기가 새 값을 보여준다.
  const [saved, setSaved] = useState({ me: userContext, category: categoryContext });
  const [editing, setEditing] = useState<Target | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  const rows: { target: Target; label: string; placeholder: string }[] = [
    {
      target: "me",
      label: "나",
      placeholder: "예: 프론트엔드 개발자, 사내 결제 시스템 담당",
    },
    {
      target: "category",
      label: categoryName,
      placeholder: "예: 쓰는 기술, 함께 일하는 사람, 자주 쓰는 약어",
    },
  ];
  const current = rows.find((row) => row.target === editing);

  function open(target: Target) {
    setDraft(saved[target]);
    setEditing(target);
  }

  // 저장 버튼을 따로 두지 않는다 — 안 누른 채로 요약을 돌리는 일이 생긴다.
  // 완료·끌어내리기·바깥 누르기 어느 쪽으로 닫아도 저장한다(메모 앱과 같은 규칙).
  async function close() {
    const target = editing;
    setEditing(null);
    if (!target || draft.trim() === saved[target].trim()) return;

    const url = target === "me" ? "/api/me" : `/api/categories/${categoryId}`;
    const request = fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context: draft }),
    });
    onSave(request);
    const res = await request;

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error?.message ?? "배경 정보를 저장하지 못했어요.");
      return;
    }

    setError("");
    setSaved((prev) => ({ ...prev, [target]: draft.trim() }));
    router.refresh();
  }

  return (
    <section aria-labelledby="context-heading" className="flex flex-col gap-1.5">
      <h2
        id="context-heading"
        className="px-4 text-[13px] text-muted-foreground"
      >
        요약에 쓰는 배경 정보
      </h2>

      <ul className="overflow-hidden rounded-xl bg-card">
        {rows.map(({ target, label }) => {
          const value = saved[target].trim();
          return (
            <li key={target} className="[&:not(:first-child)>button>span:last-child]:border-t">
              <button
                type="button"
                onClick={() => open(target)}
                className="flex h-11 w-full items-center pl-4 text-left outline-none focus-visible:bg-muted active:bg-muted"
              >
                {/* 구분선은 글자 시작선부터 긋는다(행 전체 폭의 오른쪽 부분). */}
                <span className="flex h-full min-w-0 flex-1 items-center gap-3 pr-3">
                  <span className="max-w-[40%] shrink-0 truncate text-[15px]">
                    {label}
                  </span>
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-right text-[15px]",
                      value ? "text-muted-foreground" : "text-brand"
                    )}
                  >
                    {value || "적어두기"}
                  </span>
                  <ChevronRight
                    aria-hidden
                    className="size-4 shrink-0 text-muted-foreground/60"
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {error ? (
        <p className="px-4 text-[13px] text-destructive">{error}</p>
      ) : (
        <p className="px-4 text-[13px] text-muted-foreground">
          메모에 &ldquo;그거&rdquo;, &ldquo;아까 그 문제&rdquo;처럼 대상이 빠져 있을 때 무엇에 대한
          이야기인지 판단하는 데 써요.
        </p>
      )}

      <Drawer
        open={editing !== null}
        onOpenChange={(next) => {
          if (!next) void close();
        }}
      >
        <DrawerContent keyboardAware showCloseButton={false}>
          <DrawerHeader className="pr-4">
            <div className="flex items-center justify-between gap-3">
              <DrawerTitle className="truncate">
                {current?.target === "me" ? "나에 대해" : `${categoryName}에 대해`}
              </DrawerTitle>
              <DrawerClose
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "shrink-0 text-[15px] font-semibold text-brand"
                )}
              >
                완료
              </DrawerClose>
            </div>
            <DrawerDescription>
              {current?.target === "me"
                ? "모든 카테고리의 요약에 함께 쓰여요."
                : `${categoryName} 요약에만 쓰여요.`}
            </DrawerDescription>
          </DrawerHeader>

          <DrawerBody className="pb-4">
            <Textarea
              autoFocus
              value={draft}
              placeholder={current?.placeholder}
              maxLength={MAX_CONTEXT_LENGTH}
              onChange={(e) => setDraft(e.target.value)}
              aria-label={current?.target === "me" ? "나에 대한 배경 정보" : `${categoryName} 배경 정보`}
              className="max-h-[50dvh] min-h-40 resize-none rounded-xl border-transparent bg-card px-4 py-3 text-base leading-relaxed [scrollbar-width:none] dark:bg-popover [&::-webkit-scrollbar]:hidden"
            />
            <p className="self-end px-1 text-[13px] tabular-nums text-muted-foreground">
              {draft.length} / {MAX_CONTEXT_LENGTH}
            </p>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </section>
  );
}
