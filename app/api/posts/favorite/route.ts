import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { readSheet, appendRow } from "@/lib/sheets";

export const dynamic = "force-dynamic";

// /api/posts/favorite — the ⭐ "star this post" endpoint for the Chrome
// extension. Sophiya browses LinkedIn (on Taha's account); when she sees a post
// whose format is working she clicks the star and it's captured here as a
// starred Template Library row (engagement_tier=manual-add so a corpus rebuild
// never wipes it, exactly like scripts/add-template-library-entry.mjs). If the
// post carries a "comment KEYWORD" lead-magnet gate, we ALSO log a LeadMagnets
// row (kind=received, status=queued) so the next /lm-intake run chases it.
//
// POST (token-protected, same x-sync-token as /api/linkedin/sync):
//   body: { postUrl, authorName, authorProfileUrl, text, hook,
//           likes, comments, mediaUrls[], timestamp }
//   Dedupes by postUrl against the Template Library `url` column.
// GET: { urls: string[] } — Template Library rows where starred=TRUE, so the
//   extension can render already-starred posts filled without hammering us.

const TEMPLATE_TAB = "Template Library";
const LEAD_MAGNETS_TAB = "LeadMagnets";

// Fixed column order for a Template Library row (matches
// scripts/add-template-library-entry.mjs + build-template-library.mjs):
//   hook | suggested_format | expert | domain | likes | comments | shares |
//   comment_to_like_ratio | engagement_tier | url | date_added | starred
const TL_COLS = [
  "hook", "suggested_format", "expert", "domain", "likes", "comments",
  "shares", "comment_to_like_ratio", "engagement_tier", "url", "date_added", "starred",
];

// Resolve a column index by header name, falling back to the fixed position.
function tlIndex(headers: string[], name: string): number {
  const byName = headers.findIndex((h) => String(h || "").trim() === name);
  return byName !== -1 ? byName : TL_COLS.indexOf(name);
}

function firstLine(text: string, max: number): string {
  const line = (text || "").split(/\r?\n/).map((s) => s.trim()).find((s) => s.length > 0) || "";
  return line.slice(0, max);
}

// "comment WORD below" style lead-magnet gate → captured keyword (uppercased).
function detectCtaKeyword(text: string): string | null {
  const m = (text || "").match(/comment[\s"“”'`]+([A-Za-z]{2,15})/i);
  return m ? m[1].toUpperCase() : null;
}

function numOrBlank(v: unknown): number | "" {
  if (v == null || v === "") return "";
  const n = typeof v === "string" ? parseInt(v.replace(/[^\d]/g, ""), 10) : Number(v);
  return Number.isFinite(n) ? (n as number) : "";
}

export async function GET() {
  try {
    const rows = await readSheet(TEMPLATE_TAB, "A:AZ");
    const headers = (rows[0] || []).map((h) => String(h || "").trim());
    const urlCol = tlIndex(headers, "url");
    const starredCol = tlIndex(headers, "starred");
    const urls: string[] = [];
    for (const r of rows.slice(1)) {
      const starred = String(r[starredCol] || "").trim().toUpperCase();
      const url = String(r[urlCol] || "").trim();
      if (url && (starred === "TRUE" || starred === "YES" || starred === "1")) urls.push(url);
    }
    return NextResponse.json({ ok: true, urls });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e), urls: [] }, { status: 500 });
  }
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

    const body = (await req.json()) as {
      postUrl?: string;
      authorName?: string;
      authorProfileUrl?: string;
      text?: string;
      hook?: string;
      likes?: unknown;
      comments?: unknown;
      mediaUrls?: string[];
      timestamp?: string;
    };

    const postUrl = String(body.postUrl || "").trim();
    if (!postUrl) {
      return NextResponse.json({ ok: false, error: "postUrl required" }, { status: 400 });
    }

    const text = String(body.text || "");
    const hook = firstLine(body.hook || text, 200);
    const authorName = String(body.authorName || "").trim();
    const likes = numOrBlank(body.likes);
    const comments = numOrBlank(body.comments);

    // ---- Dedupe against the Template Library `url` column --------------------
    const tlRows = await readSheet(TEMPLATE_TAB, "A:AZ");
    const tlHeaders = (tlRows[0] || []).map((h) => String(h || "").trim());
    const urlCol = tlIndex(tlHeaders, "url");
    const alreadyStarred = tlRows.slice(1).some((r) => String(r[urlCol] || "").trim() === postUrl);
    if (alreadyStarred) {
      return NextResponse.json({ ok: true, dedup: true });
    }

    // ---- Append the Template Library row ------------------------------------
    // Fixed positional order (add-template-library-entry.mjs). The ratio is a
    // live Sheets formula pointing at THIS row's likes/comments cells (E/F).
    const nextRow = tlRows.length + 1; // header + existing data rows, +1 = the appended row
    const likesVal = likes === "" ? 0 : likes;
    const commentsVal = comments === "" ? 0 : comments;
    const today = new Date().toISOString().slice(0, 10);
    const tlRow: (string | number)[] = [
      hook,                                            // hook
      "",                                              // suggested_format (blank = needs /lm-intake enrichment)
      authorName,                                      // expert
      "",                                              // domain
      likesVal,                                        // likes
      commentsVal,                                     // comments
      "",                                              // shares
      `=IF(E${nextRow}=0,0,F${nextRow}/E${nextRow})`,  // comment_to_like_ratio
      "manual-add",                                    // engagement_tier (survives corpus rebuilds)
      postUrl,                                         // url
      today,                                           // date_added
      "TRUE",                                          // starred
    ];
    await appendRow(TEMPLATE_TAB, tlRow);

    // ---- If the post gates a lead magnet, log a LeadMagnets row -------------
    // Written BY HEADER NAME (LeadMagnets is header-indexed, columns freely
    // reorder). New columns cta_keyword/post_likes/post_comments/
    // source_person_url are being added by another agent — set() only writes a
    // field whose header actually exists, so a missing one degrades silently.
    let leadMagnetLogged = false;
    const ctaKeyword = detectCtaKeyword(text);
    if (ctaKeyword) {
      const lmAll = await readSheet(LEAD_MAGNETS_TAB, "A:AZ");
      const lmHeaders = (lmAll[0] || []).map((h) => String(h || "").trim());
      if (lmHeaders.length) {
        const idx: Record<string, number> = {};
        lmHeaders.forEach((h, i) => { if (h && idx[h] === undefined) idx[h] = i; });
        const row: (string | number)[] = new Array(lmHeaders.length).fill("");
        const set = (k: string, v: string | number) => { const i = idx[k]; if (i !== undefined) row[i] = v; };
        set("id", nanoid(10));
        set("kind", "received");
        set("status", "queued");
        set("title", `starred: ${firstLine(text, 60)}`);
        set("source_person", authorName);
        set("source_person_url", String(body.authorProfileUrl || "").trim());
        set("source_post_url", postUrl);
        set("cta_keyword", ctaKeyword);
        set("post_likes", likesVal);
        set("post_comments", commentsVal);
        set("created_at", new Date().toISOString());
        await appendRow(LEAD_MAGNETS_TAB, row);
        leadMagnetLogged = true;
      }
    }

    return NextResponse.json({ ok: true, dedup: false, leadMagnetLogged, ctaKeyword: ctaKeyword || null });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
