import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "英语口语训练",
  description:
    "用五步法练习英语口语：可理解输入 → 抽高频句式 → 看着填 → 给中文意思自己说 → 限时脱口而出，并获得地道度 + 语法双反馈。",
  applicationName: "英语口语训练",
  appleWebApp: { capable: true, title: "英语口语", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="min-h-full bg-slate-50 text-slate-900 antialiased">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
