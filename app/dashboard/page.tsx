"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { Users, BarChart3, Heart, MessageCircle, TrendingUp, RefreshCw } from "lucide-react";
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

// One dashboard-wide "refresh" re-fetches every widget live. Each data source
// (the 4 dashboard widgets + this page's own stat bundle) reports back via
// onLoaded; once all have reported, the spinner stops and "updated Xs ago"
// resets. Bumping refreshKey is what triggers every child to refetch.
const WIDGET_COUNT = 4; // LastPostHero, TrendingFormats, ComboIdeas, NextScheduled
const TOTAL_SOURCES = WIDGET_COUNT + 1; // + this page's own stat bundle

function agoLabel(ts: number | null): string {
  if (ts == null) return "";
  const secs = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (secs < 5) return "updated just now";
  if (secs < 60) return `updated ${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `updated ${mins}m ago`;
  const hrs = Math.round(mins / 60);
  return `updated ${hrs}h ago`;
}

export default function DashboardPage() {
  // --- Live refresh wiring -----------------------------------------------
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [, forceTick] = useState(0); // re-render so "updated Xs ago" stays live
  const doneRef = useRef(0);

  const markLoaded = useCallback(() => {
    doneRef.current += 1;
    if (doneRef.current >= TOTAL_SOURCES) {
      setRefreshing(false);
      setLastUpdated(Date.now());
    }
  }, []);

  const handleRefresh = useCallback(() => {
    doneRef.current = 0;
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 15000);
    return () => clearInterval(id);
  }, []);

  // --- Profile stats bundle (account posts + live sync + weekly target) ---
  // Grouped into one effect so we can report a single "loaded" once the whole
  // page-level bundle settles, and so a refresh re-runs all three together.
  const [acctPosts, setAcctPosts] = useState<AccountPost[] | null>(null);
  const [liveFollowers, setLiveFollowers] = useState<string | null>(null);
  const [sync, setSync] = useState<{ capturedAt: string; profileViews: string; postImpressions: string } | null>(null);
  const [weeklyTarget, setWeeklyTarget] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Reset visible state so a refresh shows the loading skeletons again.
      setAcctPosts(null);
      setLiveFollowers(null);
      setSync(null);
      setWeeklyTarget(null);

      await Promise.allSettled([
        fetchAccountPosts().then((d) => { if (!cancelled) setAcctPosts(d); }).catch(() => {}),
        fetch("/api/linkedin/sync")
          .then((r) => r.json())
          .then((d) => {
            if (cancelled) return;
            if (d?.stats?.followers) setLiveFollowers(Number(d.stats.followers).toLocaleString());
            if (d?.stats?.captured_at) {
              setSync({
                capturedAt: d.stats.captured_at,
                profileViews: d.stats.profile_views_90d || "",
                postImpressions: d.stats.post_impressions_7d || "",
              });
            }
          })
          .catch(() => {}),
        (async () => {
          try {
            const res = await fetch("/api/sheets?tab=Config&range=A:B");
            if (!res.ok) { if (!cancelled) setWeeklyTarget(5 * 7); return; }
            const { rows } = await res.json();
            const row = (rows as string[][]).slice(1).find((r) => r[0] === "comments_daily_cap");
            const dailyCap = parseInt(row?.[1] || "5", 10) || 5;
            if (!cancelled) setWeeklyTarget(dailyCap * 7);
          } catch {
            if (!cancelled) setWeeklyTarget(5 * 7);
          }
        })(),
      ]);
      if (!cancelled) markLoaded();
    })();

    return () => { cancelled = true; };
  }, [refreshKey, markLoaded]);

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

  return (
    <div className="max-w-lg lg:max-w-5xl mx-auto px-4 lg:px-6 py-6 space-y-5">
      {/* Refresh control — re-fetches every widget live */}
      <div className="flex items-center justify-end gap-3">
        {lastUpdated && (
          <span className="text-xs text-muted-foreground" aria-live="polite">{agoLabel(lastUpdated)}</span>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing}
          aria-label="Refresh all dashboard data"
        >
          <RefreshCw size={14} className={`mr-1 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

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
      <LastPostHero refreshKey={refreshKey} onLoaded={markLoaded} />

      {/* 3. ⭐ Trending formats you starred */}
      <TrendingFormats refreshKey={refreshKey} onLoaded={markLoaded} />

      {/* 4. Ready-to-post combo ideas */}
      <ComboIdeas refreshKey={refreshKey} onLoaded={markLoaded} />

      {/* 5. Next scheduled post */}
      <NextScheduled refreshKey={refreshKey} onLoaded={markLoaded} />

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
