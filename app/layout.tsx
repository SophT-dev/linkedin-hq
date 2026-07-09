import type { Metadata } from "next";
import { Inter, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import AppShell from "@/components/AppShell";
import "./globals.css";

// Bleed AI's real brand fonts (BRAND.md) -- Inter for headlines/body,
// Instrument Serif italic for sparing accents, JetBrains Mono for technical
// labels. Loaded globally (on <html>) so the public lead-magnet page gets
// on-brand typography too -- only the .app-shell COLOR scope is internal-only.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700", "800", "900"],
});
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  weight: "400",
  style: ["normal", "italic"],
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "LinkedIn HQ — Taha Anwar",
  description: "Your personal LinkedIn domination system",
  manifest: "/manifest.json",
  themeColor: "#fafbfc",
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
  //
  // 2026-07-09: revamped into a desktop-sized webapp -- /calendar is the real
  // landing page again (see app/page.tsx), with a persistent desktop sidebar
  // (Sidebar.tsx, lg+ only) for switching between Calendar/Lead Magnets/Post
  // Ideas. Below lg it degrades to just the page content, same as before.
  return (
    <html lang="en" className={`${inter.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="antialiased">
        <AppShell>
          <Sidebar />
          <main className="min-h-dvh flex-1 lg:min-w-0">{children}</main>
        </AppShell>
      </body>
    </html>
  );
}
