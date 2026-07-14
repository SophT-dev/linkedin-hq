"use client";

import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

export interface StatCard {
  label: string;
  value: string;
  deltaPct: number | null;   // null → no prior period to compare
  spark: number[];
  icon: LucideIcon;
  tint: string;              // CSS var for icon + sparkline
}

function Sparkline({ data, tint, id }: { data: number[]; tint: string; id: string }) {
  const series = data.map((v, i) => ({ i, v }));
  if (series.length < 2) return <div className="h-9" />;
  return (
    <div className="h-9 -mx-1">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
          <defs>
            <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={tint} stopOpacity={0.28} />
              <stop offset="100%" stopColor={tint} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={tint} strokeWidth={2} fill={`url(#spark-${id})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function DeltaBadge({ deltaPct }: { deltaPct: number | null }) {
  if (deltaPct === null) {
    return <span className="text-[11px] text-muted-foreground font-medium">new</span>;
  }
  const up = deltaPct >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[11px] font-semibold"
      style={{ color: up ? "var(--trend-up)" : "var(--trend-down)" }}
    >
      <Icon size={12} />
      {up ? "+" : ""}
      {deltaPct}%
    </span>
  );
}

export default function StatCards({ cards }: { cards: StatCard[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
      {cards.map(({ label, value, deltaPct, spark, icon: Icon, tint }) => (
        <div
          key={label}
          className="rounded-2xl border bg-card border-border shadow-sm p-4 lg:p-5 flex flex-col gap-2 transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Icon size={15} style={{ color: tint }} />
            {label}
          </div>
          <div className="flex items-end justify-between gap-2">
            <p className="text-2xl lg:text-3xl font-bold tabular-nums leading-none">{value}</p>
            <DeltaBadge deltaPct={deltaPct} />
          </div>
          <Sparkline data={spark} tint={tint} id={label.replace(/\s+/g, "")} />
          <p className="text-[10px] text-muted-foreground -mt-1">vs previous 30 days</p>
        </div>
      ))}
    </div>
  );
}
