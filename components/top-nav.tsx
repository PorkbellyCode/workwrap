import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import NavLink from "@/components/nav-link";

// 대시보드/관리 페이지 공통 상단 메뉴.
// "관리" 링크는 ADMIN_EMAIL 계정에게만 노출한다(라우트 자체의 접근 제어는 /admin에서 별도로 한다).
export default async function TopNav({
  current,
}: {
  current: "dashboard" | "summary" | "admin";
}) {
  const session = await auth();
  const email = session?.user?.email ?? "";
  const isAdmin = Boolean(email) && email === process.env.ADMIN_EMAIL;

  const links = [
    { href: "/dashboard", label: "홈", key: "dashboard" as const },
    { href: "/summary", label: "요약", key: "summary" as const },
    ...(isAdmin
      ? [{ href: "/admin", label: "관리", key: "admin" as const }]
      : []),
  ];

  return (
    <header className="flex items-center justify-between gap-4 border-b pb-4">
      <nav className="flex items-center gap-1">
        <span className="pr-2 text-sm font-medium">Workwrap</span>
        {links.map((link) => (
          <NavLink
            key={link.key}
            href={link.href}
            label={link.label}
            current={link.key === current}
          />
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <span className="hidden text-sm text-muted-foreground sm:inline">
          {email}
        </span>
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
  );
}
