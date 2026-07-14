"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Heart, MessageCircle, Repeat2, TrendingUp, TrendingDown } from "lucide-react";
import type { AccountPost, Metric, Range } from "@/lib/analytics";
import { METRIC_LABEL, metricTrend, timeSeries } from "@/lib/analytics";

const METRICS: { key: Metric; icon: typeof Heart }[] = [
  { key: "reactions", icon: Heart },
  { key: "comments", icon: MessageCircle },
  { key: "reposts", icon: Repeat2 },
];
const RANGES: Range[] = ["Day", "Week", "Month"];

function fmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
}

export default function PerformanceChart({ posts }: { posts: AccountPost[] }) {
  const [metric, setMetric] = useState<Metric>("reactions");
  const [range, setRange] = useState<Range>("Week");

  const series = useMemo(() => timeSeries(posts, range), [posts, range]);
  const pillStats = useMemo(
    () => Object.fromEntries(METRICS.map((m) => [m.key, metricTrend(posts, m.key, 30)])) as Record<Metric, { value: number; deltaPct: number | null }>,
    [posts]
  );

  return (
    <div className="rounded-2xl border bg-card border-border shadow-sm p-4 lg:p-6 space-y-5">
      {/* Header: metric pills (left) + range toggle (right) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {METRICS.map(({ key, icon: Icon }) => {
            const active = metric === key;
            const { value, deltaPct } = pillStats[key];
            const up = (deltaPct ?? 0) >= 0;
            return (
              <button
                key={key}
                onClick={() => setMetric(key)}
                className="flex items-center gap-2.5 rounded-xl border px-3 py-2 transition-colors"
                style={{
                  background: active ? "var(--accent)" : "transparent",
                  borderColor: active ? "var(--border-accent)" : "var(--border)",
                }}
              >
                <Icon size={16} style={{ color: active ? "var(--primary)" : "var(--muted-foreground)" }} />
                <span className="text-left">
                  <span className="block text-[10px] uppercase tracking-wide text-muted-foreground leading-tight">
                    {METRIC_LABEL[key]}
                  </span>
                  <span className="flex items-center gap-1 leading-tight">
                    <span className="text-sm font-bold tabular-nums">{fmt(value)}</span>
                    {deltaPct !== null && (
                      <span className="inline-flex items-center text-[10px] font-semibold" style={{ color: up ? "var(--trend-up)" : "var(--trend-down)" }}>
                        {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {up ? "+" : ""}{deltaPct}%
                      </span>
                    )}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex gap-1 p-1 rounded-full bg-muted">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={range === r ? { background: "var(--card)", color: "var(--foreground)", boxShadow: "0 1px 3px oklch(0 0 0 / 10%)" } : { color: "var(--muted-foreground)" }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-64 lg:h-72">
        {series.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No posts in this range yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--viz)" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="var(--viz)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={36} tickFormatter={fmt} />
              <Tooltip
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px", color: "var(--foreground)", boxShadow: "0 6px 20px oklch(0 0 0 / 10%)" }}
                labelStyle={{ color: "var(--muted-foreground)", marginBottom: 2 }}
                formatter={(v) => [v, METRIC_LABEL[metric]]}
                cursor={{ stroke: "var(--viz)", strokeWidth: 1, strokeDasharray: "4 4" }}
              />
              <Area type="monotone" dataKey={metric} stroke="var(--viz-line)" strokeWidth={2.5} fill="url(#perfGrad)" dot={false} activeDot={{ r: 4, fill: "var(--viz)", stroke: "var(--card)", strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
