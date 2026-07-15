import { redirect } from "next/navigation";

export default function Home() {
  // Dashboard is the main landing page (2026-07-15) — greeting + profile stats +
  // Taha's public-profile snapshot. (Was /calendar; the iPhone home-screen PWA
  // was opening straight to the calendar, which isn't the home view.)
  redirect("/dashboard");
}
