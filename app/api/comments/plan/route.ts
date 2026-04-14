import { NextResponse } from "next/server";
import {
  attachCommentToIntelRow,
  countCommentsPostedToday,
  getConfig,
  loadLinkedInPostsNeedingComment,
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
// /api/intel/ingest, so the new posts are already sitting in the Intel tab.
// This route reads the LinkedIn posts that don't yet have a comment, picks
// the top-engagement ones up to the daily cap, generates a comment for each
// in Taha's voice, runs the voice quality gate, writes the draft straight
// into the matching Intel row's comment_* columns, and returns the approved
// comments to n8n. n8n then iterates and posts each one to LinkedIn.
//
// No request body needed — everything comes from Intel. Just POST with an
// empty body or no body at all.
//
// Response shape:
//   {
//     ok: true,
//     comments: [{ url, post_urn, comment_text, creator_name, style_preset }],
//     stats: { candidates, quality_failed, capped, returned },
//     reason?: "daily cap reached" | "no candidates"
//   }

export async function POST() {
  try {
    const stats = {
      candidates: 0,
      quality_failed: 0,
      capped: 0,
      returned: 0,
    };

    const [config, postedToday, linkedInRows] = await Promise.all([
      getConfig(),
      countCommentsPostedToday(),
      loadLinkedInPostsNeedingComment(),
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

    // Apply engagement filter (already sorted by score desc inside the helper)
    const aboveThreshold = linkedInRows.filter((r) => r.score >= minEngagement);
    stats.candidates = aboveThreshold.length;

    if (aboveThreshold.length === 0) {
      return NextResponse.json({
        ok: true,
        comments: [],
        stats,
        reason: "no candidates without comments",
      });
    }

    const remaining = dailyCap - postedToday;
    const candidates = aboveThreshold.slice(0, remaining);
    stats.capped = aboveThreshold.length - candidates.length;

    const approved: Array<{
      url: string;
      post_urn: string;
      comment_text: string;
      creator_name: string;
      style_preset: string;
    }> = [];

    for (const row of candidates) {
      // The Intel row's title field holds the first 80 chars of the LinkedIn
      // post text — for richer generation we use the summary which holds 500
      // chars. Either is OK as the model input; summary is better.
      const post: CandidatePost = {
        url: row.url,
        text: row.summary || row.title,
        creator_name: row.source || "linkedin",
        reactions: row.score, // score is already reactions+comments*2
      };

      const post_urn = extractPostUrn(post.url);
      if (!post_urn) {
        await attachCommentToIntelRow(row.url, {
          comment_status: "quality_failed",
          comment_text: "could not extract post URN from URL",
        });
        stats.quality_failed++;
        continue;
      }

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
