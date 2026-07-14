import { NextResponse } from "next/server";
import {
  generateSophiyaComment,
  qualityGateSophiyaComment,
} from "@/lib/comments";
import { sendReviewMessage } from "@/lib/slack";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// POST /api/comments/sophiya-review
//
// Manual, ad-hoc entry point (2026-07-09) — generates ONE comment in
// Sophiya's own voice (see playbook/voice.md + generateSophiyaComment
// in lib/comments.ts) for a single post you give it, and sends it to Slack
// for her ✅/❌/edit review via the same sendReviewMessage() the automated
// /api/comments/plan flow uses. Decoupled from the Intel tab / n8n / daily-cap
// machinery on purpose — /api/comments/plan needs a full tracked-creator
// scrape to have run first, this doesn't. Built specifically so the voice +
// Slack review loop can be tested on one real post without activating n8n.
//
// Same shared-secret auth pattern as /api/comments/suggest.
//
// Request body: { "url": string, "postText": string, "creatorName"?: string }
// Response:     { "ok": true, "comment_text": string, "slack_ts": string }
//               or { "ok": false, "error": string } if quality gate fails
//               or Slack send throws.

const DEFAULT_SUGGEST_TOKEN = "3088768ac5a002b7e72a6955a52fa07c1d5704addc143516";

interface Body {
  url?: string;
  postText?: string;
  creatorName?: string;
}

export async function POST(req: Request) {
  const expected = process.env.SUGGEST_TOKEN || DEFAULT_SUGGEST_TOKEN;
  const got = req.headers.get("x-suggest-token");
  if (got !== expected) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const postText = (body.postText || "").trim();
  if (postText.length < 5) {
    return NextResponse.json(
      { ok: false, error: "postText is required (min 5 chars)" },
      { status: 400 }
    );
  }
  const url = (body.url || "").trim();
  const creatorName = (body.creatorName || "the author").slice(0, 80);

  let generated;
  try {
    generated = await generateSophiyaComment({ url, text: postText, creator_name: creatorName });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: `generation failed: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }

  const gate = qualityGateSophiyaComment(generated.comment_text);
  if (!gate.ok) {
    return NextResponse.json(
      { ok: false, error: `quality gate failed: ${gate.reason}`, raw: generated.comment_text },
      { status: 200 }
    );
  }

  let slackTs: string;
  try {
    slackTs = await sendReviewMessage({
      creator_name: creatorName,
      post_text: postText.slice(0, 500),
      url,
      comment_text: generated.comment_text,
      style_preset: "sophiya_expert_voice",
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: `slack send failed: ${e instanceof Error ? e.message : String(e)}`,
        comment_text: generated.comment_text,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, comment_text: generated.comment_text, slack_ts: slackTs });
}
