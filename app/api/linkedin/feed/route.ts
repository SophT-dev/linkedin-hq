import { NextRequest, NextResponse } from "next/server";
import { appendIntel, karachiIso, IntelType } from "@/lib/sheets";

export const dynamic = "force-dynamic";

// POST /api/linkedin/feed — the FREE creator-feed ingest (Phase 2 of the live
// sync). The Chrome extension harvests recent posts from your own LinkedIn feed
// (DOM, read-only, in your browser) and POSTs them here; we append them to the
// Intel tab so the /engagement page can surface them. Replaces the paid Apify
// creator scraper — zero API credits.
//
// Token-protected with the same LINKEDIN_SYNC_TOKEN as /api/linkedin/sync.
// body: { items: [{ url, author, text, minutesAgo?, reactions?, comments?, image_url? }] }

interface FeedItem {
  url?: string;
  author?: string;
  text?: string;
  minutesAgo?: number;
  reactions?: number;
  comments?: number;
  image_url?: string;
}

export async function POST(req: NextRequest) {
  try {
    const expected = process.env.LINKEDIN_SYNC_TOKEN;
    if (!expected) {
      return NextResponse.json({ ok: false, error: "LINKEDIN_SYNC_TOKEN not configured on server" }, { status: 500 });
    }
    if (req.headers.get("x-sync-token") !== expected) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as { items?: FeedItem[] };
    const items = Array.isArray(body.items) ? body.items : [];
    const now = Date.now();
    const pulledAt = karachiIso(new Date());

    const mapped = items
      .filter((it) => it.url && it.text && it.text.trim().length >= 15)
      .map((it) => {
        const mins = typeof it.minutesAgo === "number" && it.minutesAgo >= 0 ? it.minutesAgo : 0;
        const reactions = Number(it.reactions) || 0;
        const comments = Number(it.comments) || 0;
        return {
          pulled_at: pulledAt,
          posted_at: karachiIso(new Date(now - mins * 60_000)),
          type: "linkedin" as IntelType,
          source: it.author || "linkedin",
          title: (it.text || "").slice(0, 80),
          url: it.url!,
          summary: (it.text || "").slice(0, 3000),
          score: reactions + comments * 2,
          image_url: it.image_url || "",
        };
      });

    // Creator posts are trusted (they're from the user's own feed), so no
    // keyword relevance gate — appendIntel still dedups by URL.
    const result = await appendIntel(mapped);

    return NextResponse.json({
      ok: true,
      ingested: result.ingested,
      skipped: result.skipped,
      new_urls: result.new_urls,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
