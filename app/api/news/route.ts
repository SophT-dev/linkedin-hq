import { NextResponse } from "next/server";
import { loadIntel } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await loadIntel({ sinceDays: 14 });
    // Newest first
    items.sort((a, b) => {
      const ta = Date.parse(a.pulled_at) || 0;
      const tb = Date.parse(b.pulled_at) || 0;
      return tb - ta;
    });
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json(
      { items: [], error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
