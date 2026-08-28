"use client";

import Link, { useLinkStatus } from "next/link";
import { buttonVariants } from "@/components/ui/button";
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
      className={buttonVariants({
        variant: current ? "secondary" : "ghost",
        size: "sm",
      })}
    >
      {label}
      <LinkOverlay />
    </Link>
  );
}
