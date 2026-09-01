"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-8 px-6 py-10">
      {/* 흐름에서 빼야 카드가 화면 정중앙에 온다. 상단 우측은 앱 안(TopNav)과 같은 자리다. */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      {/* 워드마크는 TopNav와 같은 규칙 — 모노톤 중 "Wrap"에만 오렌지. */}
      <header className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-medium tracking-tight">
          Work<span className="text-brand">Wrap</span>
        </h1>
        <p className="text-sm text-balance text-muted-foreground">
          작업 중 남긴 음성 메모를 모아 하루를 요약해요.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <Card>
          <CardHeader>
            <CardTitle>로그인</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              disabled={loading}
              onClick={() => {
                setLoading(true);
                signIn("google", { redirectTo: "/dashboard" });
              }}
            >
              {loading && <Loader2 className="animate-spin" />}
              Sign in with Google
            </Button>
          </CardContent>
        </Card>

        {/* 승인 절차는 로그인을 막는 조건이 아니라 그 다음에 오는 안내라 카드 밖 각주로 뺐다. */}
        <p className="text-center text-xs text-balance text-muted-foreground">
          처음 로그인하면 관리자 승인 후 이용하실 수 있어요.
        </p>
      </div>
    </div>
  );
}
