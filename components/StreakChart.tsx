"use client";

import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays } from "date-fns";

interface Props {
  history: string[][];
}

export default function StreakChart({ history }: Props) {
  // Build 30 days of data, filling gaps with 0
  const today = new Date();
  const days = Array.from({ length: 30 }, (_, i) => {
    const date = format(subDays(today, 29 - i), "yyyy-MM-dd");
    const row = history.find((r) => r[0] === date);
    const pct = row ? parseInt(row[7] || "0") : 0;
    return {
      date,
      label: format(subDays(today, 29 - i), "MMM d"),
      pct,
    };
  });

  return (
    <div className="w-full h-28">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={days} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="streakGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="oklch(0.488 0.243 264.376)" stopOpacity={0.5} />
              <stop offset="95%" stopColor="oklch(0.488 0.243 264.376)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "oklch(0.556 0 0)" }}
            tickLine={false}
            axisLine={false}
            interval={6}
          />
          <Tooltip
            contentStyle={{
              background: "oklch(0.205 0 0)",
              border: "1px solid oklch(1 0 0 / 10%)",
              borderRadius: "8px",
              fontSize: "12px",
              color: "oklch(0.985 0 0)",
            }}
            formatter={(val) => [`${val}%`, "Completed"]}
            labelStyle={{ color: "oklch(0.708 0 0)" }}
          />
          <Area
            type="monotone"
            dataKey="pct"
            stroke="oklch(0.488 0.243 264.376)"
            strokeWidth={2}
            fill="url(#streakGrad)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
