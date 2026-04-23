import { NextRequest, NextResponse } from "next/server";
import {
  loadIntel,
  attachCommentToIntelRow,
} from "@/lib/sheets";
import { getThreadReplies, getReactions } from "@/lib/slack";
import { extractPostUrn } from "@/lib/comments";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// POST /api/comments/check-reviews
//
// Phase 2 of the human-in-the-loop comment flow. Called by n8n (e.g.,
// 10am cron) AFTER the user has had time to review drafts in Slack.
//
// For each Intel row with comment_status='pending_review', reads the
// Slack thread replies (ts stored in comment_posted_at) and processes
// the user's decision:
//   ✅ (or contains ✅)  → approved with original text
//   ❌ (or contains ❌)  → rejected
//   any other text       → approved with that text as the edited comment
//   no reply             → stays pending_review (checked next run)
//
// Returns approved comments ready for n8n to post to LinkedIn.

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("x-ingest-token");
    const expected = process.env.INTEL_INGEST_TOKEN;
    if (!expected || token !== expected) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const allIntel = await loadIntel();
    const pendingRows = allIntel.filter(
      (r) => r.type === "linkedin" && r.comment_status === "pending_review"
    );

    if (pendingRows.length === 0) {
      return NextResponse.json({ ok: true, comments: [], pending: 0 });
    }

    const approved: Array<{
      url: string;
      post_urn: string;
      comment_text: string;
      creator_name: string;
      style_preset: string;
      post_preview: string;
    }> = [];

    let reviewed = 0;
    let rejected = 0;
    let still_pending = 0;

    const buildPreview = (raw: string | undefined): string => {
      const text = (raw || "").replace(/\s+/g, " ").trim();
      return text.length <= 140 ? text : text.slice(0, 137) + "...";
    };

    for (const row of pendingRows) {
      const slackTs = row.comment_posted_at;
      if (!slackTs) {
        still_pending++;
        continue;
      }

      // Check emoji reactions first (one-click approve/skip),
      // then thread replies (for edits).
      let reactions;
      let replies;
      try {
        [reactions, replies] = await Promise.all([
          getReactions(slackTs),
          getThreadReplies(slackTs),
        ]);
      } catch {
        still_pending++;
        continue;
      }

      const hasApproveReaction = reactions.some(
        (r) => r.name === "white_check_mark" || r.name === "heavy_check_mark"
      );
      const hasRejectReaction = reactions.some(
        (r) => r.name === "x" || r.name === "negative_squared_cross_mark"
      );
      const editReply = replies.length > 0 ? replies[0].text.trim() : null;

      // Priority: thread reply (edit) > ❌ reaction > ✅ reaction
      if (!editReply && !hasApproveReaction && !hasRejectReaction) {
        still_pending++;
        continue;
      }

      if (hasRejectReaction && !editReply && !hasApproveReaction) {
        await attachCommentToIntelRow(row.url, {
          comment_status: "rejected",
        });
        rejected++;
        continue;
      }

      // Thread reply = approve with edited text.
      // ✅ reaction (no reply) = approve with original text.
      const finalText = editReply || row.comment_text;

      const post_urn = extractPostUrn(row.url);
      if (!post_urn) {
        await attachCommentToIntelRow(row.url, {
          comment_status: "quality_failed",
          comment_text: "could not extract post URN",
        });
        continue;
      }

      await attachCommentToIntelRow(row.url, {
        comment_text: finalText,
        comment_status: "approved",
      });

      approved.push({
        url: row.url,
        post_urn,
        comment_text: finalText,
        creator_name: row.source || "linkedin",
        style_preset: row.comment_style || "agree_add",
        post_preview: buildPreview(row.summary || row.title),
      });

      reviewed++;
    }

    return NextResponse.json({
      ok: true,
      comments: approved,
      stats: { reviewed, rejected, still_pending },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
