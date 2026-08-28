import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import NavLink from "@/components/nav-link";
import Link from "next/link";

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

  // "홈"은 별도 링크로 두지 않는다 — 사이트명이 그 역할을 한다.
  const links = [
    { href: "/summary", label: "요약", key: "summary" as const },
    ...(isAdmin
      ? [{ href: "/admin", label: "관리", key: "admin" as const }]
      : []),
  ];

  return (
    <header className="flex items-center justify-between gap-4 border-b pb-4">
      <nav className="flex items-center gap-1">
        {/* 사이트명 자체가 홈(=대시보드) 링크다. 모노톤에서 유일하게 색이 붙는 자리인데,
            전체를 물들이지 않고 "Wrap"에만 오렌지를 준다. */}
        <Link href="/dashboard" className="pr-2 text-xl font-medium">
          Work<span className="text-brand">Wrap</span>
        </Link>
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
        <ThemeToggle />
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </div>
    </header>
  );
}
