import { NextResponse } from "next/server";
import { getDailyReport, listReportDates } from "@/lib/sheets";

export const dynamic = "force-dynamic";

function todayKarachi(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// GET /api/report?date=YYYY-MM-DD
// Returns the stored report for a day + the list of days that have a report.
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const dates = await listReportDates();
    const date = url.searchParams.get("date") || dates[0] || todayKarachi();
    const report = await getDailyReport(date);
    return NextResponse.json({ date, dates, report });
  } catch (e) {
    return NextResponse.json(
      { date: null, dates: [], report: null, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
