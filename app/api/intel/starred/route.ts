import { NextResponse } from "next/server";
import { loadStarredIntel } from "@/lib/sheets";

export const dynamic = "force-dynamic";

// Thin proxy for the linkedin-batch skill. Returns only rows the user starred
// in /news (that's the signal that an intel item is worth building a post on).
export async function GET() {
  try {
    const rows = await loadStarredIntel();
    return NextResponse.json({ ok: true, count: rows.length, rows });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
