import { NextResponse } from "next/server";
import {
  getConfig,
  loadIntel,
  readSheet,
  countCommentsPostedToday,
  countAuthorCommentsLastNDays,
  IntelRow,
} from "@/lib/sheets";

export const dynamic = "force-dynamic";

// GET /api/comments/feed
//
// Read-only sibling of POST /api/comments/plan, for the /engagement page.
// Replicates that route's exact "posts worth engaging with" filter (LinkedIn
// rows from Intel, 24h recency window, uncommented or a stranded draft,
// score >= comments_min_engagement, sorted by score desc, capped by
// comments_daily_cap, rate-limited per author over the rolling window) —
// but never writes to the Sheet, never calls Slack, and never generates a
// comment. Purely a dashboard view of what /api/comments/plan would pick up
// on its next run.
//
// Response: { candidates: [{url,title,summary,score,source,posted_at_display}],
//             weeklyProgress: { sent, cap } }

export async function GET() {
  try {
    const recencyCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [config, postedToday, allIntel, rawRows] = await Promise.all([
      getConfig(),
      countCommentsPostedToday(),
      loadIntel(),
      // loadIntel() only reads columns A:N (it predates the pulled_at_display /
      // posted_at_display columns added in O/P) — pull the raw sheet once more
      // so the feed can show the real, already-computed display string instead
      // of reimplementing the karachiIso→humanized formatting logic.
      readSheet("Intel", "A:P"),
    ]);

    const dailyCap = parseInt(config["comments_daily_cap"] || "5", 10);
    const minEngagement = parseInt(config["comments_min_engagement"] || "0", 10);
    const perProfileCap = parseInt(config["comments_per_profile_weekly_cap"] || "2", 10);
    const perProfileWindowDays = parseInt(
      config["comments_per_profile_window_days"] || "7",
      10
    );

    // url (col F, index 5) -> posted_at_display (col P, index 15)
    const displayByUrl = new Map<string, string>();
    for (const r of rawRows.slice(1)) {
      if (r[5]) displayByUrl.set(r[5], r[15] || "");
    }

    // Only LinkedIn posts published within the last 24 hours — same window
    // /api/comments/plan uses.
    const linkedInRows = allIntel.filter((r) => r.type === "linkedin");
    const recentRows = linkedInRows.filter((r) => {
      if (!r.posted_at) return false;
      const postedDate = new Date(r.posted_at);
      if (isNaN(postedDate.getTime())) return false;
      return postedDate >= recencyCutoff;
    });

    // Stranded drafts — comment_status='draft' with populated comment_text,
    // within the recency window. Not filtered by the per-profile cap (same
    // as the plan route — they were already approved in a prior run).
    const strandedDrafts = recentRows
      .filter(
        (r) =>
          r.comment_status === "draft" &&
          r.comment_text &&
          r.comment_text.trim().length > 0
      )
      .sort((a, b) => (a.pulled_at || "").localeCompare(b.pulled_at || ""));

    // Fresh candidates — no comment yet, meets the minimum engagement score,
    // sorted by score descending.
    const freshCandidatesRaw = recentRows
      .filter((r) => !r.comment_status)
      .filter((r) => r.score >= minEngagement)
      .sort((a, b) => b.score - a.score);

    // Per-profile weekly rate limiter, walked in score order.
    const authorCounts = countAuthorCommentsLastNDays(allIntel, perProfileWindowDays);
    const freshCandidates: IntelRow[] = [];
    for (const row of freshCandidatesRaw) {
      const author = row.source || "";
      const count = authorCounts.get(author) || 0;
      if (author && count >= perProfileCap) continue;
      freshCandidates.push(row);
      if (author) authorCounts.set(author, count + 1);
    }

    // Prioritize stranded drafts, then fresh candidates, capped by whatever
    // daily-cap slots remain today.
    const remaining = Math.max(dailyCap - postedToday, 0);
    const combined: IntelRow[] = [...strandedDrafts, ...freshCandidates];
    const selected = combined.slice(0, remaining);

    const candidates = selected.map((r) => ({
      url: r.url,
      title: r.title,
      summary: r.summary,
      score: r.score,
      source: r.source,
      posted_at_display: displayByUrl.get(r.url) || r.posted_at || "",
    }));

    // Weekly progress — reuse countAuthorCommentsLastNDays (the same rolling-
    // window helper the plan route uses for its per-author cap) and sum
    // across every author for a real total-sent count, instead of
    // reimplementing the posted/window date logic.
    const sentByAuthor = countAuthorCommentsLastNDays(allIntel, perProfileWindowDays);
    const sent = [...sentByAuthor.values()].reduce((a, b) => a + b, 0);
    const cap = dailyCap * 7;

    return NextResponse.json({
      candidates,
      weeklyProgress: { sent, cap },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
