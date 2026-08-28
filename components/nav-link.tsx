"use client";

import Link, { useLinkStatus } from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import NavOverlay from "./nav-overlay";

// useLinkStatus는 <Link>의 자손에서만 그 링크의 전환 상태를 읽을 수 있다.
function LinkOverlay() {
  const { pending } = useLinkStatus();
  return pending ? <NavOverlay /> : null;
}

// TopNav는 세션을 읽는 서버 컴포넌트라 훅을 쓸 수 없어서 링크만 클라이언트로 떼어냈다.
export default function NavLink({
  href,
  label,
  current,
}: {
  href: string;
  label: string;
  current: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      // 현재 페이지는 회색 배경 대신 오렌지 글자로 표시한다.
      // ghost는 자체 글자색을 안 주므로 text-brand와 부딪히지 않는다.
      className={cn(
        buttonVariants({ variant: "ghost", size: "sm" }),
        current && "bg-muted text-brand",
      )}
    >
      {label}
      <LinkOverlay />
    </Link>
  );
}
