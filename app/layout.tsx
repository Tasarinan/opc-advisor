import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OPC Advisor",
  description: "项目管理：项目、Issue、看板与周期",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
