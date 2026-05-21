import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BottomNav from "./components/BottomNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SpeakUp AI - 社交成长教练",
  description: "AI 驱动的社交成长教练，帮助低社交度人群提升沟通自信与表达能力",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gradient-to-b from-purple-50 to-white">
        <main className="flex-1 max-w-lg mx-auto w-full px-4 pb-20 pt-4">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
