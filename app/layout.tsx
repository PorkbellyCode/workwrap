import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, IBM_Plex_Sans_KR } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

// JetBrains Mono에는 한글 글리프가 없다. 같은 IBM Plex 계열이라 톤이 맞는 이 폰트를 스택 뒤에
// 두면 브라우저가 글리프 단위로 폴백해서 라틴은 JetBrains Mono, 한글은 여기서 그린다.
// subsets는 "무엇을 preload할지"만 고르는 옵션이라 한글 청크는 latin만 적어도 함께 번들된다
// (한글은 94개 청크라 preload 대상으로 넣으면 오히려 손해다).
// weight는 본문 400과 font-medium 500만 받는다 — font-semibold는 admin의 숫자 한 곳뿐이라
// 한글 600까지 받을 이유가 없다.
const plexSansKr = IBM_Plex_Sans_KR({
  variable: "--font-plex-kr",
  subsets: ["latin"],
  weight: ["400", "500"],
});

// interactiveWidget: 모바일 키보드가 올라오면 뷰포트(그리고 dvh)를 그만큼 줄인다.
// 이게 없으면 대시보드의 입력창과 녹음 버튼이 키보드 뒤로 가려진다.
export const viewport: Viewport = {
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  title: "Workwrap",
  description: "작업 중 남긴 음성 메모를 모아 하루를 요약해주는 서비스",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={`${jetbrainsMono.variable} ${plexSansKr.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
