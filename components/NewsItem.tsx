"use client";

import { ExternalLink, Star, ArrowBigUp } from "lucide-react";
import { useState } from "react";

export interface NewsItemData {
  rowIndex?: number;
  pulled_at: string;
  posted_at: string;
  type: string;
  source: string;
  title: string;
  url: string;
  summary: string;
  score: number;
  starred: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  linkedin: "#0a66c2",
  reddit: "#ff4500",
  news: "#dc2626",
};

const TYPE_LABELS: Record<string, string> = {
  linkedin: "linkedin",
  reddit: "reddit",
  news: "news",
};

function timeAgo(iso: string): string {
  const t = Date.parse(iso);
  if (isNaN(t)) return "";
  const diff = Date.now() - t;
  const mins = Math.floor(diff / (1000 * 60));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

function fullDate(iso: string): string {
  const t = Date.parse(iso);
  if (isNaN(t)) return "";
  return new Date(t).toLocaleString();
}

export default function NewsItem({ item }: { item: NewsItemData }) {
  const [starred, setStarred] = useState(item.starred);
  const [pending, setPending] = useState(false);

  const toggleStar = async () => {
    if (!item.rowIndex || pending) return;
    setPending(true);
    const next = !starred;
    setStarred(next); // optimistic
    try {
      const res = await fetch("/api/news/star", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowIndex: item.rowIndex, starred: next }),
      });
      if (!res.ok) setStarred(!next);
    } catch {
      setStarred(!next);
    } finally {
      setPending(false);
    }
  };

  const color = TYPE_COLORS[item.type] || "var(--color-accent)";
  const label = TYPE_LABELS[item.type] || item.type;

  // Prefer posted_at (when the post was created); fall back to pulled_at.
  const displayTimestamp = item.posted_at || item.pulled_at;
  const timeLabel = item.posted_at ? "posted" : "pulled";

  return (
    <div
      className="rounded-xl border p-4 transition-colors"
      style={{
        background: "var(--surface-1)",
        borderColor: "var(--border-subtle)",
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span
              className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md text-white"
              style={{ background: color }}
            >
              {label}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {item.source}
            </span>
            {item.score > 0 && (
              <span
                className="flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md"
                style={{
                  background: "var(--surface-2)",
                  color: "var(--color-accent)",
                }}
                title={`${item.score} upvotes`}
              >
                <ArrowBigUp size={12} />
                {item.score}
              </span>
            )}
          </div>

          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block group"
          >
            <h3
              className="text-sm font-semibold leading-snug mb-1 group-hover:underline"
              style={{ color: "var(--foreground)" }}
            >
              {item.title}
            </h3>
            {item.summary && (
              <p
                className="text-xs leading-relaxed line-clamp-3"
                style={{ color: "var(--muted-foreground, #888)" }}
              >
                {item.summary}
              </p>
            )}
          </a>

          <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
            <span title={fullDate(displayTimestamp)}>
              {timeLabel} {timeAgo(displayTimestamp)}
            </span>
            {item.posted_at && (
              <span className="opacity-60">· {fullDate(item.posted_at)}</span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 shrink-0">
          <button
            onClick={toggleStar}
            disabled={pending || !item.rowIndex}
            aria-label={starred ? "Unstar" : "Star"}
            className="p-1.5 rounded-md transition-colors hover:bg-white/5 disabled:opacity-50"
          >
            <Star
              size={16}
              fill={starred ? color : "none"}
              stroke={starred ? color : "currentColor"}
            />
          </button>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-md transition-colors hover:bg-white/5"
            aria-label="Open link"
          >
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}
