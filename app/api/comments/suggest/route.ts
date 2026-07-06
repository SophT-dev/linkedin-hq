import { NextResponse } from "next/server";
import {
  generateExpertComment,
  qualityGateComment,
  pickStylePreset,
  StylePreset,
} from "@/lib/comments";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Fallback shared secret, matched against the extension's baked token. Used when
// the SUGGEST_TOKEN env var isn't set in Vercel — so the endpoint is protected
// out of the box (not an open Haiku faucet) without needing a dashboard change.
// Override anytime by setting SUGGEST_TOKEN in Vercel env, then rotate this.
const DEFAULT_SUGGEST_TOKEN = "3088768ac5a002b7e72a6955a52fa07c1d5704addc143516";

// POST /api/comments/suggest
//
// The brain behind the inline comment-suggestion browser extension (MVP A).
// Given the text of a LinkedIn post you're looking at, returns up to 3 ready
// comments in Taha's voice. Suggest-only: nothing is posted, the human inserts
// + edits + sends. Reuses the existing voice engine in lib/comments.ts — no
// Sheet writes, no Slack, no side effects.
//
// Request body:  { "postText": string, "creatorName"?: string }
// Response:      { "suggestions": [{ "text": string, "style": string }] }
//
// Auth: a shared secret in the `x-suggest-token` header, compared against
// SUGGEST_TOKEN env. Keeps the endpoint from being a free public comment API.
// If SUGGEST_TOKEN is unset (local dev), auth is skipped.

interface SuggestBody {
  postText?: string;
  creatorName?: string;
}

export async function POST(req: Request) {
  // Shared-secret gate (env value preferred, baked fallback otherwise).
  const expected = process.env.SUGGEST_TOKEN || DEFAULT_SUGGEST_TOKEN;
  const got = req.headers.get("x-suggest-token");
  if (got !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: SuggestBody;
  try {
    body = (await req.json()) as SuggestBody;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const postText = (body.postText || "").trim();
  if (postText.length < 5) {
    return NextResponse.json(
      { error: "postText is required (min 5 chars)" },
      { status: 400 }
    );
  }
  const creatorName = (body.creatorName || "the author").slice(0, 80);

  // Build a varied set of styles: whatever the heuristic picks for THIS post
  // first (most-fitting), then two distinct fallbacks so the three options
  // feel different (an insight, a witty take, a curious follow-up). Lead-magnet
  // posts are special-cased — if that's the pick, keep it first so the trigger
  // word lands.
  const primary = pickStylePreset(postText);
  const pool: StylePreset[] = [
    primary,
    "agree_add",
    "agree_witty",
    "agree_curious",
  ];
  const styles: StylePreset[] = [];
  for (const s of pool) {
    if (!styles.includes(s)) styles.push(s);
    if (styles.length === 3) break;
  }

  const post = {
    url: "",
    text: postText,
    creator_name: creatorName,
  };

  // Generate the three in parallel; one emoji slot allowed (the first).
  const settled = await Promise.allSettled(
    styles.map((style, i) =>
      generateExpertComment(post, {
        forcePreset: style,
        allowEmoji: i === 0,
      })
    )
  );

  const suggestions = settled
    .filter(
      (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof generateExpertComment>>> =>
        r.status === "fulfilled"
    )
    .map((r) => r.value)
    .filter((g) => qualityGateComment(g.comment_text).ok)
    .map((g) => ({ text: g.comment_text, style: g.style_preset }));

  return NextResponse.json({ suggestions });
}
