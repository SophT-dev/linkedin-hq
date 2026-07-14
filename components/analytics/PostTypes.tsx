"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { FileText } from "lucide-react";
import { prettyType } from "@/lib/analytics";

const CAT = ["--cat-1", "--cat-2", "--cat-3", "--cat-4", "--viz-2"] as const;

export interface TypeDatum {
  type: string;
  count: number;
  avg: number;
  pct: number;
}

export default function PostTypes({ data, metricLabel = "reactions" }: { data: TypeDatum[]; metricLabel?: string }) {
  const total = data.reduce((a, d) => a + d.count, 0);

  return (
    <div className="rounded-2xl border bg-card border-border shadow-sm p-4 lg:p-6 space-y-4">
      <h2 className="text-base font-bold">Post types</h2>

      {total === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No posts to break down yet.</p>
      ) : (
        <div className="flex items-center gap-5">
          <div className="relative w-28 h-28 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="count" nameKey="type" innerRadius={38} outerRadius={54} paddingAngle={2} stroke="none">
                  {data.map((d, i) => <Cell key={d.type} fill={`var(${CAT[i % CAT.length]})`} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold leading-none tabular-nums">{total}</span>
              <span className="text-[10px] text-muted-foreground">total</span>
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-2.5">
            {data.map((d, i) => (
              <div key={d.type} className="flex items-center gap-2 text-sm">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: `var(${CAT[i % CAT.length]})` }} />
                <FileText size={13} className="text-muted-foreground shrink-0" />
                <span className="font-medium capitalize truncate">{prettyType(d.type)}</span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">· avg {d.avg} {metricLabel}</span>
                <span className="ml-auto flex items-center gap-2 whitespace-nowrap">
                  <span className="font-semibold tabular-nums">{d.count}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{d.pct}%</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
