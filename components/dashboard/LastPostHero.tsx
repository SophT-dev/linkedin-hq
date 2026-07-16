"use client";

import { useEffect, useState } from "react";
import { Heart, MessageCircle, Repeat2, ExternalLink, Megaphone } from "lucide-react";
import { fetchAccountPosts, score, type AccountPost } from "@/lib/analytics";
import { timeAgo } from "./time";

// Newest post from the Account Posts tab (Taha's profile primary). Shows the
// text preview, freshness, engagement, a house-scored winner/neutral/flop
// badge, and — if the Posts tab has a matching posted_url row — when its
// stats were last synced.

type Verdict = "winner" | "neutral" | "flop";

// House scoring shared with the rest of the app: score = reactions + comments×3.
// Prefer the sheet's own `worked` verdict; fall back to deriving it.
function verdictFor(p: AccountPost): Verdict {
  const w = (p.worked || "").toLowerCase();
  if (w === "winner" || w === "neutral" || w === "flop") return w as Verdict;
  const s = score(p);
  if (s >= 80) return "winner";
  if (s <= 15) return "flop";
  return "neutral";
}

const VERDICT_STYLE: Record<Verdict, { label: string; bg: string; fg: string }> = {
  winner: { label: "Winner", bg: "color-mix(in oklab, var(--trend-up) 16%, transparent)", fg: "var(--trend-up)" },
  neutral: { label: "Neutral", bg: "var(--surface-4)", fg: "var(--muted-foreground)" },
  flop: { label: "Flop", bg: "color-mix(in oklab, var(--trend-down) 16%, transparent)", fg: "var(--trend-down)" },
};

interface HeroData {
  post: AccountPost;
  statsSyncedAt: string | null;
}

function pickLatest(posts: AccountPost[]): AccountPost | null {
  if (posts.length === 0) return null;
  const byDate = (a: AccountPost, b: AccountPost) => (b.posted_at || "").localeCompare(a.posted_at || "");
  // Taha's real (regular) posts first, then any Taha post, then anyone's.
  const tahaRegular = posts.filter((p) => p.creator === "Taha" && p.post_type === "regular").sort(byDate);
  if (tahaRegular[0]) return tahaRegular[0];
  const taha = posts.filter((p) => p.creator === "Taha").sort(byDate);
  if (taha[0]) return taha[0];
  return [...posts].sort(byDate)[0];
}

export default function LastPostHero() {
  const [data, setData] = useState<HeroData | null | "empty">(null);

  useEffect(() => {
    (async () => {
      try {
        const [posts, postsTab] = await Promise.all([
          fetchAccountPosts(),
          fetch("/api/sheets?tab=Posts&range=A:Q").then((r) => (r.ok ? r.json() : { rows: [] })).catch(() => ({ rows: [] })),
        ]);
        const post = pickLatest(posts);
        if (!post) { setData("empty"); return; }

        // Match by posted_url (Posts col L = idx 11), read stats_updated_at (col Q = idx 16).
        let statsSyncedAt: string | null = null;
        const rows = (postsTab?.rows as string[][]) || [];
        const match = post.url ? rows.slice(1).find((r) => (r[11] || "").trim() === post.url.trim()) : undefined;
        if (match && match[16]) statsSyncedAt = match[16];

        setData({ post, statsSyncedAt });
      } catch {
        setData("empty");
      }
    })();
  }, []);

  if (data === null) {
    return <div className="rounded-2xl border h-[168px] animate-pulse" style={{ background: "var(--surface-pulse)", borderColor: "var(--border-subtle)" }} />;
  }

  if (data === "empty") {
    return (
      <div className="rounded-2xl border p-5" style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)" }}>
        <div className="flex items-center gap-2 text-sm font-semibold mb-1">
          <Megaphone size={16} style={{ color: "var(--primary)" }} /> Your last post
        </div>
        <p className="text-sm text-muted-foreground">No posts scraped yet. Once the daily Account Posts scrape runs, your newest post shows up here with its engagement and a winner/flop verdict.</p>
      </div>
    );
  }

  const { post, statsSyncedAt } = data;
  const verdict = verdictFor(post);
  const vs = VERDICT_STYLE[verdict];

  return (
    <div className="rounded-2xl border p-5 space-y-3 lg:flex lg:gap-6 lg:space-y-0" style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)" }}>
      <div className="lg:flex-1 lg:min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
            <Megaphone size={16} style={{ color: "var(--primary)" }} /> Your last post
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide" style={{ background: vs.bg, color: vs.fg }}>
            {vs.label}
          </span>
          {post.posted_at && (
            <span className="text-xs text-muted-foreground">· {timeAgo(post.posted_at)}</span>
          )}
        </div>

        <p className="text-sm leading-snug line-clamp-4 whitespace-pre-line" style={{ color: "var(--foreground)" }}>
          {post.text || "(no text captured for this post)"}
        </p>

        {post.url && (
          <a href={post.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium hover:underline" style={{ color: "var(--primary)" }}>
            <ExternalLink size={13} /> View on LinkedIn
          </a>
        )}
      </div>

      <div className="flex items-center gap-4 lg:flex-col lg:items-end lg:justify-center lg:gap-2 lg:shrink-0 lg:pl-6 lg:border-l" style={{ borderColor: "var(--border-subtle)" }}>
        <Stat icon={<Heart size={15} />} value={post.reactions} tint="var(--viz-2)" />
        <Stat icon={<MessageCircle size={15} />} value={post.comments} tint="var(--primary)" />
        <Stat icon={<Repeat2 size={15} />} value={post.reposts} tint="var(--cat-1)" />
        {statsSyncedAt && (
          <span className="text-[10px] text-muted-foreground lg:mt-1" title={`Posts tab stats_updated_at: ${statsSyncedAt}`}>
            stats synced {timeAgo(statsSyncedAt)}
          </span>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, value, tint }: { icon: React.ReactNode; value: number; tint: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
      <span style={{ color: tint }}>{icon}</span>
      {value.toLocaleString()}
    </span>
  );
}
