import { NextResponse } from "next/server";
import { fetchYouTubeIntel } from "@/lib/youtube";
import { appendIntel, karachiIso } from "@/lib/sheets";

// Free, zero-LLM source for the ▶️ YouTube category. Reads the curated channels'
// public RSS feeds and appends new videos as type 'youtube'. Costs nothing.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

async function run() {
  const startedAt = karachiIso(new Date());
  try {
    const found = await fetchYouTubeIntel();
    const items = found.map((v) => ({
      pulled_at: startedAt,
      posted_at: v.posted_at ? karachiIso(new Date(v.posted_at)) : "",
      type: "youtube" as const,
      source: v.source,
      title: v.title,
      url: v.url,
      summary: v.summary,
      score: 0,
    }));
    const { ingested, skipped } = items.length
      ? await appendIntel(items)
      : { ingested: 0, skipped: 0 };
    return NextResponse.json({ ok: true, fetched: items.length, ingested, skipped });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return run();
}
export async function POST() {
  return run();
}
