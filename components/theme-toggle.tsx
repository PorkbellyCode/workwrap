"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="테마 전환"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {/* next-themes는 마운트 전엔 테마를 알 수 없어 서버/클라이언트 불일치가
          발생할 수 있으므로, 이 아이콘만 하이드레이션 경고를 무시한다. */}
      <span suppressHydrationWarning>
        {resolvedTheme === "dark" ? (
          <Sun className="size-4" />
        ) : (
          <Moon className="size-4" />
        )}
      </span>
    </Button>
  );
}
