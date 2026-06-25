import { NextResponse } from "next/server";
import { fetchIntelFromWeb } from "@/lib/claude";
import { fetchRedditIntel } from "@/lib/reddit";
import { appendIntel, IntelType, karachiIso } from "@/lib/sheets";

// Long-running: multiple sequential web search calls + reddit fetches
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET() {
  return runRefresh();
}
export async function POST() {
  return runRefresh();
}

async function runRefresh() {
  // Write pulled_at in Asia/Karachi local ISO (+05:00) so the sheet's
  // column A shows Taha's wall-clock day, not UTC.
  const startedAt = karachiIso(new Date());
  const errors: string[] = [];

  // Run Reddit (direct fetch) and Claude news scouts in parallel.
  const [redditResult, webResult] = await Promise.allSettled([
    fetchRedditIntel(),
    fetchIntelFromWeb(),
  ]);

  const items: Array<{
    pulled_at: string;
    posted_at: string;
    type: IntelType;
    source: string;
    title: string;
    url: string;
    summary: string;
    score: number;
  }> = [];
  let scoutDebug: Array<{ scout: string; ok: boolean; count: number; error?: string }> = [];
  let redditCount = 0;

  // posted_at from reddit/news scouts arrives as a UTC ISO string —
  // convert to Karachi local ISO before writing so column B shows the
  // post's date in PKT. Empty strings stay empty.
  const toKarachi = (raw: string): string =>
    raw ? karachiIso(new Date(raw)) : "";

  if (redditResult.status === "fulfilled") {
    redditCount = redditResult.value.length;
    for (const r of redditResult.value) {
      items.push({
        pulled_at: startedAt,
        posted_at: toKarachi(r.posted_at),
        type: "reddit",
        source: r.source,
        title: r.title,
        url: r.url,
        summary: r.summary,
        score: r.score,
      });
    }
  } else {
    errors.push(`reddit: ${redditResult.reason}`);
  }

  if (webResult.status === "fulfilled") {
    scoutDebug = webResult.value.debug;
    for (const w of webResult.value.items) {
      items.push({
        pulled_at: startedAt,
        posted_at: toKarachi(w.posted_at),
        type: w.type as IntelType,
        source: w.source,
        title: w.title,
        url: w.url,
        summary: w.summary,
        score: 0,
      });
    }
  } else {
    errors.push(`web: ${webResult.reason}`);
  }

  for (const d of scoutDebug) {
    if (!d.ok && d.error) errors.push(`${d.scout}: ${d.error}`);
  }

  let ingested = 0;
  let skipped = 0;
  if (items.length > 0) {
    try {
      const result = await appendIntel(items);
      ingested = result.ingested;
      skipped = result.skipped;
    } catch (e) {
      errors.push(`appendIntel: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json({
    ok: errors.length === 0 && items.length > 0,
    startedAt,
    finishedAt: new Date().toISOString(),
    fetched: items.length,
    redditCount,
    newsCount: items.length - redditCount,
    ingested,
    skipped,
    scoutDebug,
    errors,
  });
}
