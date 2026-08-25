import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
