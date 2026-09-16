import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

// interactiveWidget: 모바일 키보드가 올라오면 뷰포트(그리고 dvh)를 그만큼 줄인다.
// 이게 없으면 대시보드의 입력창과 녹음 버튼이 키보드 뒤로 가려진다.
export const viewport: Viewport = {
  interactiveWidget: "resizes-content",
  // 홈 인디케이터 영역(env(safe-area-inset-bottom))을 읽으려면 cover여야 한다.
  // 하단 탭 바가 그 값만큼 아래 여백을 둔다.
  viewportFit: "cover",
  // 안드로이드 상태 표시줄 색. manifest의 theme_color는 값이 하나뿐이라 테마를 따라가지 못하므로
  // 실행 중 색은 여기서 스킴별로 준다.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export const metadata: Metadata = {
  title: "Workwrap",
  description: "작업 중 남긴 음성 메모를 모아 하루를 요약해주는 서비스",
  applicationName: "Workwrap",
  // iOS는 manifest의 icons를 보지 않는다. 홈 화면 아이콘은 app/apple-icon.png에서 온다.
  appleWebApp: {
    capable: true,
    title: "Workwrap",
    statusBarStyle: "default",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
