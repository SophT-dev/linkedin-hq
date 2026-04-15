import { NextRequest, NextResponse } from "next/server";
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

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/comments/plan
//
// Called by n8n AFTER the LinkedIn creator scrape has been ingested via
// /api/intel/ingest.
//
// Request body (optional): { only_urls: string[] }
//   When provided, ONLY the Intel rows whose url is in this list are
//   eligible for commenting. This is how n8n enforces "only comment on
//   posts that came in during this run" — the ingest step returns the
//   fresh URLs it wrote to the sheet, and those are passed straight to
//   this route. Old posts stranded in Intel from previous runs are never
//   reconsidered.
//
//   When omitted (e.g., manual curl testing), the legacy behavior applies:
//   all linkedin rows with empty comment_status are candidates.
//
// Fresh candidates: Intel rows with type='linkedin', empty comment_status,
// url in only_urls (if provided). Sorted by engagement score desc.
//
// Stranded drafts (comment_status='draft' with populated comment_text from
// a prior run) are ONLY processed when only_urls is NOT provided. In the
// n8n "only new posts" mode they're ignored — "no old posts" means no
// old posts, including stranded ones.
//
// Daily cap: comments_daily_cap config row (default 5). Counts posted-today
// rows. Per-profile weekly cap still applies.

export async function POST(req: NextRequest) {
  try {
    // Parse optional only_urls filter. Missing body / malformed body is
    // fine — we just fall back to legacy all-candidates mode.
    let onlyUrlSet: Set<string> | null = null;
    try {
      const body = await req.json();
      if (body && Array.isArray(body.only_urls)) {
        onlyUrlSet = new Set<string>(body.only_urls.filter((u: unknown) => typeof u === "string"));
      }
    } catch {
      // no body or not JSON — legacy mode
    }
    const stats = {
      stranded_drafts: 0,
      fresh_candidates: 0,
      quality_failed: 0,
      skipped_per_profile_cap: 0,
      capped: 0,
      returned: 0,
      emoji_slots: 0,
      only_urls_mode: onlyUrlSet !== null,
      only_urls_count: onlyUrlSet?.size ?? 0,
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

    // Split Intel rows into two buckets.
    const linkedInRows = allIntel.filter((r) => r.type === "linkedin");

    // Stranded drafts — have comment_status='draft' and a populated
    // comment_text. These are pending from a previous run.
    //
    // ONLY processed when only_urls is NOT set. In the n8n "only new
    // posts from this run" mode, stranded drafts are deliberately
    // ignored — "no old posts" includes stranded ones. Legacy curl-
    // testing mode (no body on the request) still retries them.
    const strandedDrafts =
      onlyUrlSet === null
        ? linkedInRows
            .filter(
              (r) =>
                r.comment_status === "draft" &&
                r.comment_text &&
                r.comment_text.trim().length > 0
            )
            .sort((a, b) =>
              (a.pulled_at || "").localeCompare(b.pulled_at || "")
            )
        : [];
    stats.stranded_drafts = strandedDrafts.length;

    // Fresh candidates — no comment yet. Sorted by engagement score desc.
    // When only_urls is set, restrict to URLs that came in during THIS run
    // so we never comment on stale posts stranded in Intel from prior runs.
    const freshCandidatesRaw = linkedInRows
      .filter((r) => !r.comment_status)
      .filter((r) => r.score >= minEngagement)
      .filter((r) => (onlyUrlSet ? onlyUrlSet.has(r.url) : true))
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

      // Stranded draft — reuse the existing comment_text, don't re-generate.
      // This preserves the comment exactly as it was first written, which
      // is what the user expected when they first saw it as a draft.
      if (
        row.comment_status === "draft" &&
        row.comment_text &&
        row.comment_text.trim().length > 0
      ) {
        approved.push({
          url: row.url,
          post_urn,
          comment_text: row.comment_text,
          creator_name: row.source || "linkedin",
          style_preset: row.comment_style || "agree_add",
          post_preview: buildPreview(row.summary || row.title),
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

      await attachCommentToIntelRow(row.url, {
        comment_text: generated.comment_text,
        comment_status: "draft",
        comment_style: generated.style_preset,
      });

      approved.push({
        url: row.url,
        post_urn,
        comment_text: generated.comment_text,
        creator_name: post.creator_name,
        style_preset: generated.style_preset,
        post_preview: buildPreview(row.summary || row.title),
      });
    }

    stats.returned = approved.length;

    return NextResponse.json({
      ok: true,
      comments: approved,
      stats,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
