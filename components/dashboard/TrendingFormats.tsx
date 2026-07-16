"use client";

import { useEffect, useState } from "react";
import { Star, ThumbsUp, MessageCircle, ExternalLink, Tag } from "lucide-react";
import { safeDate } from "./time";

// ⭐ Starred posts from the Template Library — the "capture while it's hot"
// strip. Newest date_added first, horizontal scroll. Blank suggested_format
// means the intake hasn't enriched it yet, shown as an "unclassified" pill.

interface Starred {
  hook: string;
  suggested_format: string;
  expert: string;
  likes: number;
  comments: number;
  url: string;
  date_added: string;
  key: string;
}

export default function TrendingFormats() {
  const [rows, setRows] = useState<Starred[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/sheets?tab=${encodeURIComponent("Template Library")}&range=A:L`);
        if (!res.ok) { setRows([]); return; }
        const { rows } = await res.json();
        // Cols: hook|format|expert|domain|likes|comments|shares|ratio|tier|url|date_added|starred
        const starred: Starred[] = (rows as string[][])
          .slice(1)
          .map((r, i) => ({
            hook: r[0] || "",
            suggested_format: r[1] || "",
            expert: r[2] || "",
            likes: Number.parseInt(r[4] || "0", 10) || 0,
            comments: Number.parseInt(r[5] || "0", 10) || 0,
            url: r[9] || "",
            date_added: r[10] || "",
            key: r[9] || `row-${i}`,
            _starred: (r[11] || "").trim(),
          }))
          .filter((r) => r.hook && /^true$/i.test(r._starred))
          .sort((a, b) => {
            const da = safeDate(a.date_added), db = safeDate(b.date_added);
            if (da && db) return db.getTime() - da.getTime();
            return (b.date_added || "").localeCompare(a.date_added || "");
          })
          .map(({ _starred, ...rest }) => { void _starred; return rest; });
        setRows(starred);
      } catch {
        setRows([]);
      }
    })();
  }, []);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Star size={16} className="fill-current" style={{ color: "var(--cat-4)" }} /> Trending formats you starred
        </h2>
      </div>

      {rows === null && (
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="min-w-[260px] h-[150px] rounded-2xl border animate-pulse" style={{ background: "var(--surface-pulse)", borderColor: "var(--border-subtle)" }} />
          ))}
        </div>
      )}

      {rows !== null && rows.length === 0 && (
        <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground" style={{ borderColor: "var(--border-subtle)" }}>
          Star posts on LinkedIn with the extension <Star size={13} className="inline fill-current align-text-bottom" style={{ color: "var(--cat-4)" }} /> — they show up here while the trend is hot.
        </div>
      )}

      {rows !== null && rows.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
          {rows.map((r) => (
            <div
              key={r.key}
              className="min-w-[260px] max-w-[260px] lg:min-w-[300px] lg:max-w-[300px] snap-start rounded-2xl border bg-card p-4 flex flex-col gap-2.5 shadow-sm"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              {r.suggested_format ? (
                <span className="self-start inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full border" style={{ background: "var(--accent)", color: "var(--primary)", borderColor: "var(--border-accent)" }}>
                  <Tag size={11} strokeWidth={2.5} /> {r.suggested_format}
                </span>
              ) : (
                <span className="self-start inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border" style={{ color: "var(--muted-foreground)", borderColor: "var(--border-subtle)" }}>
                  unclassified
                </span>
              )}

              <p className="text-sm leading-snug line-clamp-2" style={{ color: "var(--foreground)" }}>{r.hook}</p>

              {r.expert && <p className="text-[11px] text-muted-foreground truncate">{r.expert}</p>}

              <div className="mt-auto flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><ThumbsUp size={12} /> {r.likes.toLocaleString()}</span>
                <span className="flex items-center gap-1"><MessageCircle size={12} /> {r.comments.toLocaleString()}</span>
                {r.url && (
                  <a href={r.url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 font-medium hover:underline" style={{ color: "var(--primary)" }}>
                    <ExternalLink size={12} /> Open
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
