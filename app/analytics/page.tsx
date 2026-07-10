"use client";

import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { BarChart2, TrendingUp, Heart, MessageCircle, Repeat2, Trophy, ExternalLink, RefreshCw, Info } from "lucide-react";

// Reads the "Account Posts" tab (A:M) -- our OWN posts (Taha + Sophiya) scraped
// daily via scripts/sync-account-posts.mjs. Real reactions/comments/reposts.
// Views/impressions/saves are deliberately absent -- no public scraper can get
// them (owner-only). See the honest note at the bottom of the page.
interface AccountPost {
  creator: string;
  posted_at: string;
  posted_at_display: string;
  post_type: string;
  text: string;
  reactions: number;
  comments: number;
  reposts: number;
  worked: string;
  url: string;
  last_scraped: string;
}

const WORKED_ORDER = ["winner", "neutral", "flop"] as const;
const WORKED_COLOR: Record<string, string> = {
  winner: "oklch(0.65 0.17 150)", // green
  neutral: "oklch(0.75 0.14 85)", // amber
  flop: "oklch(0.62 0.19 25)", // red
};
const score = (p: AccountPost) => p.reactions + p.comments * 3;

export default function Analytics() {
  const [posts, setPosts] = useState<AccountPost[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [who, setWho] = useState<"All" | "Taha" | "Sophiya">("Taha");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/sheets?tab=Account%20Posts&range=A:M");
      if (res.ok) {
        const { rows } = await res.json();
        setPosts(
          (rows as string[][]).slice(1).filter((r) => r[0]?.trim()).map((r) => ({
            creator: r[0], posted_at: r[2] || "", posted_at_display: r[3] || "",
            post_type: r[4] || "post", text: r[5] || "",
            reactions: parseInt(r[6]) || 0, comments: parseInt(r[7]) || 0, reposts: parseInt(r[8]) || 0,
            worked: (r[9] || "").toLowerCase(), url: r[10] || "", last_scraped: r[12] || "",
          }))
        );
      }
      setLoaded(true);
    })();
  }, []);

  const filtered = useMemo(
    () => posts.filter((p) => who === "All" || p.creator === who).sort((a, b) => (a.posted_at || "").localeCompare(b.posted_at || "")),
    [posts, who]
  );

  const totals = useMemo(() => {
    const reactions = filtered.reduce((a, p) => a + p.reactions, 0);
    const comments = filtered.reduce((a, p) => a + p.comments, 0);
    const reposts = filtered.reduce((a, p) => a + p.reposts, 0);
    const winners = filtered.filter((p) => p.worked === "winner").length;
    const n = filtered.length;
    return {
      n, reactions, comments, reposts,
      avgEng: n ? Math.round((reactions + comments) / n) : 0,
      winRate: n ? Math.round((winners / n) * 100) : 0,
    };
  }, [filtered]);

  const trend = useMemo(
    () => filtered.slice(-30).map((p) => ({ name: (p.posted_at || "").slice(5, 10), reactions: p.reactions, comments: p.comments })),
    [filtered]
  );

  const workedCounts = WORKED_ORDER.map((w) => ({ worked: w, count: filtered.filter((p) => p.worked === w).length }));
  const hasWorked = workedCounts.some((w) => w.count > 0);

  const byType = useMemo(() => {
    const types = Array.from(new Set(filtered.map((p) => p.post_type).filter(Boolean)));
    return types.map((t) => {
      const ps = filtered.filter((p) => p.post_type === t);
      return { type: t, avg: ps.length ? Math.round(ps.reduce((a, p) => a + score(p), 0) / ps.length) : 0, count: ps.length };
    }).sort((a, b) => b.avg - a.avg);
  }, [filtered]);

  const topPosts = useMemo(() => [...filtered].sort((a, b) => score(b) - score(a)).slice(0, 6), [filtered]);
  const lastScraped = useMemo(() => filtered.map((p) => p.last_scraped).filter(Boolean).sort().pop() || "", [filtered]);

  const tooltipStyle = {
    contentStyle: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px", color: "var(--foreground)", boxShadow: "0 4px 12px oklch(0 0 0 / 8%)" },
    labelStyle: { color: "var(--muted-foreground)" },
  };

  const kpis = [
    { label: "Posts", value: totals.n, icon: BarChart2, tint: "var(--primary)" },
    { label: "Reactions", value: totals.reactions.toLocaleString(), icon: Heart, tint: "oklch(0.62 0.19 25)" },
    { label: "Comments", value: totals.comments.toLocaleString(), icon: MessageCircle, tint: "var(--chart-2)" },
    { label: "Reposts", value: totals.reposts.toLocaleString(), icon: Repeat2, tint: "oklch(0.65 0.17 150)" },
    { label: "Avg Eng / Post", value: totals.avgEng.toLocaleString(), icon: TrendingUp, tint: "var(--chart-3)" },
    { label: "Winner Rate", value: `${totals.winRate}%`, icon: Trophy, tint: "oklch(0.75 0.14 85)" },
  ];

  const card = "rounded-2xl border bg-card border-border shadow-sm";

  return (
    <div className="max-w-lg lg:max-w-6xl mx-auto px-4 lg:px-8 py-6 space-y-6">
      {/* Header + profile toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Performance</p>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart2 size={22} style={{ color: "var(--primary)" }} /> My Account Analytics</h1>
        </div>
        <div className="flex gap-1 p-1 rounded-full bg-muted">
          {(["Taha", "Sophiya", "All"] as const).map((w) => (
            <button
              key={w}
              onClick={() => setWho(w)}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
              style={who === w ? { background: "var(--card)", color: "var(--foreground)", boxShadow: "0 1px 3px oklch(0 0 0 / 8%)" } : { color: "var(--muted-foreground)" }}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      {!loaded ? (
        <div className={`${card} p-8 text-center text-muted-foreground text-sm`}>Loading real post data…</div>
      ) : filtered.length === 0 ? (
        <div className={`${card} p-8 text-center text-sm text-muted-foreground`}>
          No posts scraped yet for {who}. Run <code className="text-[11px] px-1.5 py-0.5 rounded bg-muted">doppler run -- node scripts/sync-account-posts.mjs --run</code> to pull them.
        </div>
      ) : (
        <>
          {/* KPI hero row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {kpis.map(({ label, value, icon: Icon, tint }) => (
              <div key={label} className={`${card} p-4`}>
                <Icon size={18} style={{ color: tint }} />
                <p className="text-2xl font-bold mt-2 tabular-nums">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            {/* Engagement over time */}
            <div className={`${card} p-5 space-y-3 lg:col-span-2`}>
              <p className="text-sm font-semibold">Engagement Over Time <span className="text-muted-foreground font-normal">· last 30 posts</span></p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={28} />
                    <Tooltip {...tooltipStyle} />
                    <Line type="monotone" dataKey="reactions" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="comments" stroke="var(--chart-2)" strokeWidth={2.5} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: "var(--primary)" }} /> Reactions</span>
                <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: "var(--chart-2)" }} /> Comments</span>
              </div>
            </div>

            {/* Worked verdict */}
            {hasWorked && (
              <div className={`${card} p-5 space-y-3`}>
                <p className="text-sm font-semibold flex items-center gap-2"><Trophy size={16} style={{ color: "oklch(0.75 0.14 85)" }} /> How Posts Land</p>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={workedCounts}>
                      <XAxis dataKey="worked" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                      <Tooltip {...tooltipStyle} formatter={(v) => [v, "Posts"]} cursor={{ fill: "var(--muted)" }} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {workedCounts.map((w) => <Cell key={w.worked} fill={WORKED_COLOR[w.worked]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-muted-foreground">Score = reactions + comments×3. Winner ≥ 80, flop ≤ 15.</p>
              </div>
            )}
          </div>

          {/* Top posts */}
          <div className={`${card} p-5 space-y-3`}>
            <p className="text-sm font-semibold flex items-center gap-2"><TrendingUp size={16} style={{ color: "oklch(0.65 0.17 150)" }} /> Top Posts</p>
            <div className="divide-y divide-border">
              {topPosts.map((p, i) => (
                <div key={p.url || i} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="text-sm font-bold text-muted-foreground w-5 mt-0.5 tabular-nums">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm line-clamp-2">{p.text || "(no text)"}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Heart size={12} /> {p.reactions}</span>
                      <span className="flex items-center gap-1"><MessageCircle size={12} /> {p.comments}</span>
                      <span className="flex items-center gap-1"><Repeat2 size={12} /> {p.reposts}</span>
                      <span>{p.posted_at_display}</span>
                      {who === "All" && <span className="font-medium">{p.creator}</span>}
                    </div>
                  </div>
                  {p.url && (
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="p-1 flex-shrink-0" style={{ color: "var(--primary)" }}><ExternalLink size={15} /></a>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Post type performance */}
          {byType.length > 1 && (
            <div className={`${card} p-5 space-y-3`}>
              <p className="text-sm font-semibold">Post Type — Avg Score</p>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byType} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="type" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={70} />
                    <Tooltip {...tooltipStyle} formatter={(v, _n, item) => [`${v} avg · ${item?.payload?.count} posts`, "Score"]} cursor={{ fill: "var(--muted)" }} />
                    <Bar dataKey="avg" fill="var(--primary)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Honest note about what we can't scrape */}
          <div className="rounded-2xl border border-border bg-muted/40 p-4 flex gap-3">
            <Info size={16} className="text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p><span className="font-semibold text-foreground">Views, impressions &amp; saves aren&apos;t shown</span> — LinkedIn only reveals those to the post owner in native analytics; no scraper (ours or anyone&apos;s) can pull them. Everything above is real public data: reactions, comments, reposts.</p>
              {lastScraped && <p className="flex items-center gap-1"><RefreshCw size={11} /> Last synced {lastScraped.slice(0, 10)} · refreshes daily via <code className="px-1 rounded bg-muted">sync-account-posts.mjs</code></p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
