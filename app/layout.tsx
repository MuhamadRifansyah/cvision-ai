import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CVision AI — ATS Readiness Analyzer",
  description: "Review your CV with explainable, privacy-first ATS feedback.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
