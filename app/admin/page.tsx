import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { and, asc, count, desc, eq, gte, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { memos, summaries, users } from "@/lib/db/schema";
import { dayRangeUtc, todayUtc } from "@/lib/date";
import TopNav from "@/components/top-nav";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import UsageChart, { type DailyPoint } from "./usage-chart";
import UserFilter from "./user-filter";

const TREND_DAYS = 14;

// 최근 TREND_DAYS일의 날짜 목록(오늘 포함). 데이터가 없는 날도 0으로 채워
// 차트에 빈 구간이 생기지 않게 한다.
function recentDates() {
  const { start: todayStart } = dayRangeUtc(todayUtc());
  return Array.from({ length: TREND_DAYS }, (_, i) => {
    const d = new Date(
      todayStart.getTime() - (TREND_DAYS - 1 - i) * 24 * 60 * 60 * 1000
    );
    return d.toISOString().slice(0, 10);
  });
}

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }
  if (session.user.email !== process.env.ADMIN_EMAIL) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const rawUser = params.user;
  const selectedUserId = typeof rawUser === "string" ? rawUser : null;

  const dates = recentDates();
  const since = new Date(`${dates[0]}T00:00:00.000Z`);

  // 필터가 걸리면 추이 집계에도 같은 사용자 조건을 건다.
  const memoScope = selectedUserId
    ? and(gte(memos.createdAt, since), eq(memos.userId, selectedUserId))
    : gte(memos.createdAt, since);
  const summaryScope = selectedUserId
    ? and(gte(summaries.createdAt, since), eq(summaries.userId, selectedUserId))
    : gte(summaries.createdAt, since);

  // 날짜별 집계는 DB에서 GROUP BY로 끝낸다(행을 전부 가져와 앱에서 세지 않는다).
  const memoDay = sql<string>`to_char(${memos.createdAt}, 'YYYY-MM-DD')`;
  const summaryDay = sql<string>`to_char(${summaries.createdAt}, 'YYYY-MM-DD')`;

  const [memoDaily, summaryDaily, perUser] = await Promise.all([
    db
      .select({ day: memoDay, total: count() })
      .from(memos)
      .where(memoScope)
      .groupBy(memoDay),
    db
      .select({ day: summaryDay, total: count() })
      .from(summaries)
      .where(summaryScope)
      .groupBy(summaryDay),
    // 사용자별 메모/요약 건수. 두 테이블을 한 번에 조인하면 카티전 곱으로
    // 건수가 부풀려지므로 각각 서브쿼리로 센 뒤 붙인다.
    db
      .select({
        id: users.id,
        email: users.email,
        approved: users.approved,
        requestedAt: users.requestedAt,
        createdAt: users.createdAt,
        memoCount: sql<number>`(
          select count(*)::int from ${memos} where ${memos.userId} = ${users.id}
        )`,
        summaryCount: sql<number>`(
          select count(*)::int from ${summaries} where ${summaries.userId} = ${users.id}
        )`,
        lastMemoAt: sql<Date | null>`(
          select max(${memos.createdAt}) from ${memos} where ${memos.userId} = ${users.id}
        )`,
      })
      .from(users)
      .orderBy(asc(users.approved), desc(users.createdAt)),
  ]);

  const memoByDay = new Map(memoDaily.map((row) => [row.day, row.total]));
  const summaryByDay = new Map(summaryDaily.map((row) => [row.day, row.total]));

  const trend: DailyPoint[] = dates.map((date) => ({
    date,
    memos: memoByDay.get(date) ?? 0,
    summaries: summaryByDay.get(date) ?? 0,
  }));

  // 선택된 사용자가 있으면 그 사람만, 없으면 전체 합계.
  const scoped = selectedUserId
    ? perUser.filter((u) => u.id === selectedUserId)
    : perUser;

  const scopedTotals = {
    memos: scoped.reduce((sum, u) => sum + u.memoCount, 0),
    summaries: scoped.reduce((sum, u) => sum + u.summaryCount, 0),
  };
  const pendingCount = perUser.filter((u) => !u.approved).length;

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-6">
      <TopNav current="admin" />

      {/* 필터는 차트 카드 안이 아니라 위쪽 한 줄에 두고, 아래 타일과 차트를 함께 스코프한다. */}
      <UserFilter users={perUser.map((u) => ({ id: u.id, email: u.email }))} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="사용자" value={perUser.length} />
        <StatTile label="승인 대기" value={pendingCount} />
        <StatTile label="메모" value={scopedTotals.memos} />
        <StatTile label="요약" value={scopedTotals.summaries} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">최근 14일 사용량</CardTitle>
          <CardDescription>
            {selectedUserId
              ? `${scoped[0]?.email ?? "선택한 사용자"}, 일자별 생성 건수`
              : "전체 사용자 합계, 일자별 생성 건수"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UsageChart data={trend} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">사용자</CardTitle>
          <CardDescription>
            승인 대기 중인 사용자가 위에 표시됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이메일</TableHead>
                  <TableHead className="text-right">메모</TableHead>
                  <TableHead className="text-right">요약</TableHead>
                  <TableHead>마지막 활동</TableHead>
                  <TableHead className="text-right">상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {perUser.map((user) => (
                  // 표는 명단이라 필터로 행을 숨기지 않고, 선택된 사용자만 강조한다.
                  <TableRow
                    key={user.id}
                    className={
                      user.id === selectedUserId ? "bg-muted/50" : undefined
                    }
                  >
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {user.memoCount}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {user.summaryCount}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.lastMemoAt
                        ? new Date(user.lastMemoAt).toLocaleDateString("ko-KR")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {user.approved ? (
                        <span className="text-muted-foreground">승인됨</span>
                      ) : (
                        <form
                          action={async () => {
                            "use server";
                            const current = await auth();
                            if (
                              current?.user?.email !== process.env.ADMIN_EMAIL
                            ) {
                              return;
                            }
                            await db
                              .update(users)
                              .set({ approved: true })
                              .where(eq(users.id, user.id));
                            refresh();
                          }}
                        >
                          <Button type="submit" size="sm">
                            승인
                          </Button>
                        </form>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <Card className="gap-1 py-4">
      <CardHeader className="pb-0">
        <CardDescription className="text-xs">{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
