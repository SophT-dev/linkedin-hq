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

// POST /api/comments/suggest-from-url
//
// The rock-solid fallback to the OCR path (see IPHONE-COMMENT-SHORTCUT-PLAN.md):
// when OCR is too noisy or the post is collapsed behind "…more", share the post
// URL instead. LinkedIn server-renders the FULL, clean post body into the page's
// JSON-LD (`articleBody`) even for a logged-out viewer — the same public-fetch
// trick scripts/capture-connects.mjs uses for commenter names, no login/Apify.
// We fetch the page with a browser User-Agent, pull `articleBody` (and the
// author's name as a nicety), and run the identical 3-mode insight-voice
// pipeline as /api/comments/suggest. If the fetch is blocked or no articleBody
// is present, we return a clear error — never fabricated text.
//
// Request body:  { "postUrl": string, "creatorName"?: string }
// Response:      { "suggestions": [{ "text": string, "style": string }] }
//
// Auth: same shared secret in the `x-suggest-token` header as /suggest.

interface SuggestFromUrlBody {
  postUrl?: string;
  creatorName?: string;
}

// Browser-like User-Agent — LinkedIn serves the public server-rendered page
// (with JSON-LD) to real browsers; a bare fetch UA gets a login wall.
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function isLinkedInUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return (
      (u.protocol === "http:" || u.protocol === "https:") &&
      /(^|\.)linkedin\.com$/i.test(u.hostname)
    );
  } catch {
    return false;
  }
}

// Walks a parsed JSON-LD value (object, array, or @graph container) and returns
// the first node that carries an `articleBody`. Returns null if none is found.
function findArticleNode(node: unknown): Record<string, unknown> | null {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const hit = findArticleNode(item);
      if (hit) return hit;
    }
    return null;
  }
  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    if (typeof obj.articleBody === "string" && obj.articleBody.trim()) {
      return obj;
    }
    if (obj["@graph"]) {
      const hit = findArticleNode(obj["@graph"]);
      if (hit) return hit;
    }
  }
  return null;
}

// Pulls an author display name off a JSON-LD article node, handling the author
// being a single object or an array of them. Returns null if absent.
function extractAuthorName(node: Record<string, unknown>): string | null {
  const author = node.author;
  if (!author) return null;
  const first = Array.isArray(author) ? author[0] : author;
  if (first && typeof first === "object") {
    const name = (first as Record<string, unknown>).name;
    if (typeof name === "string" && name.trim()) return name.trim();
  }
  return null;
}

// Parses every <script type="application/ld+json"> block out of the page HTML
// and returns the first article node (with its articleBody + author).
function extractArticleFromHtml(html: string): {
  articleBody: string;
  authorName: string | null;
} | null {
  const scripts = [
    ...html.matchAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    ),
  ];
  for (const [, jsonText] of scripts) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText.trim());
    } catch {
      continue; // malformed block — skip, try the next one
    }
    const node = findArticleNode(parsed);
    if (node) {
      return {
        articleBody: (node.articleBody as string).trim(),
        authorName: extractAuthorName(node),
      };
    }
  }
  return null;
}

export async function POST(req: Request) {
  // Shared-secret gate (env value preferred, baked fallback otherwise).
  const expected = process.env.SUGGEST_TOKEN || DEFAULT_SUGGEST_TOKEN;
  const got = req.headers.get("x-suggest-token");
  if (got !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: SuggestFromUrlBody;
  try {
    body = (await req.json()) as SuggestFromUrlBody;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const postUrl = (body.postUrl || "").trim();
  if (!postUrl || !isLinkedInUrl(postUrl)) {
    return NextResponse.json(
      { error: "postUrl is required and must be a linkedin.com URL" },
      { status: 400 }
    );
  }

  // Logged-out public fetch of the post page (browser UA, same trick as
  // scripts/capture-connects.mjs). Any network/HTTP failure is a real block,
  // not something to paper over — return a clear non-200.
  let html: string;
  try {
    const res = await fetch(postUrl, { headers: { "User-Agent": BROWSER_UA } });
    if (!res.ok) {
      return NextResponse.json(
        { error: `could not fetch post text (LinkedIn returned ${res.status})` },
        { status: 502 }
      );
    }
    html = await res.text();
  } catch {
    return NextResponse.json(
      { error: "could not fetch post text (network error)" },
      { status: 502 }
    );
  }

  const article = extractArticleFromHtml(html);
  if (!article || article.articleBody.length < 15) {
    return NextResponse.json(
      { error: "could not fetch post text (no articleBody in page)" },
      { status: 502 }
    );
  }

  // creatorName from the request wins; otherwise fall back to the JSON-LD
  // author, then the same default as /suggest.
  const creatorName = (
    body.creatorName ||
    article.authorName ||
    "the author"
  ).slice(0, 80);

  const post = {
    url: postUrl,
    text: article.articleBody,
    creator_name: creatorName,
  };

  // Identical 3-mode pipeline to /api/comments/suggest.
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
