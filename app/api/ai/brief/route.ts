import { NextResponse } from "next/server";
import { generateMorningBrief } from "@/lib/claude";
import { readSheet, getConfig } from "@/lib/sheets";

export async function GET() {
  // Fetch Sheets data but don't fail if unavailable
  let creators: string[] = [];
  let recentCaptures: string[] = [];
  let config: Record<string, string> = {};

  try {
    const [creatorsRows, capturesRows, cfg] = await Promise.all([
      readSheet("Creators", "A:B"),
      readSheet("QuickCaptures", "A:C"),
      getConfig(),
    ]);
    creators = creatorsRows.slice(1).map((r) => r[0]).filter(Boolean);
    recentCaptures = capturesRows.slice(-10).map((r) => r[1]).filter(Boolean);
    config = cfg;
  } catch (err) {
    console.warn("Sheets unavailable for brief, continuing without context:", err);
  }

  try {
    const brief = await generateMorningBrief(creators, recentCaptures, config);
    return NextResponse.json({ brief });
  } catch (err) {
    console.error("Claude API error:", err);
    return NextResponse.json({ error: "Failed to generate brief" }, { status: 500 });
  }
}
