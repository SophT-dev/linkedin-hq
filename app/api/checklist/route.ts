import { NextRequest, NextResponse } from "next/server";
import { readSheet, appendRow, updateRow } from "@/lib/sheets";
import { format } from "date-fns";

export async function GET() {
  try {
    const rows = await readSheet("DailyLog", "A:H");
    const today = format(new Date(), "yyyy-MM-dd");
    const todayRow = rows.find((r) => r[0] === today);
    const last30 = rows.slice(-31).slice(0, 30); // up to 30 days of history

    return NextResponse.json({
      today: todayRow || null,
      history: last30,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load checklist" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { checks } = body;
  // checks: { check_competitors, commented, connected, posted, logged_analytics, checked_reddit, knowledge_base }

  try {
    const rows = await readSheet("DailyLog", "A:H");
    const today = format(new Date(), "yyyy-MM-dd");
    const todayIdx = rows.findIndex((r) => r[0] === today);

    const total = Object.values(checks).filter(Boolean).length;
    const totalItems = Object.keys(checks).length;
    const pct = Math.round((total / totalItems) * 100);

    // Calculate streak
    let streak = 0;
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i][0] === today) continue;
      const rowPct = parseInt(rows[i][7] || "0");
      if (rowPct >= 80) streak++;
      else break;
    }

    const rowValues = [
      today,
      checks.check_competitors ? "TRUE" : "FALSE",
      checks.commented ? "TRUE" : "FALSE",
      checks.connected ? "TRUE" : "FALSE",
      checks.posted ? "TRUE" : "FALSE",
      checks.logged_analytics ? "TRUE" : "FALSE",
      checks.checked_reddit ? "TRUE" : "FALSE",
      pct.toString(),
    ];

    if (todayIdx >= 0) {
      await updateRow("DailyLog", todayIdx + 1, rowValues);
    } else {
      await appendRow("DailyLog", rowValues);
    }

    return NextResponse.json({ success: true, streak, pct });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to save checklist" }, { status: 500 });
  }
}
