"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Users, BarChart3, Heart, MessageCircle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProfileHeader from "@/components/ProfileHeader";
import StatCards, { type StatCard } from "@/components/analytics/StatCards";
import { fetchAccountPosts, originalPosts, totals, metricTrend, engagementTrend, sparkline, type AccountPost } from "@/lib/analytics";
import { tahaProfile } from "@/lib/profile";
import LastPostHero from "@/components/dashboard/LastPostHero";
import TrendingFormats from "@/components/dashboard/TrendingFormats";
import ComboIdeas from "@/components/dashboard/ComboIdeas";
import NextScheduled from "@/components/dashboard/NextScheduled";

// ProfileStats captured_at is Karachi wall-clock ("YYYY-MM-DD HH:MM:SS", no tz).
// Tag it +05:00 so "ago" is right regardless of the viewer's timezone.
function syncedAgo(capturedAt: string): string {
  const d = new Date(capturedAt.replace(" ", "T") + "+05:00");
  if (isNaN(d.getTime())) return "";
  const mins = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export default function DashboardPage() {
  // --- Profile stats (Taha's own account posts) --------------------------
  const [acctPosts, setAcctPosts] = useState<AccountPost[] | null>(null);
  useEffect(() => { fetchAccountPosts().then(setAcctPosts); }, []);

  // Live stats synced by the browser extension (falls back to the manual
  // lib/profile.ts snapshot until the first sync lands).
  const [liveFollowers, setLiveFollowers] = useState<string | null>(null);
  const [sync, setSync] = useState<{ capturedAt: string; profileViews: string; postImpressions: string } | null>(null);
  useEffect(() => {
    fetch("/api/linkedin/sync")
      .then((r) => r.json())
      .then((d) => {
        if (d?.stats?.followers) setLiveFollowers(Number(d.stats.followers).toLocaleString());
        if (d?.stats?.captured_at) {
          setSync({
            capturedAt: d.stats.captured_at,
            profileViews: d.stats.profile_views_90d || "",
            postImpressions: d.stats.post_impressions_7d || "",
          });
        }
      })
      .catch(() => {});
  }, []);

  const profileStats: StatCard[] | null = useMemo(() => {
    if (!acctPosts) return null;
    const posts = originalPosts(acctPosts, "Taha");
    const t = totals(posts);
    return [
      { label: "Followers", value: liveFollowers ?? tahaProfile.followers, deltaPct: null, spark: [], icon: Users, tint: "var(--cat-1)", hideTrend: true, subtitle: liveFollowers ? "Live · on LinkedIn" : "Total on LinkedIn" },
      { label: "Reactions", value: t.reactions.toLocaleString(), deltaPct: metricTrend(posts, "reactions").deltaPct, spark: sparkline(posts, "reactions"), icon: Heart, tint: "var(--viz-2)" },
      { label: "Comments", value: t.comments.toLocaleString(), deltaPct: metricTrend(posts, "comments").deltaPct, spark: sparkline(posts, "comments"), icon: MessageCircle, tint: "var(--primary)" },
      { label: "Avg engagement", value: t.avgEng.toLocaleString(), deltaPct: engagementTrend(posts), spark: posts.map((p) => p.reactions + p.comments).slice(-16), icon: TrendingUp, tint: "var(--cat-4)" },
    ];
  }, [acctPosts, liveFollowers]);

  // --- Engagement Hub weekly target --------------------------------------
  const [weeklyTarget, setWeeklyTarget] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/sheets?tab=Config&range=A:B");
      if (!res.ok) { setWeeklyTarget(5 * 7); return; }
      const { rows } = await res.json();
      const row = (rows as string[][]).slice(1).find((r) => r[0] === "comments_daily_cap");
      const dailyCap = parseInt(row?.[1] || "5", 10) || 5;
      setWeeklyTarget(dailyCap * 7);
    })();
  }, []);

  return (
    <div className="max-w-lg lg:max-w-5xl mx-auto px-4 lg:px-6 py-6 space-y-5">
      {/* Live profile snapshot + greeting */}
      <ProfileHeader />

      {/* Profile stats — tightened, near the top */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 size={16} style={{ color: "var(--primary)" }} /> Profile stats
            {sync?.capturedAt && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
                style={{ background: "var(--surface-3)", color: "var(--muted-foreground)" }}
                title={`Last synced by the browser extension at ${sync.capturedAt}`}
              >
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "var(--trend-up)" }} />
                Live · synced {syncedAgo(sync.capturedAt)}
              </span>
            )}
          </h2>
          <Link href="/analytics" className="text-xs font-medium hover:underline" style={{ color: "var(--primary)" }}>
            Full analytics →
          </Link>
        </div>

        {(sync?.profileViews || sync?.postImpressions) && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {sync?.profileViews && (
              <span><span className="font-semibold text-foreground">{Number(sync.profileViews).toLocaleString()}</span> profile viewers (90d)</span>
            )}
            {sync?.postImpressions && (
              <span><span className="font-semibold text-foreground">{Number(sync.postImpressions).toLocaleString()}</span> post impressions (7d)</span>
            )}
          </div>
        )}
        {profileStats === null ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border bg-card border-border shadow-sm h-[132px] animate-pulse" style={{ background: "var(--surface-pulse)" }} />
            ))}
          </div>
        ) : (
          <StatCards cards={profileStats} />
        )}
      </div>

      {/* 2. Last post hero */}
      <LastPostHero />

      {/* 3. ⭐ Trending formats you starred */}
      <TrendingFormats />

      {/* 4. Ready-to-post combo ideas */}
      <ComboIdeas />

      {/* 5. Next scheduled post */}
      <NextScheduled />

      {/* 6. Engagement Hub widget */}
      <div className="rounded-2xl p-4 border space-y-3" style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)" }}>
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <MessageCircle size={16} style={{ color: "var(--cat-3)" }} /> Your Engagement Hub
        </h2>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Weekly progress</span>
            <span>0/{weeklyTarget ?? "…"} comments sent this week</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-4)" }}>
            <div className="h-full" style={{ width: "0%", background: "var(--cat-3)" }} />
          </div>
        </div>

        <Link href="/engagement" className="block">
          <Button size="sm" className="w-full">Go to Engagement Hub</Button>
        </Link>
      </div>
    </div>
  );
}
