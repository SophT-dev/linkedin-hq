import { NextResponse } from "next/server";
import {
  attachCommentToIntelRow,
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
// /api/intel/ingest. Reads the Intel tab and decides what to post. Three
// categories of candidate:
//
//   1. STRANDED DRAFTS: Intel rows where comment_status='draft' and the
//      comment_text is already populated. These are drafts from a prior
//      run that never made it to LinkedIn (workflow was disconnected,
//      crashed, hit rate limit, etc.). They get highest priority — we
//      re-queue them for posting without re-generating, so nothing
//      stays stuck.
//
//   2. FRESH CANDIDATES: Intel rows with type='linkedin' and empty
//      comment_status. These are newly scraped posts we haven't
//      commented on yet. Sorted by engagement score desc.
//
//   3. CAPPED: anything past the remaining daily cap. Left alone, will
//      become candidates on a future run.
//
// Daily cap: comments_daily_cap config row (default 5). Counted against
// posted_today only. Stranded drafts count toward cap when they finally
// post, not when they were originally generated.

export async function POST() {
  try {
    const stats = {
      stranded_drafts: 0,
      fresh_candidates: 0,
      quality_failed: 0,
      capped: 0,
      returned: 0,
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
    // comment_text. These are pending from a previous run. Oldest first
    // so they clear out predictably.
    const strandedDrafts = linkedInRows
      .filter(
        (r) =>
          r.comment_status === "draft" &&
          r.comment_text &&
          r.comment_text.trim().length > 0
      )
      .sort((a, b) => (a.pulled_at || "").localeCompare(b.pulled_at || ""));
    stats.stranded_drafts = strandedDrafts.length;

    // Fresh candidates — no comment yet. Sorted by engagement score desc.
    const freshCandidates = linkedInRows
      .filter((r) => !r.comment_status)
      .filter((r) => r.score >= minEngagement)
      .sort((a, b) => b.score - a.score);
    stats.fresh_candidates = freshCandidates.length;

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
    }> = [];

    for (const row of selected) {
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
        generated = await generateExpertComment(post);
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
