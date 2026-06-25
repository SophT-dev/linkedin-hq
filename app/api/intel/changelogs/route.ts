import { NextResponse } from "next/server";
import { fetchChangelogIntel } from "@/lib/changelogs";
import { appendIntel, karachiIso } from "@/lib/sheets";

// Free, zero-LLM source for the 🛠️ Tool Updates category. Fetches Google News
// RSS for the key outbound tools and appends as type 'tools'. Safe to call on a
// schedule or on demand — it never hits Claude, so it costs nothing.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

async function run() {
  const startedAt = karachiIso(new Date());
  try {
    const found = await fetchChangelogIntel();
    const items = found.map((c) => ({
      pulled_at: startedAt,
      posted_at: c.posted_at ? karachiIso(new Date(c.posted_at)) : "",
      type: "tools" as const,
      source: c.source,
      title: c.title,
      url: c.url,
      summary: c.summary,
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
