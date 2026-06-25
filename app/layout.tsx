import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import QuickCaptureButton from "@/components/QuickCaptureButton";

export const metadata: Metadata = {
  title: "LinkedIn HQ — Taha Anwar",
  description: "Your personal LinkedIn domination system",
  manifest: "/manifest.json",
  themeColor: "#f6f6f7",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Light-only app (the dark theme + toggle were removed — Newsfeed v2 is a
  // clean light UI). No anti-flash script needed; light is the only mode.
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body
        className="antialiased"
        style={{
          fontFamily: "Arial, Helvetica, sans-serif",
          background: "#f6f6f7",
          color: "#111827",
        }}
      >
        <main className="pb-nav min-h-dvh">{children}</main>
        <QuickCaptureButton />
        <BottomNav />
      </body>
    </html>
  );
}
