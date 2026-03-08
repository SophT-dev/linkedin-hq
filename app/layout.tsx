import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import QuickCaptureButton from "@/components/QuickCaptureButton";

export const metadata: Metadata = {
  title: "LinkedIn HQ — Taha Anwar",
  description: "Your personal LinkedIn domination system",
  manifest: "/manifest.json",
  themeColor: "#0d0608",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="antialiased bg-background text-foreground" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
        <main className="pb-nav min-h-dvh">
          {children}
        </main>
        <QuickCaptureButton />
        <BottomNav />
      </body>
    </html>
  );
}
