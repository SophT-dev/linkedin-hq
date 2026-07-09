"use client";

import { useState, useEffect } from "react";
import { MessageSquare, ExternalLink, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Candidate {
  url: string;
  title: string;
  summary: string;
  score: number;
  source: string;
  posted_at_display: string;
}

interface FeedResponse {
  candidates: Candidate[];
  weeklyProgress: { sent: number; cap: number };
}

function excerpt(text: string, max = 180): string {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1) + "…";
}

export default function EngagementPage() {
  const [data, setData] = useState<FeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/comments/feed");
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sent = data?.weeklyProgress.sent ?? 0;
  const cap = data?.weeklyProgress.cap ?? 0;
  const pct = cap > 0 ? Math.min(100, Math.round((sent / cap) * 100)) : 0;

  return (
    <div className="max-w-lg lg:max-w-4xl mx-auto px-4 py-6 space-y-5">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
          Content
        </p>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <MessageSquare size={20} className="text-indigo-400" /> Engagement
        </h1>
      </div>

      {loading && (
        <div
          className="rounded-2xl p-4 border text-sm text-muted-foreground"
          style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)" }}
        >
          Loading engagement data…
        </div>
      )}

      {error && !loading && (
        <div
          className="rounded-2xl p-4 border text-sm text-red-400"
          style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)" }}
        >
          Couldn&apos;t load the engagement feed: {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* Weekly progress */}
          <div
            className="rounded-2xl p-4 border space-y-2"
            style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)" }}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">Weekly progress</span>
              <span className="text-muted-foreground">
                {sent}/{cap} comments sent this week
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden bg-white/5">
              <div
                style={{ width: `${pct}%` }}
                className="h-full bg-indigo-400 transition-all"
              />
            </div>
          </div>

          {/* Posts to engage with */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-1.5">
                <Flame size={15} className="text-amber-400" /> Posts to engage with
              </h2>
              <span className="text-xs text-muted-foreground">
                {data.candidates.length} candidate{data.candidates.length === 1 ? "" : "s"}
              </span>
            </div>

            {data.candidates.length === 0 ? (
              <div
                className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                Nothing worth engaging with right now — check back after the next Intel pull.
              </div>
            ) : (
              <div className="space-y-2.5">
                {data.candidates.map((c) => (
                  <div
                    key={c.url}
                    className="rounded-2xl border p-4 space-y-2"
                    style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)" }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-sm leading-snug">{c.title || "Untitled post"}</p>
                      <span className="flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full border border-white/10 text-muted-foreground">
                        score {c.score}
                      </span>
                    </div>
                    {c.summary && (
                      <p className="text-xs text-muted-foreground">{excerpt(c.summary)}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      {c.source && <span>{c.source}</span>}
                      {c.posted_at_display && <span>· {c.posted_at_display}</span>}
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <a href={c.url} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline">
                          <ExternalLink size={13} className="mr-1" /> View post
                        </Button>
                      </a>
                      <span className="text-[11px] text-muted-foreground text-right">
                        Comment via the Chrome extension or <code>/api/comments/suggest</code>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Replies needed — no DM tracking exists yet, show it honestly */}
          <div
            className="rounded-2xl p-4 border space-y-1"
            style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)" }}
          >
            <p className="text-sm font-semibold">Replies needed</p>
            <p className="text-xs text-muted-foreground">
              0 (LinkedIn DM tracking not built yet)
            </p>
          </div>
        </>
      )}
    </div>
  );
}
