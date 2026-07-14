import { NextResponse } from "next/server";
import {
  getConfig,
  loadIntel,
  readSheet,
  countAuthorCommentsLastNDays,
} from "@/lib/sheets";

export const dynamic = "force-dynamic";

// GET /api/comments/feed
//
// The HUMAN engagement view for /engagement. Unlike POST /api/comments/plan
// (which picks the few posts the BOT will comment on next, capped by the daily
// budget), this returns EVERYTHING worth engaging with by hand:
//   • every LinkedIn post the automation pulled into Intel within the last 48h
//     (people rarely reply to comments after ~48h — that's the useful window)
//   • that hasn't been engaged with yet (no POSTED comment)
//   • newest first, each tagged with how many hours ago it went up + its status
//   • plus one "engage now" recommendation (freshest high-signal post)
//
// Never writes to the Sheet, never calls Slack, never generates a comment.

const WINDOW_HOURS = 48;
const MAX_ITEMS = 60;

export async function GET() {
  try {
    const recencyCutoff = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000);

    const [config, allIntel, rawRows] = await Promise.all([
      getConfig(),
      loadIntel(),
      readSheet("Intel", "A:P"),
    ]);

    const dailyCap = parseInt(config["comments_daily_cap"] || "5", 10);
    const perProfileWindowDays = parseInt(config["comments_per_profile_window_days"] || "7", 10);

    // url (col F, idx 5) -> image_url (col N, idx 13) + posted_at_display (col P, idx 15)
    const imageByUrl = new Map<string, string>();
    const displayByUrl = new Map<string, string>();
    for (const r of rawRows.slice(1)) {
      if (!r[5]) continue;
      imageByUrl.set(r[5], r[13] || "");
      displayByUrl.set(r[5], r[15] || "");
    }

    const hoursAgo = (iso: string): number | null => {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return null;
      return Math.floor((Date.now() - d.getTime()) / (60 * 60 * 1000));
    };

    // LinkedIn posts within the 48h window that have NOT been engaged with yet
    // (a 'posted' comment_status means we already commented). 'draft' or empty
    // both count as still-needs-engaging.
    const rows = allIntel
      .filter((r) => r.type === "linkedin")
      .filter((r) => {
        if (!r.posted_at) return false;
        const d = new Date(r.posted_at);
        return !isNaN(d.getTime()) && d >= recencyCutoff;
      })
      .filter((r) => r.comment_status !== "posted")
      .sort((a, b) => (b.posted_at || "").localeCompare(a.posted_at || "")); // newest first

    const candidates = rows.slice(0, MAX_ITEMS).map((r) => ({
      url: r.url,
      title: r.title,
      summary: r.summary,
      score: r.score,
      source: r.source,
      posted_at: r.posted_at,
      posted_at_display: displayByUrl.get(r.url) || r.posted_at || "",
      image_url: imageByUrl.get(r.url) || "",
      hoursAgo: hoursAgo(r.posted_at),
      status: r.comment_status || "new",
    }));

    // "Engage now" = the highest-signal post that's still fresh (<= 24h),
    // falling back to the highest-score post anywhere in the window.
    const fresh = candidates.filter((c) => (c.hoursAgo ?? 99) <= 24);
    const pool = fresh.length ? fresh : candidates;
    const recommended = pool.length ? [...pool].sort((a, b) => b.score - a.score)[0] : null;

    // Weekly progress (comments posted across all authors in the rolling window).
    const sentByAuthor = countAuthorCommentsLastNDays(allIntel, perProfileWindowDays);
    const sent = [...sentByAuthor.values()].reduce((a, b) => a + b, 0);

    return NextResponse.json({
      recommended,
      candidates,
      windowHours: WINDOW_HOURS,
      weeklyProgress: { sent, cap: dailyCap * 7 },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
