"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MAX_CATEGORIES } from "@/lib/category";
import type { Category } from "./types";

// 카테고리 이름 변경과 삭제를 여기서 한다.
// 탭 텍스트 클릭은 "그 카테고리로 이동"이라는 동작을 이미 갖고 있어 이름 편집을 겹칠 수 없고,
// 탭마다 × 를 붙이면 모바일에서 터치 타겟이 좁아져 QA-1(버튼이 작아 누르기 불편)을 다시 부른다.
export default function CategoryManager({
  categories,
  open,
  onOpenChange,
}: {
  categories: Category[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [names, setNames] = useState<Record<string, string>>({});
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const isLastOne = categories.length <= 1;

  function nameOf(category: Category) {
    return names[category.id] ?? category.name;
  }

  async function rename(category: Category) {
    const name = nameOf(category).trim();
    if (!name || name === category.name) return;

    setPendingId(category.id);
    const res = await fetch(`/api/categories/${category.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setPendingId(null);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error?.message ?? "이름을 바꾸지 못했어요.");
      setNames((prev) => ({ ...prev, [category.id]: category.name }));
      return;
    }

    setError("");
    router.refresh();
  }

  async function remove(category: Category) {
    setPendingId(category.id);
    const res = await fetch(`/api/categories/${category.id}`, {
      method: "DELETE",
    });
    setPendingId(null);
    setConfirmingId(null);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error?.message ?? "삭제하지 못했어요.");
      return;
    }

    setError("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>카테고리 관리</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {categories.map((category) =>
            // 삭제 확인은 별도 모달을 띄우지 않고 그 행을 확인 상태로 바꾼다.
            // 팝업 위에 팝업이 겹치면 모바일에서 닫기 버튼과 뒤로가기 동작이 꼬인다.
            confirmingId === category.id ? (
              <div
                key={category.id}
                className="flex items-center gap-2 rounded-md border border-destructive/40 px-3 py-2"
              >
                <span className="flex-1 text-sm">
                  <span className="font-medium">{category.name}</span>
                  {category.memoCount > 0
                    ? ` · 메모 ${category.memoCount}건도 함께 삭제됩니다`
                    : " 을(를) 삭제합니다"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmingId(null)}
                >
                  취소
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={pendingId === category.id}
                  onClick={() => remove(category)}
                >
                  {pendingId === category.id && (
                    <Loader2 className="animate-spin" />
                  )}
                  삭제
                </Button>
              </div>
            ) : (
              <div key={category.id} className="flex items-center gap-2">
                <Input
                  value={nameOf(category)}
                  aria-label={`${category.name} 이름`}
                  disabled={pendingId === category.id}
                  onChange={(e) =>
                    setNames((prev) => ({
                      ...prev,
                      [category.id]: e.target.value,
                    }))
                  }
                  onBlur={() => rename(category)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`${category.name} 삭제`}
                  // 마지막 하나는 지울 수 없다. 카테고리가 0개면 메모를 아예 못 쓴다.
                  disabled={isLastOne}
                  onClick={() => setConfirmingId(category.id)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            )
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {isLastOne
              ? "마지막 카테고리는 삭제할 수 없어요."
              : "이름을 고치면 자동으로 저장돼요."}
          </span>
          <span className="tabular-nums">
            {categories.length} / {MAX_CATEGORIES}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
