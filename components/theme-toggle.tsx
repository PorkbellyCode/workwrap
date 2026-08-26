"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

const emptySubscribe = () => () => {};

// next-themes는 localStorage를 읽어야 실제 테마를 알 수 있어 마운트 전에는
// resolvedTheme가 서버와 다르게 채워질 수 있다. useSyncExternalStore로
// "마운트됐는가"를 서버 스냅샷 false / 클라이언트 스냅샷 true로 나눠두면
// 서버 출력과 클라이언트 첫 렌더가 항상 같고, 하이드레이션 직후에만
// 실제 테마로 다시 그려진다. useEffect+setState는 이 프로젝트 lint 규칙상
// 못 쓴다(react-hooks/set-state-in-effect).
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="테마 전환"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {mounted && resolvedTheme === "dark" ? (
        <Sun className="size-4" />
      ) : (
        <Moon className="size-4" />
      )}
    </Button>
  );
}
