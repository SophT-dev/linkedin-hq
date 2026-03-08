import { NextRequest, NextResponse } from "next/server";
import { generateMorningBrief } from "@/lib/claude";
import { readSheet, getConfig } from "@/lib/sheets";

export async function GET(req: NextRequest) {
  try {
    const [creatorsRows, capturesRows, config] = await Promise.all([
      readSheet("Creators", "A:B"),
      readSheet("QuickCaptures", "A:C"),
      getConfig(),
    ]);

    const creators = creatorsRows.slice(1).map((r) => r[0]).filter(Boolean);
    const recentCaptures = capturesRows.slice(-10).map((r) => r[1]).filter(Boolean);

    const brief = await generateMorningBrief(creators, recentCaptures, config);
    return NextResponse.json({ brief });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to generate brief" }, { status: 500 });
  }
}
