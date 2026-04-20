import { NextRequest, NextResponse } from "next/server";
import { appendIntel, IntelType, karachiIso } from "@/lib/sheets";
import { isIntelRelevant } from "@/lib/intel-filter";

export const dynamic = "force-dynamic";

// POST /api/intel/ingest
// Called by the n8n LinkedIn creator pipeline (and any other future external
// scraper). Protected by a shared secret header x-ingest-token.
//
// body: {
//   items: [{
//     creator_url: string,
//     creator_name: string,
//     posted_at?: string,  // ISO
//     url: string,
//     text: string,
//     reactions?: number,
//     comments?: number,
//     type?: "linkedin" | "reddit" | "news"
//   }]
// }
//
// returns: { ingested, skipped, filtered, new_urls }
//   ingested: rows actually written
//   skipped:  dupes caught by appendIntel URL dedup
//   filtered: items dropped by the relevance keyword gate
//   new_urls: URLs of the fresh rows (passed to /api/comments/plan as
//             only_urls so we only comment on posts from THIS run, never
//             old ones stranded in Intel from prior scrapes)

interface IncomingItem {
  creator_url?: string;
  creator_name?: string;
  posted_at?: string;
  url?: string;
  text?: string;
  reactions?: number;
  comments?: number;
  type?: IntelType;
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("x-ingest-token");
    const expected = process.env.INTEL_INGEST_TOKEN;
    if (!expected) {
      return NextResponse.json(
        { ok: false, error: "INTEL_INGEST_TOKEN not configured on server" },
        { status: 500 }
      );
    }
    if (token !== expected) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as { items?: IncomingItem[] };
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      return NextResponse.json({
        ok: true,
        ingested: 0,
        skipped: 0,
        filtered: 0,
        new_urls: [],
      });
    }

    // pulled_at is written in Asia/Karachi local time (ISO with +05:00
    // offset) so the sheet displays Taha's actual wall-clock day. Still
    // ISO-parseable by Date.parse() for sorting and time-window filters.
    const pulledAt = karachiIso(new Date());

    // Map incoming LinkedIn-shaped items into the IntelRow contract.
    const mapped = items
      .filter((it) => it.url && it.text)
      .map((it) => {
        const title = (it.text || "").slice(0, 80);
        // Keep the full post body (LinkedIn caps posts at ~3000 chars, so
        // 3000 captures everything). The auto-comment generator needs to
        // see trigger words like "Comment GEM" which are almost always at
        // the END of the post, far past the old 500-char cutoff.
        const summary = (it.text || "").slice(0, 3000);
        const score =
          (typeof it.reactions === "number" ? it.reactions : 0) +
          (typeof it.comments === "number" ? it.comments : 0) * 2;
        // Apify returns posted_at as a UTC ISO string. Convert to Karachi
        // local ISO so the sheet shows the post's date in Taha's timezone.
        const rawPostedAt = it.posted_at || "";
        const postedAtKarachi = rawPostedAt
          ? karachiIso(new Date(rawPostedAt))
          : "";
        return {
          pulled_at: pulledAt,
          posted_at: postedAtKarachi,
          type: (it.type || "linkedin") as IntelType,
          source: it.creator_name || "linkedin",
          title,
          url: it.url!,
          summary,
          score,
        };
      });

    // Relevance gate. LinkedIn creator posts skip the keyword filter —
    // those creators were hand-picked in the Config tab so we trust the
    // curation. Reddit/news items still get filtered by keyword.
    const relevant = mapped.filter(
      (m) => m.type === "linkedin" || isIntelRelevant(m.title, m.summary)
    );
    const filtered = mapped.length - relevant.length;

    const result = await appendIntel(relevant);

    return NextResponse.json({
      ok: true,
      ingested: result.ingested,
      skipped: result.skipped,
      filtered,
      new_urls: result.new_urls,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
