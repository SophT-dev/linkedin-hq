"use client";

import { useMemo } from "react";
import { Flame } from "lucide-react";
import type { AccountPost } from "@/lib/analytics";
import { streakGrid, heatLevel } from "@/lib/analytics";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const LEVEL_VAR = ["--heat-0", "--heat-1", "--heat-2", "--heat-3", "--heat-4"] as const;

export default function ContentStreak({ posts, weeks = 10 }: { posts: AccountPost[]; weeks?: number }) {
  const cols = useMemo(() => streakGrid(posts, weeks), [posts, weeks]);
  const max = useMemo(() => Math.max(1, ...cols.flat().map((c) => c.count)), [cols]);

  // Current run of consecutive days (up to today) with ≥1 post.
  const currentStreak = useMemo(() => {
    const flat = cols.flat().filter((c) => !c.inFuture);
    let run = 0;
    for (let i = flat.length - 1; i >= 0; i--) {
      if (flat[i].count > 0) run++;
      else break;
    }
    return run;
  }, [cols]);

  return (
    <div className="rounded-2xl border bg-card border-border shadow-sm p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">Content Streak</h2>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: "var(--primary)" }}>
          <Flame size={16} /> {currentStreak} day{currentStreak === 1 ? "" : "s"}
        </span>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 gap-1.5 lg:gap-2">
        {DAY_LABELS.map((d, i) => (
          <div key={i} className="text-center text-[11px] font-medium text-muted-foreground">{d}</div>
        ))}
      </div>

      {/* Weeks as rows */}
      <div className="space-y-1.5 lg:space-y-2">
        {cols.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1.5 lg:gap-2">
            {week.map((cell) => {
              const level = cell.inFuture ? 0 : heatLevel(cell.count, max);
              return (
                <div
                  key={cell.date}
                  title={cell.inFuture ? "" : `${cell.date} · ${cell.count} post${cell.count === 1 ? "" : "s"}`}
                  className="h-6 rounded-lg transition-colors"
                  style={{
                    background: cell.inFuture ? "transparent" : `var(${LEVEL_VAR[level]})`,
                    opacity: cell.inFuture ? 0.35 : 1,
                    border: cell.inFuture ? "1px dashed var(--border)" : "none",
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-1.5 text-[11px] text-muted-foreground">
        Less
        {LEVEL_VAR.map((v) => (
          <span key={v} className="w-3.5 h-3.5 rounded" style={{ background: `var(${v})` }} />
        ))}
        More
      </div>
    </div>
  );
}
