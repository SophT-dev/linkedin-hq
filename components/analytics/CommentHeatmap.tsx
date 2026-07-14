"use client";

import { useMemo } from "react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, format,
} from "date-fns";
import { heatLevel } from "@/lib/analytics";

const LEVEL_VAR = ["--heat-0", "--heat-1", "--heat-2", "--heat-3", "--heat-4"] as const;
const DOW = ["S", "M", "T", "W", "T", "F", "S"];

// A compact calendar of the CURRENT month, each day tinted by how many comments
// were posted that day. Reads as complete even when activity is low (unlike a
// 12-month contribution strip, which looks broken with only a few data points).
export default function CommentHeatmap({ dates }: { dates: string[] }) {
  const today = new Date();

  const perDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const iso of dates) {
      if (!iso) continue;
      const key = iso.slice(0, 10); // yyyy-MM-dd
      m.set(key, (m.get(key) || 0) + 1);
    }
    return m;
  }, [dates]);

  const days = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(today), { weekStartsOn: 0 });
    const gridEnd = endOfWeek(endOfMonth(today), { weekStartsOn: 0 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const max = useMemo(() => Math.max(1, ...[...perDay.values()]), [perDay]);
  const monthTotal = useMemo(
    () => days.reduce((a, d) => a + (isSameMonth(d, today) ? (perDay.get(format(d, "yyyy-MM-dd")) || 0) : 0), 0),
    [days, perDay, today]
  );

  return (
    <div className="rounded-2xl border bg-card border-border shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">
          Your commenting activity <span className="text-muted-foreground font-normal text-sm">· {format(today, "MMMM")}</span>
        </h2>
        <span className="text-xs text-muted-foreground tabular-nums">{monthTotal} comment{monthTotal === 1 ? "" : "s"}</span>
      </div>

      <div className="max-w-[320px]">
        <div className="grid grid-cols-7 gap-1.5 mb-1.5">
          {DOW.map((d, i) => (
            <div key={i} className="text-center text-[11px] font-medium text-muted-foreground">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((day) => {
            const inMonth = isSameMonth(day, today);
            const count = perDay.get(format(day, "yyyy-MM-dd")) || 0;
            const level = count > 0 ? heatLevel(count, max) : 0;
            const strong = level >= 3;
            return (
              <div
                key={day.toISOString()}
                title={inMonth ? `${format(day, "MMM d")} · ${count} comment${count === 1 ? "" : "s"}` : ""}
                className="aspect-square rounded-lg flex items-center justify-center text-[11px] font-medium"
                style={{
                  background: inMonth ? `var(${LEVEL_VAR[level]})` : "transparent",
                  color: strong ? "white" : "var(--muted-foreground)",
                  opacity: inMonth ? 1 : 0.25,
                  outline: isSameDay(day, today) ? "2px solid var(--primary)" : "none",
                  outlineOffset: "-2px",
                }}
              >
                {format(day, "d")}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        Less
        {LEVEL_VAR.map((v) => <span key={v} className="w-3.5 h-3.5 rounded" style={{ background: `var(${v})` }} />)}
        More
      </div>
    </div>
  );
}
