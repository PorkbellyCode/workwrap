import { redirect } from "next/navigation";
import { and, asc, eq, gte, lt } from "drizzle-orm";
import { auth, signOut } from "@/auth";
import { db } from "@/lib/db";
import { memos, users } from "@/lib/db/schema";
import { dayRangeUtc, todayUtc } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import MemoTimeline from "./memo-timeline";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const [me] = await db
    .select({ approved: users.approved })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!me?.approved) {
    redirect("/pending");
  }

  const date = todayUtc();
  const { start, end } = dayRangeUtc(date);

  const rows = await db
    .select({
      id: memos.id,
      text: memos.text,
      audioUrl: memos.audioUrl,
      createdAt: memos.createdAt,
    })
    .from(memos)
    .where(
      and(
        eq(memos.userId, session.user.id),
        gte(memos.createdAt, start),
        lt(memos.createdAt, end)
      )
    )
    .orderBy(asc(memos.createdAt));

  const initialMemos = rows.map((memo) => ({
    ...memo,
    createdAt: memo.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-6 py-10">
      <header className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {session.user.email}
        </span>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button type="submit" variant="ghost" size="sm">
              로그아웃
            </Button>
          </form>
        </div>
      </header>

      <MemoTimeline date={date} initialMemos={initialMemos} />
    </div>
  );
}
