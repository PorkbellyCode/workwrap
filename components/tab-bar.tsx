"use client";

import Link, { useLinkStatus } from "next/link";
import { ChartColumn, House, Sparkles, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import NavOverlay from "./nav-overlay";

type TabKey = "dashboard" | "summary" | "admin";

const TABS: { key: TabKey; href: string; label: string; icon: LucideIcon }[] = [
  { key: "dashboard", href: "/dashboard", label: "메모", icon: House },
  { key: "summary", href: "/summary", label: "요약", icon: Sparkles },
  { key: "admin", href: "/admin", label: "관리", icon: ChartColumn },
];

function LinkOverlay() {
  const { pending } = useLinkStatus();
  return pending ? <NavOverlay /> : null;
}

// 모바일 하단 탭 바. 엄지가 닿는 자리에 화면 전환을 둔다.
// sm 이상에서는 TopNav의 링크가 같은 일을 하므로 숨긴다.
// 배경을 반투명하게 두고 흐리게 해, 뒤로 지나가는 내용이 비치는 iOS 탭 바의 질감을 낸다.
export default function TabBar({
  current,
  isAdmin,
}: {
  current: TabKey;
  isAdmin: boolean;
}) {
  const tabs = TABS.filter((tab) => tab.key !== "admin" || isAdmin);

  return (
    <nav
      aria-label="주요 화면"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/80 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-xl sm:hidden"
    >
      <ul className="mx-auto flex h-[49px] max-w-xl">
        {tabs.map(({ key, href, label, icon: Icon }) => {
          const active = key === current;
          return (
            <li key={key} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-0.5 text-[10px] font-medium outline-none focus-visible:bg-muted active:opacity-60",
                  active ? "text-brand" : "text-muted-foreground"
                )}
              >
                <Icon aria-hidden className="size-6" strokeWidth={active ? 2.25 : 1.75} />
                {label}
                <LinkOverlay />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
