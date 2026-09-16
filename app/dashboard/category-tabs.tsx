"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MoreVertical, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_CATEGORIES } from "@/lib/category";
import { cn } from "@/lib/utils";
import NavOverlay from "@/components/nav-overlay";
import CategoryManager from "./category-manager";
import type { Category } from "./types";

// 탭 텍스트 클릭은 "그 카테고리로 이동"만 한다. 추가는 ＋, 이름 변경·삭제는 ⋮ 팝업이 맡는다.
//
// '전체' 탭은 두지 않는다. 항상 카테고리 하나만 보게 되므로 입력 영역에 카테고리
// 선택기가 필요 없어지고(보고 있는 탭이 곧 저장될 카테고리), 목록에 카테고리
// 머리글을 붙일 이유도 사라진다. 하루 전체를 모아 보는 건 요약 화면이 맡는다.
export default function CategoryTabs({
  categories,
  selectedId,
  date,
  basePath = "/dashboard",
}: {
  categories: Category[];
  selectedId: string;
  date: string;
  // 탭이 어디로 이동할지 결정한다. 요약 화면에서도 같은 탭을 쓴다.
  basePath?: string;
}) {
  const router = useRouter();
  const [navigating, startNavigation] = useTransition();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [managing, setManaging] = useState(false);
  const [error, setError] = useState("");
  // 누른 칸으로 선택 표시를 먼저 옮긴다. 페이지 전환이 끝나면 서버가 내려준 selectedId로 돌아온다.
  const [shownId, setShownId] = useOptimistic(selectedId);

  const atLimit = categories.length >= MAX_CATEGORIES;
  const selectedIndex = categories.findIndex(
    (category) => category.id === shownId
  );

  function go(categoryId: string) {
    startNavigation(() => {
      setShownId(categoryId);
      router.push(`${basePath}?date=${date}&category=${categoryId}`);
    });
  }

  async function add() {
    const trimmed = name.trim();
    if (!trimmed) {
      setAdding(false);
      return;
    }

    setPending(true);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    setPending(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error?.message ?? "카테고리를 만들지 못했어요.");
      return;
    }

    const created: Category = await res.json();
    setError("");
    setName("");
    setAdding(false);
    // 방금 만든 카테고리로 바로 옮겨간다.
    go(created.id);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      {navigating && <NavOverlay />}
      <div className="flex items-center gap-1">
        {/* iOS 세그먼트 컨트롤. 카테고리는 최대 3개라 칸을 같은 폭으로 나눠 트랙을 채운다.
            선택 표시는 칸마다 그리지 않고 한 장을 옮겨서, 탭을 바꾸면 옆으로 미끄러진다. */}
        <div className="relative flex h-8 min-w-0 flex-1 rounded-[9px] bg-muted p-0.5">
          {selectedIndex >= 0 && (
            <span
              aria-hidden
              className="absolute inset-y-0.5 left-0.5 rounded-[7px] bg-card shadow-[0_1px_3px_rgb(0_0_0/0.12),0_1px_1px_rgb(0_0_0/0.04)] transition-transform duration-200 ease-out motion-reduce:transition-none dark:bg-input"
              style={{
                width: `calc((100% - 4px) / ${categories.length})`,
                transform: `translateX(${selectedIndex * 100}%)`,
              }}
            />
          )}
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              className={cn(
                "relative min-w-0 flex-1 truncate rounded-[7px] px-2 text-[13px] outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                shownId === category.id ? "font-semibold" : "font-medium text-muted-foreground active:opacity-60"
              )}
              aria-current={selectedId === category.id ? "page" : undefined}
              onClick={() => shownId !== category.id && go(category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>

        {adding && (
          <Input
            autoFocus
            value={name}
            disabled={pending}
            placeholder="카테고리 이름"
            aria-label="새 카테고리 이름"
            onChange={(e) => setName(e.target.value)}
            onBlur={add}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                setName("");
                setAdding(false);
              }
            }}
            className="h-8 w-32 shrink-0"
          />
        )}

        <Button
          variant="ghost"
          size="icon"
          aria-label="카테고리 추가"
          disabled={atLimit || adding}
          onClick={() => setAdding(true)}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="카테고리 관리"
          onClick={() => setManaging(true)}
        >
          <MoreVertical className="size-4" />
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <CategoryManager
        categories={categories}
        open={managing}
        onOpenChange={setManaging}
      />
    </div>
  );
}
