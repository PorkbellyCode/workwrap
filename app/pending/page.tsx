import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { eq } from "drizzle-orm";
import { auth, signOut } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function PendingPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const [me] = await db
    .select({ status: users.status, requestedAt: users.requestedAt })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (me?.status === "active") {
    redirect("/dashboard");
  }

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-8 px-6 py-10">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      {/* /login과 같은 워드마크 — 승인 전 화면끼리 톤을 맞춘다. */}
      <header className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-medium tracking-tight">
          Work<span className="text-brand">Wrap</span>
        </h1>
        <p className="text-sm text-balance text-muted-foreground">
          작업 중 남긴 음성 메모를 모아 하루를 요약해요.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>
            {me?.status === "suspended"
              ? "이용이 중지됐어요"
              : "승인 대기 중이에요"}
          </CardTitle>
          <CardDescription>
            {me?.status === "suspended"
              ? `${session.user.email} 계정은 현재 이용이 중지됐어요. 문의가 필요하면 관리자에게 연락해주세요.`
              : `${session.user.email}로 로그인했어요. 이용하려면 관리자 승인이 필요해요.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {me?.status === "suspended" ? null : me?.requestedAt ? (
            <p className="text-sm text-muted-foreground">
              이용 신청을 보냈어요. 승인되면 이용하실 수 있어요.
            </p>
          ) : (
            <form
              action={async () => {
                "use server";
                const current = await auth();
                if (!current?.user?.id || !current.user.email) return;

                await db
                  .update(users)
                  .set({ requestedAt: new Date() })
                  .where(eq(users.id, current.user.id));

                try {
                  await fetch("https://api.resend.com/emails", {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${process.env.AUTH_RESEND_KEY}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      from: process.env.AUTH_EMAIL_FROM,
                      to: process.env.ADMIN_EMAIL,
                      subject: "Workwrap 이용 신청",
                      text: `${current.user.email}님이 이용을 신청했어요. /admin 에서 승인해주세요.`,
                    }),
                  });
                } catch {
                  // 알림 메일 발송 실패는 신청 기록 자체를 막지 않는다.
                  // 관리자는 /admin에서 신청 목록을 직접 확인할 수 있다.
                }

                refresh();
              }}
            >
              <Button type="submit" className="w-full">
                이용 신청
              </Button>
            </form>
          )}

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
        </CardContent>
      </Card>
    </div>
  );
}
