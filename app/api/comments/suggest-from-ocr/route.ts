import { NextResponse } from "next/server";
import {
  generateInsightComment,
  qualityGateInsightComment,
  InsightMode,
} from "@/lib/comments";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Fallback shared secret, matched against the extension's baked token. Used when
// the SUGGEST_TOKEN env var isn't set in Vercel — so the endpoint is protected
// out of the box (not an open Haiku faucet) without needing a dashboard change.
// Override anytime by setting SUGGEST_TOKEN in Vercel env, then rotate this.
// Kept identical to /api/comments/suggest so the same iPhone Shortcut token works.
const DEFAULT_SUGGEST_TOKEN = "3088768ac5a002b7e72a6955a52fa07c1d5704addc143516";

// POST /api/comments/suggest-from-ocr
//
// The OCR-noise-tolerant sibling of /api/comments/suggest, built for the iPhone
// AssistiveTouch/Back-Tap Shortcut (see IPHONE-COMMENT-SHORTCUT-PLAN.md). iOS's
// on-device OCR of a LinkedIn post screenshot captures the whole card — not just
// the post, but the author header, the timestamp, the reaction/comment counts,
// the Like·Comment·Repost·Send bar, "…more", and even the top of the comments
// below it. Feeding that raw into the generator pollutes the prompt. This route
// strips the known LinkedIn UI chrome line-by-line FIRST, then runs the identical
// 3-mode insight-voice pipeline as /api/comments/suggest on the cleaned body.
//
// Request body:  { "ocrText": string, "creatorName"?: string }
// Response:      { "suggestions": [{ "text": string, "style": string }] }
//
// Auth: same shared secret in the `x-suggest-token` header as /suggest.

interface SuggestFromOcrBody {
  ocrText?: string;
  creatorName?: string;
}

// ---------------------------------------------------------------------------
// stripLinkedInChrome — turn a raw iOS-OCR dump of a LinkedIn post screenshot
// into just the post body text.
//
// Strategy (conservative, line-based — a false-strip of a real sentence is worse
// than leaving one noise line, so every heuristic errs toward KEEPING content):
//   1. Split into trimmed, non-empty lines.
//   2. HEADER cut: the post is always preceded by the author's name, their
//      headline, a "• 1st/2nd/3rd" degree badge, and a relative timestamp. If a
//      degree badge or timestamp shows up in the first few lines, drop everything
//      up to and including it — that removes the name + headline block too.
//   3. FOOTER cut: the post body ends at the first strong end-of-post signal
//      (the "…more" truncation link, a "Like/Comment/Repost/Send" action-bar
//      word, or a reaction/comment count). Everything after that is engagement
//      chrome and other people's comments — drop it.
//   4. Defensive per-line drop: remove any stray chrome line that survived inside
//      the kept range (Follow, "Add a comment…", nav labels, etc.).
//   5. Collapse back to a single string.
// ---------------------------------------------------------------------------

// Header markers: a degree badge or a relative timestamp. Seeing one of these in
// the first several lines means the real post body begins on the NEXT line.
const HEADER_MARKERS: RegExp[] = [
  // "• 1st", "1st", "2nd degree", "3rd" — the connection-degree badge
  /^[•·・|]?\s*(1st|2nd|3rd)(\s*degree)?(\s*connection)?$/i,
  // Relative timestamp lines: "2d", "1h", "3w", "5mo", "2d • Edited",
  // "1 week ago", "Edited • 4h"
  /^(edited\s*[•·・|]?\s*)?\d+\s*(s|m|h|d|w|mo|y|min|mins|hr|hrs|hour|hours|day|days|week|weeks|month|months|year|years)(\s*ago)?(\s*[•·・|]?\s*edited)?$/i,
  // Timestamp joined to a separator: "2d •", "1h • Edited"
  /^\d+\s*(s|m|h|d|w|mo|y)\s*[•·・|].*$/i,
];

// Footer boundaries: the first line matching one of these ends the post body.
// Only STRONG signals here so a plain numeric line inside the post (e.g. a list
// item "3") can't prematurely cut the body — a bare count needs a thousands
// separator or an engagement noun to qualify.
const FOOTER_BOUNDARIES: RegExp[] = [
  /^(like|comment|repost|send)$/i, // the action bar
  /^…\s*more$/i, // "…more"
  /^\.\.\.\s*more$/i, // "...more"
  /^see more$/i,
  /^[\d,]+\s*(reactions?|likes?)$/i, // "1,234 reactions"
  /^[\d,]+\s*(comments?|reposts?|shares?)(\s*[·•|].*)?$/i, // "45 comments · 12 reposts"
  /^\d{1,3}(,\d{3})+$/, // "1,234" alone (thousands separator = a like count)
];

// Defensive per-line chrome: dropped anywhere inside the kept body range.
const LINE_CHROME: RegExp[] = [
  /^\+?\s*follow$/i,
  /^following$/i,
  /^connect$/i,
  /^message$/i,
  /^\+\s*connect$/i,
  /^[•·・|]?\s*(1st|2nd|3rd)(\s*degree)?(\s*connection)?$/i,
  /^edited$/i,
  /^(like|comment|repost|send|share|save|report)$/i,
  /^…\s*more$/i,
  /^\.\.\.\s*more$/i,
  /^see more$/i,
  /^activate to view larger image$/i,
  /^add a comment.*$/i,
  /^(home|my network|jobs|messaging|notifications)$/i,
  /^[\d,]+\s*(comments?|reposts?|shares?|reactions?|likes?)$/i,
  /^and \d+ others?$/i,
];

function matchesAny(line: string, patterns: RegExp[]): boolean {
  return patterns.some((re) => re.test(line));
}

export function stripLinkedInChrome(raw: string): string {
  const lines = (raw || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return "";

  // 1) HEADER cut — look only in the first 6 lines for a degree badge or a
  //    timestamp. If found, the body starts right after it (this also discards
  //    the author name + headline sitting above the marker). If no marker shows
  //    up early, we keep everything from the top (nothing confidently chrome).
  let bodyStart = 0;
  const headerScanLimit = Math.min(lines.length, 6);
  for (let i = 0; i < headerScanLimit; i++) {
    if (matchesAny(lines[i], HEADER_MARKERS)) {
      bodyStart = i + 1;
    }
  }

  // 2) FOOTER cut — from bodyStart onward, the first strong end-of-post signal
  //    marks where engagement chrome + other commenters begin. Everything from
  //    there down is dropped.
  let bodyEnd = lines.length;
  for (let i = bodyStart; i < lines.length; i++) {
    if (matchesAny(lines[i], FOOTER_BOUNDARIES)) {
      bodyEnd = i;
      break;
    }
  }

  // 3) Keep the body slice, then defensively drop any stray chrome line still
  //    inside it.
  const body = lines
    .slice(bodyStart, bodyEnd)
    .filter((l) => !matchesAny(l, LINE_CHROME));

  return body.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export async function POST(req: Request) {
  // Shared-secret gate (env value preferred, baked fallback otherwise).
  const expected = process.env.SUGGEST_TOKEN || DEFAULT_SUGGEST_TOKEN;
  const got = req.headers.get("x-suggest-token");
  if (got !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: SuggestFromOcrBody;
  try {
    body = (await req.json()) as SuggestFromOcrBody;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  // Strip the LinkedIn UI noise before anything else, then require enough real
  // text to be worth generating on (mirrors /suggest's min-length guard).
  const postText = stripLinkedInChrome(body.ocrText || "");
  if (postText.length < 15) {
    return NextResponse.json(
      {
        error:
          "ocrText is required (needs ≥15 chars of real post text after stripping LinkedIn UI)",
      },
      { status: 400 }
    );
  }
  const creatorName = (body.creatorName || "the author").slice(0, 80);

  const post = {
    url: "",
    text: postText,
    creator_name: creatorName,
  };

  // Identical 3-mode pipeline to /api/comments/suggest: three genuinely
  // different jobs, one alive voice, generated in parallel. Skips (post too
  // thin) and quality-gate failures are dropped.
  const modes: InsightMode[] = ["educational", "witty", "question"];
  const settled = await Promise.allSettled(
    modes.map((mode) => generateInsightComment(post, { mode }))
  );

  const suggestions = settled
    .filter(
      (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof generateInsightComment>>> =>
        r.status === "fulfilled"
    )
    .map((r) => r.value)
    .filter((g) => !g.skip && qualityGateInsightComment(g.comment_text).ok)
    .map((g) => ({ text: g.comment_text, style: g.mode ?? "insight" }));

  return NextResponse.json({ suggestions });
}
