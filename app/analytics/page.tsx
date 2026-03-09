"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Plus, X, BarChart2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PostStat {
  post_title: string;
  date: string;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  profile_views: number;
  format: string;
  funnel_stage: string;
  row: number;
}

const FORMATS = ["Text", "Carousel", "Image", "Story", "Video"];
const FUNNEL = ["TOFU", "MOFU", "BOFU"];

export default function Analytics() {
  const [stats, setStats] = useState<PostStat[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ post_title: "", date: "", impressions: "", likes: "", comments: "", shares: "", profile_views: "", format: "Text", funnel_stage: "TOFU" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await fetch("/api/sheets?tab=Analytics&range=A:J");
    if (res.ok) {
      const { rows } = await res.json();
      setStats(
        (rows as string[][]).slice(1).map((r, i) => ({
          post_title: r[0], date: r[1],
          impressions: parseInt(r[2]) || 0, likes: parseInt(r[3]) || 0,
          comments: parseInt(r[4]) || 0, shares: parseInt(r[5]) || 0,
          profile_views: parseInt(r[6]) || 0,
          format: r[7], funnel_stage: r[8], row: i + 2,
        })).filter((s) => s.post_title).reverse()
      );
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.post_title.trim()) return;
    setSaving(true);
    await fetch("/api/sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tab: "Analytics",
        values: [form.post_title, form.date, form.impressions, form.likes, form.comments, form.shares, form.profile_views, form.format, form.funnel_stage],
      }),
    });
    setSaving(false);
    setAdding(false);
    setForm({ post_title: "", date: "", impressions: "", likes: "", comments: "", shares: "", profile_views: "", format: "Text", funnel_stage: "TOFU" });
    await load();
  };

  // Pattern insights
  const byFormat = FORMATS.map((f) => {
    const fStats = stats.filter((s) => s.format === f);
    return { format: f, avg: fStats.length ? Math.round(fStats.reduce((a, s) => a + s.impressions, 0) / fStats.length) : 0, count: fStats.length };
  }).filter((f) => f.count > 0).sort((a, b) => b.avg - a.avg);

  const byFunnel = FUNNEL.map((f) => {
    const fStats = stats.filter((s) => s.funnel_stage === f);
    return { funnel: f, avg: fStats.length ? Math.round(fStats.reduce((a, s) => a + s.impressions, 0) / fStats.length) : 0, count: fStats.length };
  });

  const top5 = [...stats].sort((a, b) => b.impressions - a.impressions).slice(0, 5);
  const chartData = [...stats].reverse().slice(-20).map((s) => ({ name: s.date?.slice(5), impressions: s.impressions, likes: s.likes }));

  const tooltipStyle = {
    contentStyle: { background: "var(--surface-2)", border: "1px solid var(--border-subtle)", borderRadius: "8px", fontSize: "12px", color: "oklch(0.985 0 0)" },
    labelStyle: { color: "oklch(0.708 0 0)" },
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Performance</p>
          <h1 className="text-xl font-bold flex items-center gap-2"><BarChart2 size={20} className="text-indigo-400" /> Analytics</h1>
        </div>
        <Button size="sm" onClick={() => setAdding(true)}><Plus size={16} className="mr-1" /> Log Post</Button>
      </div>

      {/* Summary cards */}
      {stats.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Posts", value: stats.length },
            { label: "Avg Impressions", value: Math.round(stats.reduce((a, s) => a + s.impressions, 0) / stats.length).toLocaleString() },
            { label: "Avg Engagement", value: `${Math.round(stats.reduce((a, s) => a + (s.likes + s.comments), 0) / stats.length)}` },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl p-3 border text-center" style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)" }}>
              <p className="text-lg font-bold">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {adding && (
        <div className="rounded-2xl p-4 border space-y-3" style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)" }}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Log Post Stats</span>
            <button onClick={() => setAdding(false)} className="text-muted-foreground"><X size={18} /></button>
          </div>
          <input value={form.post_title} onChange={(e) => setForm({ ...form, post_title: e.target.value })} placeholder="Post title *" className="w-full px-3 py-2.5 rounded-xl text-sm bg-black/20 border border-white/10 text-foreground placeholder:text-muted-foreground outline-none" />
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm bg-black/20 border border-white/10 text-foreground outline-none" />
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: "impressions", label: "Impressions" },
              { key: "likes", label: "Likes" },
              { key: "comments", label: "Comments" },
              { key: "shares", label: "Shares" },
              { key: "profile_views", label: "Profile Views" },
            ].map(({ key, label }) => (
              <input key={key} type="number" value={form[key as keyof typeof form]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={label} className="w-full px-3 py-2.5 rounded-xl text-sm bg-black/20 border border-white/10 text-foreground placeholder:text-muted-foreground outline-none" />
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            {FORMATS.map((f) => <button key={f} onClick={() => setForm({ ...form, format: f })} className={`text-xs px-3 py-1.5 rounded-full border ${form.format === f ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300" : "border-white/10 text-muted-foreground"}`}>{f}</button>)}
          </div>
          <div className="flex gap-2">
            {FUNNEL.map((f) => <button key={f} onClick={() => setForm({ ...form, funnel_stage: f })} className={`flex-1 py-2 rounded-xl text-xs font-semibold border ${form.funnel_stage === f ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300" : "border-white/10 text-muted-foreground"}`}>{f}</button>)}
          </div>
          <Button onClick={save} disabled={!form.post_title.trim() || saving} className="w-full">{saving ? "Saving..." : "Save Stats"}</Button>
        </div>
      )}

      {stats.length === 0 && !adding && (
        <div className="text-center py-12 text-muted-foreground">
          <BarChart2 size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No data yet. Log your first post stats!</p>
        </div>
      )}

      {/* Impressions chart */}
      {chartData.length > 0 && (
        <div className="rounded-2xl p-4 border space-y-3" style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)" }}>
          <p className="text-sm font-semibold">Impressions Over Time</p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 5%)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "oklch(0.556 0 0)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "oklch(0.556 0 0)" }} tickLine={false} axisLine={false} />
                <Tooltip {...tooltipStyle} />
                <Line type="monotone" dataKey="impressions" stroke="oklch(0.488 0.243 264.376)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Best format */}
      {byFormat.length > 0 && (
        <div className="rounded-2xl p-4 border space-y-3" style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)" }}>
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-green-400" />
            <p className="text-sm font-semibold">Best Format (avg impressions)</p>
          </div>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byFormat}>
                <XAxis dataKey="format" tick={{ fontSize: 11, fill: "oklch(0.556 0 0)" }} tickLine={false} axisLine={false} />
                <Tooltip {...tooltipStyle} formatter={(v) => [Number(v).toLocaleString(), "Avg Impressions"]} />
                <Bar dataKey="avg" fill="oklch(0.488 0.243 264.376)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="text-indigo-300 font-medium">{byFormat[0]?.format}</span> performs best with avg {byFormat[0]?.avg.toLocaleString()} impressions
          </p>
        </div>
      )}

      {/* Top 5 posts */}
      {top5.length > 0 && (
        <div className="rounded-2xl p-4 border space-y-3" style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)" }}>
          <p className="text-sm font-semibold">Top 5 Posts by Impressions</p>
          {top5.map((p, i) => (
            <div key={p.row} className="flex items-start gap-3">
              <span className="text-xs text-muted-foreground w-4 mt-0.5">#{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.post_title}</p>
                <p className="text-xs text-muted-foreground">{p.impressions.toLocaleString()} impressions · {p.format} · {p.funnel_stage}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
