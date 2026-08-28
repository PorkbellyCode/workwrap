"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-4 px-6 py-10">
      <div className="flex justify-end">
        <ThemeToggle />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workwrap 로그인</CardTitle>
          <CardDescription>
            Google 계정으로 로그인해주세요. 처음 로그인하면 관리자 승인 후
            이용하실 수 있어요.
          </CardDescription>
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
            Google로 로그인
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
