"use client";

import { useState, useEffect } from "react";
import { Plus, X, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isSameDay, addMonths, subMonths, parseISO
} from "date-fns";

const STATUSES = ["Idea", "Draft", "Designed", "Scheduled", "Posted"];
const FORMATS = ["Text", "Carousel", "Image", "Story", "Video"];
const FUNNEL = ["TOFU", "MOFU", "BOFU"];

const statusColors: Record<string, string> = {
  Idea: "bg-gray-500/20 text-gray-300",
  Draft: "bg-blue-500/20 text-blue-300",
  Designed: "bg-purple-500/20 text-purple-300",
  Scheduled: "bg-amber-500/20 text-amber-300",
  Posted: "bg-green-500/20 text-green-300",
};

const funnelDot: Record<string, string> = {
  TOFU: "bg-blue-400",
  MOFU: "bg-amber-400",
  BOFU: "bg-green-400",
};

interface Post {
  date: string;
  title: string;
  format: string;
  funnel_stage: string;
  lead_magnet: string;
  status: string;
  post_url: string;
  notes: string;
  row: number;
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [posts, setPosts] = useState<Post[]>([]);
  const [adding, setAdding] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [form, setForm] = useState({ date: "", title: "", format: "Text", funnel_stage: "TOFU", lead_magnet: "", status: "Idea", post_url: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await fetch("/api/sheets?tab=ContentCalendar&range=A:I");
    if (res.ok) {
      const { rows } = await res.json();
      setPosts(
        (rows as string[][]).slice(1).map((r, i) => ({
          date: r[0], title: r[1], format: r[2], funnel_stage: r[3],
          lead_magnet: r[4], status: r[5], post_url: r[6], notes: r[7], row: i + 2,
        })).filter((p) => p.title)
      );
    }
  };

  useEffect(() => { load(); }, []);

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startDay = startOfMonth(currentMonth).getDay();

  const postsOnDay = (date: Date) => posts.filter((p) => p.date === format(date, "yyyy-MM-dd"));

  const save = async () => {
    if (!form.title.trim() || !form.date) return;
    setSaving(true);
    await fetch("/api/sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tab: "ContentCalendar",
        values: [form.date, form.title, form.format, form.funnel_stage, form.lead_magnet, form.status, form.post_url, form.notes],
      }),
    });
    setSaving(false);
    setAdding(false);
    setForm({ date: "", title: "", format: "Text", funnel_stage: "TOFU", lead_magnet: "", status: "Idea", post_url: "", notes: "" });
    await load();
  };

  const updateStatus = async (post: Post, status: string) => {
    await fetch("/api/sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tab: "ContentCalendar", action: "update", rowIndex: post.row,
        values: [post.date, post.title, post.format, post.funnel_stage, post.lead_magnet, status, post.post_url, post.notes],
      }),
    });
    await load();
    setSelectedPost((p) => p ? { ...p, status } : null);
  };

  // Funnel balance
  const monthPosts = posts.filter((p) => p.date?.startsWith(format(currentMonth, "yyyy-MM")));
  const tofuPct = monthPosts.length ? Math.round(monthPosts.filter((p) => p.funnel_stage === "TOFU").length / monthPosts.length * 100) : 0;
  const mofuPct = monthPosts.length ? Math.round(monthPosts.filter((p) => p.funnel_stage === "MOFU").length / monthPosts.length * 100) : 0;
  const bofuPct = 100 - tofuPct - mofuPct;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Content</p>
          <h1 className="text-xl font-bold flex items-center gap-2"><Calendar size={20} className="text-indigo-400" /> Calendar</h1>
        </div>
        <Button size="sm" onClick={() => setAdding(true)}><Plus size={16} className="mr-1" /> Add Post</Button>
      </div>

      {/* Funnel balance */}
      {monthPosts.length > 0 && (
        <div className="rounded-2xl p-4 border space-y-2" style={{ background: "oklch(0.205 0 0)", borderColor: "oklch(1 0 0 / 8%)" }}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">Funnel Balance ({monthPosts.length} posts)</span>
            {bofuPct < 10 && <span className="text-amber-400">Add more BOFU posts</span>}
          </div>
          <div className="flex gap-0.5 h-2 rounded-full overflow-hidden">
            <div style={{ width: `${tofuPct}%` }} className="bg-blue-400" />
            <div style={{ width: `${mofuPct}%` }} className="bg-amber-400" />
            <div style={{ width: `${bofuPct}%` }} className="bg-green-400" />
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span><span className="text-blue-400">●</span> TOFU {tofuPct}%</span>
            <span><span className="text-amber-400">●</span> MOFU {mofuPct}%</span>
            <span><span className="text-green-400">●</span> BOFU {bofuPct}%</span>
          </div>
        </div>
      )}

      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-xl hover:bg-white/5"><ChevronLeft size={20} /></button>
        <span className="font-semibold">{format(currentMonth, "MMMM yyyy")}</span>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-xl hover:bg-white/5"><ChevronRight size={20} /></button>
      </div>

      {/* Calendar grid */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: "oklch(0.205 0 0)", borderColor: "oklch(1 0 0 / 8%)" }}>
        <div className="grid grid-cols-7 border-b" style={{ borderColor: "oklch(1 0 0 / 8%)" }}>
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
            <div key={d} className="text-center py-2 text-xs text-muted-foreground font-medium">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array(startDay).fill(null).map((_, i) => <div key={`empty-${i}`} className="min-h-[60px]" />)}
          {days.map((day) => {
            const dayPosts = postsOnDay(day);
            const isToday = isSameDay(day, new Date());
            const inMonth = isSameMonth(day, currentMonth);
            return (
              <button
                key={day.toISOString()}
                onClick={() => { setSelectedDate(day); setAdding(true); setForm((f) => ({ ...f, date: format(day, "yyyy-MM-dd") })); }}
                className={`min-h-[60px] p-1.5 border-t border-r text-left transition-colors hover:bg-white/5 ${!inMonth ? "opacity-30" : ""}`}
                style={{ borderColor: "oklch(1 0 0 / 8%)" }}
              >
                <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-indigo-500 text-white" : "text-foreground"}`}>
                  {format(day, "d")}
                </span>
                <div className="mt-1 space-y-0.5">
                  {dayPosts.slice(0, 2).map((p) => (
                    <div
                      key={p.row}
                      onClick={(e) => { e.stopPropagation(); setSelectedPost(p); }}
                      className="flex items-center gap-1"
                    >
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${funnelDot[p.funnel_stage] || "bg-gray-400"}`} />
                      <span className="text-[10px] truncate text-muted-foreground">{p.title}</span>
                    </div>
                  ))}
                  {dayPosts.length > 2 && <span className="text-[10px] text-muted-foreground">+{dayPosts.length - 2}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Add form */}
      {adding && (
        <div className="rounded-2xl p-4 border space-y-3" style={{ background: "oklch(0.205 0 0)", borderColor: "oklch(1 0 0 / 8%)" }}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Add Post</span>
            <button onClick={() => { setAdding(false); setSelectedDate(null); }} className="text-muted-foreground"><X size={18} /></button>
          </div>
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm bg-black/20 border border-white/10 text-foreground outline-none" />
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Post title / topic *" className="w-full px-3 py-2.5 rounded-xl text-sm bg-black/20 border border-white/10 text-foreground placeholder:text-muted-foreground outline-none" />
          <div className="flex gap-2">
            {FUNNEL.map((f) => <button key={f} onClick={() => setForm({ ...form, funnel_stage: f })} className={`flex-1 py-2 rounded-xl text-xs font-semibold border ${form.funnel_stage === f ? "badge-" + f.toLowerCase() : "border-white/10 text-muted-foreground"}`}>{f}</button>)}
          </div>
          <div className="flex gap-2 flex-wrap">
            {FORMATS.map((f) => <button key={f} onClick={() => setForm({ ...form, format: f })} className={`text-xs px-3 py-1.5 rounded-full border ${form.format === f ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300" : "border-white/10 text-muted-foreground"}`}>{f}</button>)}
          </div>
          <input value={form.lead_magnet} onChange={(e) => setForm({ ...form, lead_magnet: e.target.value })} placeholder="Lead magnet to attach (optional)" className="w-full px-3 py-2.5 rounded-xl text-sm bg-black/20 border border-white/10 text-foreground placeholder:text-muted-foreground outline-none" />
          <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes (optional)" className="w-full px-3 py-2.5 rounded-xl text-sm bg-black/20 border border-white/10 text-foreground placeholder:text-muted-foreground outline-none" />
          <Button onClick={save} disabled={!form.title.trim() || !form.date || saving} className="w-full">{saving ? "Saving..." : "Save Post"}</Button>
        </div>
      )}

      {/* Post detail */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "oklch(0 0 0 / 70%)" }} onClick={() => setSelectedPost(null)}>
          <div className="w-full max-w-lg rounded-t-2xl p-5 space-y-4" style={{ background: "oklch(0.205 0 0)", border: "1px solid oklch(1 0 0 / 10%)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold">{selectedPost.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{selectedPost.date} · {selectedPost.format} · {selectedPost.funnel_stage}</p>
              </div>
              <button onClick={() => setSelectedPost(null)} className="text-muted-foreground"><X size={18} /></button>
            </div>
            {selectedPost.lead_magnet && <p className="text-sm text-indigo-300">Lead magnet: {selectedPost.lead_magnet}</p>}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Update Status</p>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <button key={s} onClick={() => updateStatus(selectedPost, s)} className={`text-xs px-3 py-1.5 rounded-full ${selectedPost.status === s ? statusColors[s] : "border border-white/10 text-muted-foreground"}`}>{s}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
