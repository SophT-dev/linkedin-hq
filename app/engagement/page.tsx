"use client";

import { useState, useEffect } from "react";
import { MessageSquare, ExternalLink, Flame, Zap, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Candidate {
  url: string;
  title: string;
  summary: string;
  score: number;
  source: string;
  posted_at: string;
  posted_at_display: string;
  image_url: string;
  hoursAgo: number | null;
  status: string; // "new" | "draft" | ...
}

interface FeedResponse {
  recommended: Candidate | null;
  candidates: Candidate[];
  windowHours: number;
  weeklyProgress: { sent: number; cap: number };
}

function excerpt(text: string, max = 200): string {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : clean.slice(0, max - 1) + "…";
}

function ago(h: number | null, fallback: string): string {
  if (h === null) return fallback || "";
  if (h <= 0) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function StatusPill({ status }: { status: string }) {
  const draft = status === "draft";
  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
      style={draft
        ? { background: "var(--accent)", color: "var(--primary)" }
        : { background: "var(--muted)", color: "var(--muted-foreground)" }}
    >
      {draft ? "Draft ready" : "Not engaged"}
    </span>
  );
}

function PostRow({ c, thumb = true }: { c: Candidate; thumb?: boolean }) {
  return (
    <div className="flex gap-3">
      {thumb && c.image_url && (
        <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-muted border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
        </div>
      )}
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-sm leading-snug">{c.title || c.source || "LinkedIn post"}</p>
          <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">score {c.score}</span>
        </div>
        {c.summary && <p className="text-xs text-muted-foreground line-clamp-2">{excerpt(c.summary)}</p>}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
          {c.source && <span className="font-medium text-foreground/80">{c.source}</span>}
          <span className="inline-flex items-center gap-1"><Clock size={10} /> {ago(c.hoursAgo, c.posted_at_display)}</span>
          <StatusPill status={c.status} />
        </div>
      </div>
    </div>
  );
}

export default function EngagementPage() {
  const [data, setData] = useState<FeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/comments/feed");
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const sent = data?.weeklyProgress.sent ?? 0;
  const cap = data?.weeklyProgress.cap ?? 0;
  const pct = cap > 0 ? Math.min(100, Math.round((sent / cap) * 100)) : 0;
  const rec = data?.recommended || null;
  // The full list minus the recommended one (so it isn't shown twice).
  const rest = (data?.candidates || []).filter((c) => c.url !== rec?.url);

  return (
    <div className="max-w-lg lg:max-w-4xl mx-auto px-4 lg:px-6 py-6 space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Content</p>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare size={22} style={{ color: "var(--primary)" }} /> Engagement
          </h1>
        </div>
        <button onClick={load} className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {loading && (
        <div className="rounded-2xl p-4 border bg-card border-border shadow-sm text-sm text-muted-foreground">Loading the last 48h of posts…</div>
      )}

      {error && !loading && (
        <div className="rounded-2xl p-4 border bg-card border-border shadow-sm text-sm" style={{ color: "var(--destructive)" }}>
          Couldn&apos;t load the engagement feed: {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* Weekly progress */}
          <div className="rounded-2xl p-4 border bg-card border-border shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">Weekly progress</span>
              <span className="text-muted-foreground">{sent}/{cap} comments this week</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden bg-muted">
              <div style={{ width: `${pct}%`, background: "var(--primary)" }} className="h-full transition-all" />
            </div>
          </div>

          {/* Engage now — the single recommended pick */}
          {rec && (
            <div className="rounded-2xl p-4 lg:p-5 border shadow-sm space-y-3" style={{ background: "var(--accent)", borderColor: "var(--border-accent)" }}>
              <div className="flex items-center gap-2">
                <Zap size={16} style={{ color: "var(--primary)" }} />
                <h2 className="text-sm font-bold" style={{ color: "var(--primary)" }}>Engage with this right now</h2>
                <span className="text-[11px] text-muted-foreground">· freshest high-signal post</span>
              </div>
              <div className="rounded-xl bg-card border border-border p-4">
                <PostRow c={rec} />
                <div className="pt-3">
                  <a href={rec.url} target="_blank" rel="noreferrer">
                    <Button size="sm"><ExternalLink size={13} className="mr-1" /> Open &amp; comment</Button>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* The rest of the 48h feed */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-1.5">
                <Flame size={15} style={{ color: "var(--primary)" }} /> Posts to engage with
                <span className="font-normal text-muted-foreground">· last {data.windowHours}h</span>
              </h2>
              <span className="text-xs text-muted-foreground">{rest.length} waiting</span>
            </div>

            {rest.length === 0 && !rec ? (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No new posts in the last {data.windowHours}h — the automation hasn&apos;t pulled anything fresh yet. Check back after the next Intel pull.
              </div>
            ) : (
              <div className="space-y-2.5">
                {rest.map((c) => (
                  <div key={c.url} className="rounded-2xl border bg-card border-border shadow-sm p-4 hover:shadow-md transition-shadow">
                    <PostRow c={c} />
                    <div className="flex items-center justify-between gap-2 pt-3">
                      <a href={c.url} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline"><ExternalLink size={13} className="mr-1" /> View post</Button>
                      </a>
                      <span className="text-[11px] text-muted-foreground text-right hidden sm:block">Comment via the Chrome extension</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground px-1">
            Shows every creator post the automation pulled into Intel in the last {data.windowHours}h that you haven&apos;t commented on yet, newest first. People rarely reply to comments after ~48h, so engage while they&apos;re fresh.
          </p>
        </>
      )}
    </div>
  );
}
