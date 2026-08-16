import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }
  if (session.user.email !== process.env.ADMIN_EMAIL) {
    redirect("/dashboard");
  }

  const pending = await db
    .select({
      id: users.id,
      email: users.email,
      requestedAt: users.requestedAt,
    })
    .from(users)
    .where(eq(users.approved, false))
    .orderBy(asc(users.requestedAt));

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-6 py-10">
      <h1 className="text-lg font-medium">승인 대기 사용자</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {pending.length}명 대기 중
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {pending.length === 0 && (
            <p className="text-sm text-muted-foreground">
              대기 중인 사용자가 없어요.
            </p>
          )}
          {pending.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-2 rounded-md border px-3 py-2"
            >
              <div className="flex-1">
                <p className="text-sm">{user.email}</p>
                <p className="text-xs text-muted-foreground">
                  {user.requestedAt
                    ? `${user.requestedAt.toLocaleString("ko-KR")}에 신청함`
                    : "아직 이용 신청은 안 함"}
                </p>
              </div>
              <form
                action={async () => {
                  "use server";
                  const current = await auth();
                  if (current?.user?.email !== process.env.ADMIN_EMAIL) return;

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
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
