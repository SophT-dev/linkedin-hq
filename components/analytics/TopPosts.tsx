"use client";

import { useMemo, useState } from "react";
import { Heart, MessageCircle, Repeat2, Flag, ExternalLink, ImageIcon, ChevronDown } from "lucide-react";
import type { AccountPost, Persona } from "@/lib/analytics";
import { score } from "@/lib/analytics";

type SortKey = "score" | "reactions" | "comments" | "recent";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "score", label: "Top score" },
  { key: "reactions", label: "Most reactions" },
  { key: "comments", label: "Most comments" },
  { key: "recent", label: "Most recent" },
];

const FLAG: Record<string, { label: string; color: string; bg: string }> = {
  winner: { label: "High", color: "var(--trend-up)", bg: "color-mix(in oklch, var(--trend-up) 14%, transparent)" },
  neutral: { label: "Medium", color: "oklch(0.62 0.14 70)", bg: "color-mix(in oklch, oklch(0.62 0.14 70) 16%, transparent)" },
  flop: { label: "Low", color: "var(--trend-down)", bg: "color-mix(in oklch, var(--trend-down) 14%, transparent)" },
};

export default function TopPosts({ posts, who }: { posts: AccountPost[]; who: Persona }) {
  const [sort, setSort] = useState<SortKey>("score");

  const rows = useMemo(() => {
    const sorted = [...posts].sort((a, b) => {
      if (sort === "recent") return (b.posted_at || "").localeCompare(a.posted_at || "");
      if (sort === "reactions") return b.reactions - a.reactions;
      if (sort === "comments") return b.comments - a.comments;
      return score(b) - score(a);
    });
    return sorted.slice(0, 8);
  }, [posts, sort]);

  return (
    <div className="rounded-2xl border bg-card border-border shadow-sm p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold">Top Posts</h2>
        <label className="relative inline-flex items-center">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="appearance-none rounded-full border border-border bg-card pl-3.5 pr-8 py-1.5 text-xs font-medium text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          >
            {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 pointer-events-none text-muted-foreground" />
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="text-left font-medium pb-2.5 pl-1">Post</th>
              <th className="text-left font-medium pb-2.5 px-2">Date</th>
              <th className="text-right font-medium pb-2.5 px-2"><Heart size={12} className="inline" /></th>
              <th className="text-right font-medium pb-2.5 px-2"><MessageCircle size={12} className="inline" /></th>
              <th className="text-right font-medium pb-2.5 px-2"><Repeat2 size={12} className="inline" /></th>
              <th className="text-left font-medium pb-2.5 px-2">Perf.</th>
              <th className="pb-2.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => {
              const flag = FLAG[p.worked] || FLAG.neutral;
              return (
                <tr key={p.url || i} className="border-t border-border hover:bg-muted/50 transition-colors">
                  <td className="py-3 pl-1">
                    <div className="flex items-center gap-3 max-w-[280px]">
                      <span className="shrink-0 w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground">
                        <ImageIcon size={15} />
                      </span>
                      <span className="line-clamp-2 text-[13px] leading-snug">{p.text || "(no text)"}</span>
                    </div>
                  </td>
                  <td className="px-2 text-xs text-muted-foreground whitespace-nowrap">{(p.posted_at_display || p.posted_at || "").slice(0, 12)}</td>
                  <td className="px-2 text-right tabular-nums">{p.reactions}</td>
                  <td className="px-2 text-right tabular-nums">{p.comments}</td>
                  <td className="px-2 text-right tabular-nums">{p.reposts}</td>
                  <td className="px-2">
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap" style={{ color: flag.color, background: flag.bg }}>
                      <Flag size={10} /> {flag.label}
                    </span>
                  </td>
                  <td className="pr-1 text-right">
                    {p.url && (
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="inline-block p-1" style={{ color: "var(--primary)" }} aria-label="Open post">
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
