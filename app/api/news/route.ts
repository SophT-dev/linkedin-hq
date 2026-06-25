import { NextResponse } from "next/server";
import { loadIntel } from "@/lib/sheets";

export const dynamic = "force-dynamic";

// Show only genuinely recent posts (by when they were POSTED, not when we
// pulled them) and cap the payload so the phone loads fast even when the sheet
// holds thousands of scraped rows.
const POST_MAX_AGE_DAYS = 21;
const MAX_ITEMS = 200;

// Cosmetic: older scrapes stored truncated/slug source names. Correct them for
// display. (The scraper now stores proper names going forward.)
const NAME_FIX: Record<string, string> = {
  Outboundphd: "Eric Nowoslawski",
  Nick: "Nick Abraham",
  Michel: "Michel Lieben",
  Richard: "Richard Illingworth",
  Charlestenot: "Charles Tenot",
  Atishay: "Atishay (Hyperke)",
  "Nikita Maildoso": "Nikita (Maildoso)",
};

export async function GET() {
  try {
    const all = await loadIntel({ sinceDays: 90 });
    const age = (it: { posted_at: string; pulled_at: string }) =>
      Date.parse(it.posted_at) || Date.parse(it.pulled_at) || 0;
    // YouTube channels post less often, so allow older videos than text posts.
    const maxAgeDays = (it: { type: string }) =>
      it.type === "youtube" ? 75 : POST_MAX_AGE_DAYS;
    const fresh = (it: { type: string; posted_at: string; pulled_at: string }) =>
      age(it) >= Date.now() - maxAgeDays(it) * 24 * 60 * 60 * 1000;

    const items = all
      .filter(fresh)
      .sort((a, b) => age(b) - age(a))
      .slice(0, MAX_ITEMS)
      .map((it) => ({ ...it, source: NAME_FIX[it.source] || it.source }));

    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json(
      { items: [], error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
