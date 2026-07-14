"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Eye, Heart, MessageCircle } from "lucide-react";
import type { AccountPost, Metric } from "@/lib/analytics";
import { byWeekday, METRIC_LABEL } from "@/lib/analytics";

// "Views" aren't scrapeable, so the eye maps to reactions (our closest reach
// signal). Labels stay honest via the tooltip / metric name.
const TABS: { key: Metric; icon: typeof Eye }[] = [
  { key: "reactions", icon: Heart },
  { key: "comments", icon: MessageCircle },
  { key: "reposts", icon: Eye },
];

export default function BestDayToPost({ posts }: { posts: AccountPost[] }) {
  const [metric, setMetric] = useState<Metric>("reactions");
  const data = useMemo(() => byWeekday(posts, metric), [posts, metric]);
  const maxAvg = Math.max(...data.map((d) => d.avg), 0);
  const bestIdx = data.findIndex((d) => d.avg === maxAvg && maxAvg > 0);

  const caption = useMemo(() => {
    const nonZero = data.filter((d) => d.count > 0 && d.avg > 0);
    if (nonZero.length < 2 || bestIdx < 0) return "Post more to reveal your best day.";
    const best = data[bestIdx];
    const worst = [...nonZero].sort((a, b) => a.avg - b.avg)[0];
    const mult = worst.avg ? (best.avg / worst.avg).toFixed(1) : "—";
    return `${best.day} gets ${mult}× more ${METRIC_LABEL[metric].toLowerCase()} than ${worst.day} on average.`;
  }, [data, bestIdx, metric]);

  return (
    <div className="rounded-2xl border bg-card border-border shadow-sm p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">Best day to post</h2>
        <div className="flex gap-1 p-1 rounded-full bg-muted">
          {TABS.map(({ key, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setMetric(key)}
              className="p-1.5 rounded-full transition-colors"
              style={metric === key ? { background: "var(--card)", color: "var(--primary)", boxShadow: "0 1px 3px oklch(0 0 0 / 10%)" } : { color: "var(--muted-foreground)" }}
              aria-label={METRIC_LABEL[key]}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>
      </div>

      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 0, left: -18, bottom: 0 }}>
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={40} />
            <Tooltip
              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px", color: "var(--foreground)", boxShadow: "0 6px 20px oklch(0 0 0 / 10%)" }}
              formatter={(v, _n, item) => [`${v} avg · ${item?.payload?.count} posts`, METRIC_LABEL[metric]]}
              cursor={{ fill: "var(--muted)" }}
            />
            <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
              {data.map((d, i) => (
                <Cell key={d.day} fill={i === bestIdx ? "var(--viz)" : "var(--viz-soft)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-muted-foreground">{caption}</p>
    </div>
  );
}
