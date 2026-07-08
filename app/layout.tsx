import type { Metadata } from "next";
import "./globals.css";

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
  //
  // 2026-07-08: /news and /capture (the only two pages this nav pointed to)
  // were retired in favor of the new linkedin-hq daily-tldr skill (Slack +
  // Sheet, not a web page). BottomNav/QuickCaptureButton had nothing left to
  // navigate to, so they're removed too. The app now only serves the public
  // lead-magnet landing pages ((public) route group) + the save/publish API
  // routes /linkedin-batch and /linkedin-post depend on -- untouched.
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
        <main className="min-h-dvh">{children}</main>
      </body>
    </html>
  );
}
