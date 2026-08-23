"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const ALL_USERS = "all";

export default function UserFilter({
  users,
}: {
  users: { id: string; email: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const selected = searchParams.get("user") ?? ALL_USERS;

  const labels: Record<string, string> = { [ALL_USERS]: "전체 사용자" };
  for (const user of users) labels[user.id] = user.email;

  // 필터 상태를 URL에 두면 서버에서 집계를 다시 계산할 수 있고,
  // 새로고침·링크 공유에도 선택이 유지된다.
  function select(value: string | null) {
    const params = new URLSearchParams(searchParams);
    if (!value || value === ALL_USERS) params.delete("user");
    else params.set("user", value);

    const query = params.toString();
    startTransition(() => router.push(query ? `/admin?${query}` : "/admin"));
  }

  return (
    <div className="flex items-center gap-2" data-pending={pending || undefined}>
      <span className="text-sm text-muted-foreground">사용자</span>
      <Select value={selected} onValueChange={select}>
        <SelectTrigger size="sm" className="min-w-52">
          <SelectValue>{(value) => labels[value as string] ?? "전체 사용자"}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_USERS}>전체 사용자</SelectItem>
          {users.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {user.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
