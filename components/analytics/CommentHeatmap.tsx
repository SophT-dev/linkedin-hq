"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import type { HeatCell } from "@/lib/analytics";
import { commentHeatmap, heatLevel } from "@/lib/analytics";

const LEVEL_VAR = ["--heat-0", "--heat-1", "--heat-2", "--heat-3", "--heat-4"] as const;
const ROW_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""]; // Mon-first rows

export default function CommentHeatmap({ dates, weeks = 5 }: { dates: string[]; weeks?: number }) {
  const cols = useMemo(() => commentHeatmap(dates, weeks), [dates, weeks]);
  const max = useMemo(() => Math.max(1, ...cols.flat().map((c) => c.count)), [cols]);
  const total = useMemo(() => cols.flat().reduce((a, c) => a + c.count, 0), [cols]);

  // Month labels above the first column of each new month.
  const monthLabels = useMemo(() => {
    let last = "";
    return cols.map((week) => {
      const first = week[0];
      try {
        const m = format(parseISO(first.date), "MMM");
        if (m !== last) { last = m; return m; }
      } catch { /* skip */ }
      return "";
    });
  }, [cols]);

  const cell = (c: HeatCell) => {
    const level = c.inFuture ? 0 : heatLevel(c.count, max);
    return (
      <div
        key={c.date}
        title={c.inFuture ? "" : `${c.date} · ${c.count} comment${c.count === 1 ? "" : "s"}`}
        className="w-5 h-5 rounded-md"
        style={{ background: `var(${LEVEL_VAR[level]})`, opacity: c.inFuture ? 0 : 1 }}
      />
    );
  };

  return (
    <div className="rounded-2xl border bg-card border-border shadow-sm p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">Your commenting activity <span className="text-muted-foreground font-normal text-sm">· last 30 days</span></h2>
        <span className="text-xs text-muted-foreground tabular-nums">{total} comments</span>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="inline-flex flex-col gap-1.5 min-w-max">
          {/* month row */}
          <div className="flex gap-1.5 pl-10">
            {monthLabels.map((m, i) => (
              <div key={i} className="w-5 text-[11px] text-muted-foreground relative">
                {m && <span className="absolute -top-0.5 left-0 whitespace-nowrap">{m}</span>}
              </div>
            ))}
          </div>
          {/* 7 day-rows */}
          <div className="flex gap-1.5">
            {/* left day labels */}
            <div className="flex flex-col gap-1.5 pr-1 w-9 shrink-0">
              {ROW_LABELS.map((l, i) => (
                <div key={i} className="h-5 text-[11px] text-muted-foreground leading-5 text-right">{l}</div>
              ))}
            </div>
            {/* week columns */}
            {cols.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1.5">
                {week.map((c) => cell(c))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-1.5 text-[11px] text-muted-foreground">
        Less
        {LEVEL_VAR.map((v) => <span key={v} className="w-4 h-4 rounded" style={{ background: `var(${v})` }} />)}
        More
      </div>
    </div>
  );
}
