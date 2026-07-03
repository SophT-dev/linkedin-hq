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
    const cutoff = Date.now() - POST_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

    // YouTube = the latest few videos per followed channel (channels post
    // rarely), so include ALL of them, outside the recency cap that the
    // high-volume text posts use.
    const yt = all
      .filter((it) => it.type === "youtube")
      .sort((a, b) => age(b) - age(a));

    // Reddit/news/tools are low-volume by design (a handful of items per
    // Refresh tap, hard relevance-gated). LinkedIn creator scraping produces
    // far more volume, so sorting everything together into one MAX_ITEMS
    // slice let LinkedIn silently crowd Reddit/news out of the feed entirely.
    // Give the low-volume sources their own reserved bucket, same pattern as
    // YouTube above, and only cap LinkedIn.
    const lowVolume = all
      .filter((it) => it.type !== "youtube" && it.type !== "linkedin" && age(it) >= cutoff)
      .sort((a, b) => age(b) - age(a));
    const linkedin = all
      .filter((it) => it.type === "linkedin" && age(it) >= cutoff)
      .sort((a, b) => age(b) - age(a))
      .slice(0, MAX_ITEMS);

    const items = [...lowVolume, ...linkedin, ...yt].map((it) => ({
      ...it,
      source: NAME_FIX[it.source] || it.source,
    }));

    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json(
      { items: [], error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
