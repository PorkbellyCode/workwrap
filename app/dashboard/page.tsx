import { redirect } from "next/navigation";
import { and, asc, eq, gte, lt } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { memos, summaries, users } from "@/lib/db/schema";
import { dayRangeUtc, todayUtc } from "@/lib/date";
import TopNav from "@/components/top-nav";
import MemoTimeline from "./memo-timeline";
import SummaryPanel from "./summary-panel";

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

  const summaryRows = await db
    .select({
      id: summaries.id,
      version: summaries.version,
      content: summaries.content,
      createdAt: summaries.createdAt,
    })
    .from(summaries)
    .where(
      and(
        eq(summaries.userId, session.user.id),
        eq(summaries.dateFrom, date),
        eq(summaries.dateTo, date),
        eq(summaries.format, "default")
      )
    )
    .orderBy(asc(summaries.version));

  const initialSummaries = summaryRows.map((summary) => ({
    ...summary,
    createdAt: summary.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-6 py-6">
      <TopNav current="dashboard" />

      <MemoTimeline date={date} initialMemos={initialMemos} />
      <SummaryPanel date={date} initialSummaries={initialSummaries} />
    </div>
  );
}
