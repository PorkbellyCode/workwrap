"use client";

import { useState } from "react";
import { Check, Loader2, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Memo = {
  id: string;
  text: string;
  audioUrl: string | null;
  createdAt: string;
};

export default function MemoTimeline({
  date,
  initialMemos,
}: {
  date: string;
  initialMemos: Memo[];
}) {
  const [memos, setMemos] = useState<Memo[]>(initialMemos);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  async function addMemo(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setPending(true);
    const res = await fetch("/api/memos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    setPending(false);
    if (res.ok) {
      const memo: Memo = await res.json();
      setMemos((prev) => [...prev, memo]);
      setText("");
    }
  }

  async function deleteMemo(id: string) {
    const res = await fetch(`/api/memos/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMemos((prev) => prev.filter((memo) => memo.id !== id));
    }
  }

  function startEdit(memo: Memo) {
    setEditingId(memo.id);
    setEditingText(memo.text);
  }

  async function saveEdit(id: string) {
    if (!editingText.trim()) return;
    const res = await fetch(`/api/memos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: editingText }),
    });
    if (res.ok) {
      const updated: Memo = await res.json();
      setMemos((prev) =>
        prev.map((memo) => (memo.id === id ? updated : memo))
      );
      setEditingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {date} 메모
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {memos.length === 0 && (
            <p className="text-sm text-muted-foreground">
              아직 메모가 없어요.
            </p>
          )}
          {memos.map((memo) => (
            <div
              key={memo.id}
              className="flex items-center gap-2 rounded-md border px-3 py-2"
            >
              {editingId === memo.id ? (
                <>
                  <Input
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="저장"
                    onClick={() => saveEdit(memo.id)}
                  >
                    <Check className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="취소"
                    onClick={() => setEditingId(null)}
                  >
                    <X className="size-4" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm">{memo.text}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="수정"
                    onClick={() => startEdit(memo)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="삭제"
                    onClick={() => deleteMemo(memo.id)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <form onSubmit={addMemo} className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="메모 입력 (음성 녹음은 아직 준비 중)"
          className="flex-1"
        />
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          추가
        </Button>
      </form>
    </div>
  );
}
