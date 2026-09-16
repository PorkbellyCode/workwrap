"use client";

import { useState } from "react";
import { CalendarDays, Loader2, Mic, Sparkles, type LucideIcon } from "lucide-react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import WordmarkIntro from "@/components/wordmark-intro";

// 로그인 화면은 처음 오는 사람이 서비스를 알게 되는 유일한 화면이기도 하다(가입 후에는
// 승인 대기가 있어 바로 써볼 수 없다). 그래서 버튼 하나만 두지 않고, iOS 앱의 첫 실행
// 안내처럼 무엇을 하는 서비스인지 세 줄로 보여준다. 세 줄은 실제 사용 흐름
// (말하기 → 쌓이기 → 요약) 순서다.
const FEATURES: { icon: LucideIcon; title: string; detail: string }[] = [
  {
    icon: Mic,
    title: "말로 남기면 받아 적어요",
    detail: "작업하다 떠오른 일을 버튼 하나로 짧게 기록해요.",
  },
  {
    icon: CalendarDays,
    title: "날짜와 업무별로 쌓여요",
    detail: "업무 탭을 나눠 두면 섞이지 않고 모여요.",
  },
  {
    icon: Sparkles,
    title: "하루를 한 번에 정리해요",
    detail: "고른 메모만 요약하고, 복사하거나 공유해요.",
  },
];

// Google 브랜드 가이드의 4색 G 로고. 버튼 색과 상관없이 원래 색 그대로 쓴다.
function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 48 48" className="size-5">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  return (
    // 모바일에서는 버튼을 화면 아래(엄지가 닿는 자리)에 붙이고, 넓은 화면에서는
    // 전체를 가운데에 모은다.
    <div className="relative mx-auto flex min-h-dvh w-full max-w-sm flex-col px-6 pt-16 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:justify-center sm:py-10">
      {/* 흐름에서 빼야 본문이 화면 가운데에 온다. 상단 우측은 앱 안(TopNav)과 같은 자리다. */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <main className="flex flex-1 flex-col justify-center gap-10 sm:flex-none">
        {/* 워드마크는 TopNav와 같은 규칙 — 모노톤 중 "Wrap"에만 오렌지. 여기서만 열릴 때 한 번 움직인다. */}
        <header className="flex flex-col items-center gap-2 text-center">
          <WordmarkIntro />
          <p className="text-[15px] text-balance text-muted-foreground">
            작업 중 남긴 음성 메모를 모아 하루를 요약해요.
          </p>
        </header>

        <ul className="flex flex-col gap-5">
          {FEATURES.map(({ icon: Icon, title, detail }) => (
            <li key={title} className="flex items-start gap-4">
              <Icon aria-hidden className="mt-0.5 size-7 shrink-0 text-brand" strokeWidth={1.75} />
              <div className="flex flex-col gap-0.5">
                <p className="text-[15px] font-semibold">{title}</p>
                <p className="text-sm text-muted-foreground">{detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </main>

      <div className="mt-10 flex flex-col gap-3">
        <Button
          className="h-12 w-full gap-2.5 rounded-xl text-base"
          disabled={loading}
          onClick={() => {
            setLoading(true);
            signIn("google", { redirectTo: "/dashboard" });
          }}
        >
          {/* G 로고는 흰 원 위에 얹어 어두운 버튼(라이트 모드)에서도 형태가 산다. */}
          <span className="grid size-7 place-items-center rounded-full bg-white">
            {loading ? <Loader2 className="size-4 animate-spin text-black" /> : <GoogleMark />}
          </span>
          Google로 계속하기
        </Button>

        {/* 승인 절차는 로그인을 막는 조건이 아니라 그 다음에 오는 안내라 버튼 밑 각주로 둔다. */}
        <p className="text-center text-[13px] text-balance text-muted-foreground">
          처음 로그인하면 관리자 승인 후 이용할 수 있어요.
        </p>
      </div>
    </div>
  );
}
