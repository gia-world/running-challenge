import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "런챌",
  description: "주 3회 러닝을 자동으로 집계하는 러닝 인증 챌린지 앱",
};

// 앱 전체는 확대를 막고(오탭 시 화면이 늘어나 레이아웃이 깨지는 걸 방지),
// 사진을 크게 봐야 하는 PhotoViewerModal에서만 자체 핀치줌 제스처로 확대를
// 지원한다 — 뷰포트 확대는 페이지 전체에 걸리는 설정이라 컴포넌트 단위로
// 켜고 끌 수 없어서, 기본은 꺼두고 모달 쪽에서 직접 확대를 구현했다.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
