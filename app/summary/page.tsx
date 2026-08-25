import { redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { summaries, users } from "@/lib/db/schema";
import { todaySeoul } from "@/lib/date";
import TopNav from "@/components/top-nav";
import SummaryPanel from "./summary-panel";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export default async function SummaryPage({
  searchParams,
}: PageProps<"/summary">) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = session.user.id;

  const [me] = await db
    .select({ approved: users.approved })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!me?.approved) {
    redirect("/pending");
  }

  const params = await searchParams;
  const rawDate = params.date;
  const date =
    typeof rawDate === "string" && DATE_PATTERN.test(rawDate)
      ? rawDate
      : todaySeoul();

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
        eq(summaries.userId, userId),
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
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-4 px-6 py-6">
      <TopNav current="summary" />

      <SummaryPanel
        key={date}
        date={date}
        initialSummaries={initialSummaries}
      />
    </div>
  );
}
