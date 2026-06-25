import { NextResponse } from "next/server";
import { loadIntel, saveDailyReport } from "@/lib/sheets";
import { generateDailyReport } from "@/lib/report";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function todayKarachi(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// POST /api/report/generate?date=YYYY-MM-DD
// Builds (and stores) the at-a-glance report for one day from that day's intel.
// One cheap Haiku call. Called on demand when a day has no report yet.
export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const date = url.searchParams.get("date") || todayKarachi();

    const all = await loadIntel({ sinceDays: 60 });
    const onDay = all.filter(
      (it) => (it.posted_at || it.pulled_at || "").slice(0, 10) === date
    );

    const dateLabel = new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

    const report_md = await generateDailyReport(dateLabel, onDay);
    await saveDailyReport(date, report_md);
    return NextResponse.json({ date, report_md, count: onDay.length });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
