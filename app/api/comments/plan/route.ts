import { NextResponse } from "next/server";
import {
  attachCommentToIntelRow,
  countAuthorCommentsLastNDays,
  countCommentsPostedToday,
  getConfig,
  loadIntel,
  IntelRow,
} from "@/lib/sheets";
import {
  generateExpertComment,
  qualityGateComment,
  extractPostUrn,
  CandidatePost,
} from "@/lib/comments";
import { sendReviewMessage } from "@/lib/slack";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/comments/plan
//
// Called by n8n AFTER the LinkedIn creator scrape has been ingested via
// /api/intel/ingest. No request body needed.
//
// Recency window: only considers LinkedIn posts whose posted_at is within
// the last 24 hours. This means each daily midnight run picks up all posts
// from the previous day, regardless of when they were ingested. Posts older
// than 24 hours are ignored — no commenting on stale week-old posts.
//
// Stranded drafts (comment_status='draft') within the 24-hour window are
// retried without regeneration.
//
// Daily cap: comments_daily_cap config row (default 5). Counts posted-today
// rows. Per-profile weekly cap still applies.

export async function POST() {
  try {
    // 24-hour recency cutoff — only consider posts published in the last day.
    const recencyCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const stats = {
      stranded_drafts: 0,
      fresh_candidates: 0,
      quality_failed: 0,
      skipped_per_profile_cap: 0,
      skipped_too_old: 0,
      capped: 0,
      returned: 0,
      emoji_slots: 0,
    };

    const [config, postedToday, allIntel] = await Promise.all([
      getConfig(),
      countCommentsPostedToday(),
      loadIntel(),
    ]);

    const dailyCap = parseInt(config["comments_daily_cap"] || "5", 10);
    const minEngagement = parseInt(
      config["comments_min_engagement"] || "0",
      10
    );
    const perProfileCap = parseInt(
      config["comments_per_profile_weekly_cap"] || "2",
      10
    );
    const perProfileWindowDays = parseInt(
      config["comments_per_profile_window_days"] || "7",
      10
    );

    if (postedToday >= dailyCap) {
      return NextResponse.json({
        ok: true,
        comments: [],
        stats,
        reason: `daily cap reached (${postedToday}/${dailyCap})`,
      });
    }

    // Only consider LinkedIn posts published within the last 24 hours.
    const linkedInRows = allIntel.filter((r) => r.type === "linkedin");
    const recentRows = linkedInRows.filter((r) => {
      if (!r.posted_at) return false;
      const postedDate = new Date(r.posted_at);
      if (isNaN(postedDate.getTime())) return false;
      return postedDate >= recencyCutoff;
    });
    stats.skipped_too_old = linkedInRows.length - recentRows.length;

    // Stranded drafts — have comment_status='draft' and a populated
    // comment_text from a prior run. Only within the 24-hour window.
    const strandedDrafts = recentRows
      .filter(
        (r) =>
          r.comment_status === "draft" &&
          r.comment_text &&
          r.comment_text.trim().length > 0
      )
      .sort((a, b) =>
        (a.pulled_at || "").localeCompare(b.pulled_at || "")
      );
    stats.stranded_drafts = strandedDrafts.length;

    // Fresh candidates — no comment yet, within 24-hour window.
    // Sorted by engagement score desc.
    const freshCandidatesRaw = recentRows
      .filter((r) => !r.comment_status)
      .filter((r) => r.score >= minEngagement)
      .sort((a, b) => b.score - a.score);
    stats.fresh_candidates = freshCandidatesRaw.length;

    // Per-profile weekly rate limiter. Keeps us from looking like a bot by
    // commenting on every post from the same creator. Walks fresh
    // candidates in score order and skips any whose author has already hit
    // the cap in the rolling window. Increments the in-memory count as we
    // go so a single batch with 3 high-score posts from one creator only
    // picks the top 2. Stranded drafts are NOT filtered — they were
    // already approved in a prior run and deserve to clear out.
    const authorCounts = countAuthorCommentsLastNDays(
      allIntel,
      perProfileWindowDays
    );
    const freshCandidates: IntelRow[] = [];
    for (const row of freshCandidatesRaw) {
      const author = row.source || "";
      const count = authorCounts.get(author) || 0;
      if (author && count >= perProfileCap) {
        stats.skipped_per_profile_cap++;
        continue;
      }
      freshCandidates.push(row);
      if (author) authorCounts.set(author, count + 1);
    }

    // Prioritize stranded drafts, then fresh candidates. Cap to remaining
    // daily slots.
    const remaining = dailyCap - postedToday;
    const combined: IntelRow[] = [...strandedDrafts, ...freshCandidates];
    const selected = combined.slice(0, remaining);
    stats.capped = combined.length - selected.length;

    if (selected.length === 0) {
      return NextResponse.json({
        ok: true,
        comments: [],
        stats,
        reason: "no candidates",
      });
    }

    const approved: Array<{
      url: string;
      post_urn: string;
      comment_text: string;
      creator_name: string;
      style_preset: string;
      post_preview: string;
    }> = [];

    // Short, single-line preview of the original LinkedIn post for the
    // Slack notification. Slack's own LinkedIn unfurl is disabled in the
    // n8n workflow (it dumps the entire post body), so we send our own
    // truncated version instead.
    const buildPreview = (raw: string | undefined): string => {
      const text = (raw || "").replace(/\s+/g, " ").trim();
      if (text.length <= 140) return text;
      return text.slice(0, 137) + "...";
    };

    // Emoji ratio: at most 1 in every 4 comments per batch gets an emoji.
    // Slots are spread evenly across the batch so they don't cluster at
    // the start or end. With fewer than 4 candidates, no slots qualify —
    // small batches are all plain text, which matches how humans comment.
    const emojiSlots = new Set<number>();
    const maxEmojiCount = Math.floor(selected.length / 4);
    if (maxEmojiCount > 0) {
      const spacing = selected.length / maxEmojiCount;
      for (let i = 0; i < maxEmojiCount; i++) {
        emojiSlots.add(Math.floor(i * spacing));
      }
    }
    stats.emoji_slots = maxEmojiCount;

    for (let idx = 0; idx < selected.length; idx++) {
      const row = selected[idx];
      const post_urn = extractPostUrn(row.url);
      if (!post_urn) {
        await attachCommentToIntelRow(row.url, {
          comment_status: "quality_failed",
          comment_text: "could not extract post URN from URL",
        });
        stats.quality_failed++;
        continue;
      }

      // Stranded draft — send for review with existing text.
      if (
        row.comment_status === "draft" &&
        row.comment_text &&
        row.comment_text.trim().length > 0
      ) {
        const preview = buildPreview(row.summary || row.title);
        let slackTs = "";
        try {
          slackTs = await sendReviewMessage({
            creator_name: row.source || "linkedin",
            post_preview: preview,
            url: row.url,
            comment_text: row.comment_text,
            style_preset: row.comment_style || "agree_add",
          });
        } catch {
          // Slack failed — keep as draft
        }
        await attachCommentToIntelRow(row.url, {
          comment_status: "pending_review",
          comment_posted_at: slackTs,
        });
        approved.push({
          url: row.url,
          post_urn,
          comment_text: row.comment_text,
          creator_name: row.source || "linkedin",
          style_preset: row.comment_style || "agree_add",
          post_preview: preview,
        });
        continue;
      }

      // Fresh candidate — generate a new comment.
      const post: CandidatePost = {
        url: row.url,
        text: row.summary || row.title,
        creator_name: row.source || "linkedin",
        reactions: row.score,
      };

      let generated;
      try {
        generated = await generateExpertComment(post, {
          allowEmoji: emojiSlots.has(idx),
        });
      } catch (e) {
        await attachCommentToIntelRow(row.url, {
          comment_status: "quality_failed",
          comment_text: `generation failed: ${
            e instanceof Error ? e.message : String(e)
          }`,
        });
        stats.quality_failed++;
        continue;
      }

      const gate = qualityGateComment(generated.comment_text);
      if (!gate.ok) {
        await attachCommentToIntelRow(row.url, {
          comment_status: "quality_failed",
          comment_text: generated.comment_text,
          comment_style: generated.style_preset,
        });
        stats.quality_failed++;
        continue;
      }

      const preview = buildPreview(row.summary || row.title);

      // Send to Slack for human review instead of returning for auto-post.
      let slackTs = "";
      try {
        slackTs = await sendReviewMessage({
          creator_name: post.creator_name,
          post_preview: preview,
          url: row.url,
          comment_text: generated.comment_text,
          style_preset: generated.style_preset,
        });
      } catch {
        // Slack send failed — still save draft so it's not lost.
      }

      await attachCommentToIntelRow(row.url, {
        comment_text: generated.comment_text,
        comment_status: "pending_review",
        comment_posted_at: slackTs, // store Slack ts for thread reply lookup
        comment_style: generated.style_preset,
      });

      approved.push({
        url: row.url,
        post_urn,
        comment_text: generated.comment_text,
        creator_name: post.creator_name,
        style_preset: generated.style_preset,
        post_preview: preview,
      });
    }

    stats.returned = approved.length;

    // Return empty comments array — n8n no longer posts directly.
    // Approved comments are posted by the second phase after human review.
    return NextResponse.json({
      ok: true,
      comments: [],
      sent_for_review: approved.length,
      stats,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
