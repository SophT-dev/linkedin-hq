"use client";

import { useEffect, useMemo, useState } from "react";
import { Heart, MessageCircle, Repeat2, TrendingUp, Info, RefreshCw } from "lucide-react";
import {
  fetchAccountPosts,
  fetchCommentDates,
  originalPosts,
  totals,
  metricTrend,
  sparkline,
  byPostType,
  type AccountPost,
  type Persona,
} from "@/lib/analytics";
import StatCards, { type StatCard } from "@/components/analytics/StatCards";
import PerformanceChart from "@/components/analytics/PerformanceChart";
import ContentStreak from "@/components/analytics/ContentStreak";
import TopPosts from "@/components/analytics/TopPosts";
import CommentHeatmap from "@/components/analytics/CommentHeatmap";
import BestDayToPost from "@/components/analytics/BestDayToPost";
import PostTypes from "@/components/analytics/PostTypes";
import { WizardDoodle, ChartSproutDoodle } from "@/components/analytics/Doodles";

export default function AnalyticsPage() {
  const [posts, setPosts] = useState<AccountPost[]>([]);
  const [commentDates, setCommentDates] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [who, setWho] = useState<Persona>("Taha");

  useEffect(() => {
    (async () => {
      const [p, c] = await Promise.all([fetchAccountPosts(), fetchCommentDates()]);
      setPosts(p);
      setCommentDates(c);
      setLoaded(true);
    })();
  }, []);

  // Original posts for the selected persona (reposts/quotes excluded).
  const original = useMemo(() => originalPosts(posts, who), [posts, who]);
  // Persona's full set (any post_type) — for the post-mix donut.
  const personaAll = useMemo(() => posts.filter((p) => who === "All" || p.creator === who), [posts, who]);

  const t = useMemo(() => totals(original), [original]);

  const cards: StatCard[] = useMemo(() => {
    const engTrend = (() => {
      // Avg-engagement delta computed on (reactions + comments) per window.
      const r = metricTrend(original, "reactions").deltaPct;
      const c = metricTrend(original, "comments").deltaPct;
      if (r === null && c === null) return null;
      return Math.round(((r ?? 0) + (c ?? 0)) / 2);
    })();
    return [
      { label: "Reactions", value: t.reactions.toLocaleString(), deltaPct: metricTrend(original, "reactions").deltaPct, spark: sparkline(original, "reactions"), icon: Heart, tint: "var(--viz-2)" },
      { label: "Comments", value: t.comments.toLocaleString(), deltaPct: metricTrend(original, "comments").deltaPct, spark: sparkline(original, "comments"), icon: MessageCircle, tint: "var(--primary)" },
      { label: "Reposts", value: t.reposts.toLocaleString(), deltaPct: metricTrend(original, "reposts").deltaPct, spark: sparkline(original, "reposts"), icon: Repeat2, tint: "var(--cat-1)" },
      { label: "Avg engagement", value: t.avgEng.toLocaleString(), deltaPct: engTrend, spark: original.map((p) => p.reactions + p.comments).slice(-16), icon: TrendingUp, tint: "var(--cat-4)" },
    ];
  }, [original, t]);

  const typeData = useMemo(() => byPostType(personaAll, "reactions"), [personaAll]);
  const lastScraped = useMemo(() => original.map((p) => p.last_scraped).filter(Boolean).sort().pop() || "", [original]);

  return (
    <div className="max-w-lg lg:max-w-6xl mx-auto px-4 lg:px-8 py-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <WizardDoodle className="w-14 h-14 shrink-0 text-foreground" />
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Performance</p>
            <h1 className="text-2xl font-bold">Analytics</h1>
          </div>
        </div>
        <div className="flex gap-1 p-1 rounded-full bg-muted">
          {(["Taha", "Sophiya", "All"] as const).map((w) => (
            <button
              key={w}
              onClick={() => setWho(w)}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
              style={who === w ? { background: "var(--card)", color: "var(--foreground)", boxShadow: "0 1px 3px oklch(0 0 0 / 10%)" } : { color: "var(--muted-foreground)" }}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      {!loaded ? (
        <div className="rounded-2xl border bg-card border-border shadow-sm p-10 text-center text-sm text-muted-foreground">
          Loading real post data…
        </div>
      ) : original.length === 0 ? (
        <div className="rounded-2xl border bg-card border-border shadow-sm p-10 flex flex-col items-center gap-4 text-center">
          <ChartSproutDoodle className="w-40 text-foreground" />
          <p className="text-sm text-muted-foreground max-w-sm">
            No posts scraped yet for {who}. Run{" "}
            <code className="text-[11px] px-1.5 py-0.5 rounded bg-muted">doppler run -- node scripts/sync-account-posts.mjs --run</code>{" "}
            to pull them.
          </p>
        </div>
      ) : (
        <>
          <StatCards cards={cards} />
          <PerformanceChart posts={original} />

          <div className="grid lg:grid-cols-2 gap-5">
            <ContentStreak posts={original} />
            <BestDayToPost posts={original} />
          </div>

          <TopPosts posts={original} who={who} />
          <CommentHeatmap dates={commentDates} />

          <div className="grid lg:grid-cols-2 gap-5">
            <PostTypes data={typeData} metricLabel="reactions" />
            {/* Honest data note */}
            <div className="rounded-2xl border border-border bg-muted/40 p-5 flex gap-3">
              <Info size={16} className="text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground space-y-1.5">
                <p><span className="font-semibold text-foreground">Views &amp; impressions aren&apos;t shown</span> — LinkedIn only reveals those to the post owner in native analytics; no scraper can pull them. Everything here is real public data: reactions, comments, reposts.</p>
                {lastScraped && (
                  <p className="flex items-center gap-1">
                    <RefreshCw size={11} /> Last synced {lastScraped.slice(0, 10)} · refreshes daily via{" "}
                    <code className="px-1 rounded bg-muted">sync-account-posts.mjs</code>
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
