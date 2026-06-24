"use client";

import {
  ExternalLink,
  Star,
  ArrowBigUp,
  Linkedin,
  MessageCircle,
  Newspaper,
  Wrench,
} from "lucide-react";
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

// Topic categories (light, social-feed look). Each maps from the Intel `type`.
export const CATEGORY_META: Record<
  string,
  { label: string; color: string; Icon: typeof Linkedin }
> = {
  linkedin: { label: "Creators", color: "#0a66c2", Icon: Linkedin },
  reddit: { label: "Community", color: "#ff4500", Icon: MessageCircle },
  news: { label: "News", color: "#dc2626", Icon: Newspaper },
  tools: { label: "Tool Update", color: "#7c3aed", Icon: Wrench },
};

export function catFor(type: string) {
  return CATEGORY_META[type] || { label: type, color: "#6b7280", Icon: Newspaper };
}

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
  return `${Math.floor(days / 7)}w ago`;
}

export default function NewsItem({
  item,
  isNew,
}: {
  item: NewsItemData;
  isNew?: boolean;
}) {
  const [starred, setStarred] = useState(item.starred);
  const [pending, setPending] = useState(false);

  const toggleStar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!item.rowIndex || pending) return;
    setPending(true);
    const next = !starred;
    setStarred(next);
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

  const open = () => window.open(item.url, "_blank", "noopener,noreferrer");
  const { label, color, Icon } = catFor(item.type);
  const displayTimestamp = item.posted_at || item.pulled_at;

  return (
    <article
      onClick={open}
      className="group relative cursor-pointer rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200/80 transition hover:shadow-md hover:ring-gray-300"
      style={isNew ? { boxShadow: "0 0 0 1.5px #b1130f, 0 1px 3px rgba(0,0,0,.06)" } : undefined}
    >
      {/* header row */}
      <div className="mb-2 flex items-center gap-2">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white"
          style={{ background: color }}
        >
          <Icon size={15} />
        </span>
        <span className="truncate text-[13px] font-semibold text-gray-800">
          {item.source || label}
        </span>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ background: `${color}14`, color }}
        >
          {label}
        </span>
        {isNew && (
          <span className="shrink-0 rounded-full bg-[#b1130f] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
            new
          </span>
        )}
        <span className="ml-auto shrink-0 text-[11px] text-gray-400">
          {timeAgo(displayTimestamp)}
        </span>
      </div>

      {/* title + summary */}
      <h3 className="mb-1 text-[15px] font-semibold leading-snug text-gray-900 group-hover:text-[#b1130f]">
        {item.title}
      </h3>
      {item.summary && (
        <p className="line-clamp-2 text-[13px] leading-relaxed text-gray-500">
          {item.summary}
        </p>
      )}

      {/* footer */}
      <div className="mt-3 flex items-center gap-3">
        {item.score > 0 && (
          <span className="flex items-center gap-0.5 text-[11px] font-semibold text-gray-500">
            <ArrowBigUp size={13} /> {item.score}
          </span>
        )}
        <span className="flex items-center gap-1 text-[11px] text-gray-400 group-hover:text-[#b1130f]">
          <ExternalLink size={12} /> open source
        </span>
        <button
          onClick={toggleStar}
          disabled={pending || !item.rowIndex}
          aria-label={starred ? "Unsave" : "Save"}
          className="ml-auto rounded-full p-1.5 transition hover:bg-gray-100 disabled:opacity-40"
        >
          <Star
            size={16}
            fill={starred ? "#f5b301" : "none"}
            stroke={starred ? "#f5b301" : "#9ca3af"}
          />
        </button>
      </div>
    </article>
  );
}
