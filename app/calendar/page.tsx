"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Plus, X, Calendar, ChevronLeft, ChevronRight, ImagePlus, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ScreenshotGallery from "@/components/ScreenshotGallery";
import InspoGallery from "@/components/InspoGallery";
import { tahaProfile } from "@/lib/profile";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isSameDay, addMonths, subMonths,
  startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, subDays
} from "date-fns";

const STATUSES = ["Idea", "Draft", "Designed", "Scheduled", "Posted"];
const FORMATS = ["Text", "Carousel", "Image", "Story", "Video"];
const FUNNEL = ["TOFU", "MOFU", "BOFU"];

// Light-theme status chips (kept as small semantic tints, not app theme colors).
const statusColors: Record<string, string> = {
  Idea: "bg-muted text-muted-foreground",
  Draft: "bg-blue-100 text-blue-700",
  Designed: "bg-violet-100 text-violet-700",
  Scheduled: "bg-amber-100 text-amber-700",
  Posted: "bg-green-100 text-green-700",
};

const funnelDot: Record<string, string> = {
  TOFU: "bg-blue-500",
  MOFU: "bg-amber-500",
  BOFU: "bg-green-500",
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
  visual_url?: string;
  row: number;
}

// Content-board style card: author + status meta, a hint of the post text, and
// the visual (or an add-visual placeholder). Matches the reference board.
function PostCard({ post, size, onAddVisual, onOpen }: { post: Post; size: "sm" | "lg"; onAddVisual: (p: Post) => void; onOpen?: (p: Post) => void }) {
  const isUrl = post.lead_magnet?.startsWith("http");
  const status = post.status || "Idea";
  return (
    <div
      className="rounded-2xl border bg-card border-border shadow-sm p-3 space-y-2.5 transition-shadow hover:shadow-md cursor-pointer"
      onClick={() => onOpen?.(post)}
    >
      {/* meta row: author + status + menu */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative w-6 h-6 rounded-full overflow-hidden shrink-0 ring-1 ring-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <Image src={tahaProfile.avatar} alt={tahaProfile.name} fill className="object-cover" sizes="24px" />
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusColors[status] || statusColors.Idea}`}>{status}</span>
        </div>
        <MoreHorizontal size={15} className="text-muted-foreground shrink-0" />
      </div>

      {/* text hint */}
      <p className={`${size === "lg" ? "text-[15px]" : "text-sm"} font-medium leading-snug ${size === "lg" ? "line-clamp-4" : "line-clamp-3"}`}>
        {post.title}
      </p>

      {/* visual */}
      <div className={`relative w-full rounded-xl overflow-hidden bg-muted border border-border ${size === "lg" ? "h-40" : "h-24"}`}>
        {post.visual_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.visual_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onAddVisual(post); }}
            className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted-foreground hover:bg-black/[0.03] transition-colors"
          >
            <ImagePlus size={size === "lg" ? 22 : 18} />
            <span className="text-[10px] font-medium">Add visual</span>
          </button>
        )}
      </div>

      {/* footer: format + funnel + lead magnet */}
      <div className="flex flex-wrap items-center gap-1.5">
        {post.format && (
          <span className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">{post.format}</span>
        )}
        {post.funnel_stage && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold badge-${post.funnel_stage.toLowerCase()}`}>{post.funnel_stage}</span>
        )}
      </div>
      {post.lead_magnet && (
        isUrl ? (
          <a href={post.lead_magnet} onClick={(e) => e.stopPropagation()} target="_blank" rel="noreferrer" className="text-xs underline truncate block" style={{ color: "var(--primary)" }}>{post.lead_magnet}</a>
        ) : (
          <p className="text-xs text-muted-foreground truncate">🎁 {post.lead_magnet}</p>
        )
      )}
    </div>
  );
}

export default function CalendarPage() {
  const [tab, setTab] = useState("calendar");
  const [view, setView] = useState<"month" | "week" | "day">("week");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [currentDay, setCurrentDay] = useState(new Date());
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
          lead_magnet: r[4], status: r[5], post_url: r[6], notes: r[7],
          visual_url: r[8], row: i + 2,
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
        values: [form.date, form.title, form.format, form.funnel_stage, form.lead_magnet, form.status, form.post_url, form.notes, ""],
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
        values: [post.date, post.title, post.format, post.funnel_stage, post.lead_magnet, status, post.post_url, post.notes, post.visual_url || ""],
      }),
    });
    await load();
    setSelectedPost((p) => p ? { ...p, status } : null);
  };

  const updateVisualUrl = async (post: Post) => {
    const url = window.prompt("Visual URL", post.visual_url || "");
    if (url === null) return;
    await fetch("/api/sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tab: "ContentCalendar", action: "update", rowIndex: post.row,
        values: [post.date, post.title, post.format, post.funnel_stage, post.lead_magnet, post.status, post.post_url, post.notes, url],
      }),
    });
    await load();
  };

  // Funnel balance
  const monthPosts = posts.filter((p) => p.date?.startsWith(format(currentMonth, "yyyy-MM")));
  const tofuPct = monthPosts.length ? Math.round(monthPosts.filter((p) => p.funnel_stage === "TOFU").length / monthPosts.length * 100) : 0;
  const mofuPct = monthPosts.length ? Math.round(monthPosts.filter((p) => p.funnel_stage === "MOFU").length / monthPosts.length * 100) : 0;
  const bofuPct = 100 - tofuPct - mofuPct;

  const navBtn = "p-2 rounded-xl hover:bg-muted transition-colors";
  const chip = "text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:bg-muted transition-colors";

  return (
    <div className="max-w-lg lg:max-w-6xl mx-auto px-4 lg:px-8 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Content</p>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Calendar size={22} style={{ color: "var(--primary)" }} /> Content Board</h1>
        </div>
        {tab === "calendar" && (
          <Button size="sm" onClick={() => setAdding(true)}><Plus size={16} className="mr-1" /> Add Post</Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as string)}>
        <TabsList variant="line">
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="slack">Slack Screenshots</TabsTrigger>
          <TabsTrigger value="email">Email Screenshots</TabsTrigger>
          <TabsTrigger value="inspo">Visual Inspo</TabsTrigger>
        </TabsList>

        <TabsContent value="slack" className="pt-4">
          <ScreenshotGallery folderKey="slack" emptyHint="No Slack praise/proof screenshots saved here yet — add one, or run capture-proof-screenshot.mjs on a flagged win." />
        </TabsContent>
        <TabsContent value="email" className="pt-4">
          <ScreenshotGallery folderKey="email" emptyHint="No email screenshots saved yet — add one to start this collection." />
        </TabsContent>
        <TabsContent value="inspo" className="pt-4">
          <InspoGallery />
        </TabsContent>

        <TabsContent value="calendar" className="pt-4 space-y-5">

          {/* Funnel balance */}
          {monthPosts.length > 0 && (
            <div className="rounded-2xl p-4 border bg-card border-border shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold">Funnel balance · {monthPosts.length} posts</span>
                {bofuPct < 10 && <span className="font-medium" style={{ color: "var(--trend-down)" }}>Add more BOFU posts</span>}
              </div>
              <div className="flex gap-0.5 h-2 rounded-full overflow-hidden">
                <div style={{ width: `${tofuPct}%` }} className="bg-blue-500" />
                <div style={{ width: `${mofuPct}%` }} className="bg-amber-500" />
                <div style={{ width: `${bofuPct}%` }} className="bg-green-500" />
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span><span className="text-blue-500">●</span> TOFU {tofuPct}%</span>
                <span><span className="text-amber-500">●</span> MOFU {mofuPct}%</span>
                <span><span className="text-green-500">●</span> BOFU {bofuPct}%</span>
              </div>
            </div>
          )}

          {/* Month/Week/Day switcher */}
          <div className="inline-flex rounded-full border border-border bg-muted p-1 gap-1">
            {(["month", "week", "day"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-4 py-1.5 rounded-full text-xs font-medium capitalize transition-colors"
                style={view === v ? { background: "var(--card)", color: "var(--foreground)", boxShadow: "0 1px 3px oklch(0 0 0 / 10%)" } : { color: "var(--muted-foreground)" }}
              >
                {v}
              </button>
            ))}
          </div>

          {view === "month" && (
            <>
              {/* Month nav */}
              <div className="flex items-center justify-between">
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className={navBtn}><ChevronLeft size={20} /></button>
                <span className="font-semibold">{format(currentMonth, "MMMM yyyy")}</span>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className={navBtn}><ChevronRight size={20} /></button>
              </div>

              {/* Calendar grid */}
              <div className="rounded-2xl border bg-card border-border shadow-sm overflow-hidden">
                <div className="grid grid-cols-7 border-b border-border">
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                    <div key={d} className="text-center py-2.5 text-xs text-muted-foreground font-semibold">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {Array(startDay).fill(null).map((_, i) => <div key={`empty-${i}`} className="min-h-[72px] border-t border-r border-border" />)}
                  {days.map((day) => {
                    const dayPosts = postsOnDay(day);
                    const isToday = isSameDay(day, new Date());
                    const inMonth = isSameMonth(day, currentMonth);
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => { setSelectedDate(day); setCurrentDay(day); setAdding(true); setForm((f) => ({ ...f, date: format(day, "yyyy-MM-dd") })); }}
                        className={`min-h-[72px] p-1.5 border-t border-r border-border text-left transition-colors hover:bg-muted ${!inMonth ? "opacity-40" : ""}`}
                      >
                        <span
                          className="text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full"
                          style={isToday ? { background: "var(--primary)", color: "var(--primary-foreground)" } : undefined}
                        >
                          {format(day, "d")}
                        </span>
                        <div className="mt-1 space-y-1">
                          {dayPosts.slice(0, 2).map((p) => (
                            <div
                              key={p.row}
                              onClick={(e) => { e.stopPropagation(); setSelectedPost(p); }}
                              className="flex items-center gap-1 rounded-md px-1 py-0.5 hover:bg-accent"
                            >
                              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${funnelDot[p.funnel_stage] || "bg-gray-400"}`} />
                              <span className="text-[10px] truncate">{p.title}</span>
                            </div>
                          ))}
                          {dayPosts.length > 2 && <span className="text-[10px] text-muted-foreground pl-1">+{dayPosts.length - 2} more</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {view === "week" && (
            <>
              <div className="flex items-center justify-between">
                <button onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))} className={navBtn}><ChevronLeft size={20} /></button>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{format(startOfWeek(currentWeek), "MMM d")} – {format(endOfWeek(currentWeek), "MMM d, yyyy")}</span>
                  <button onClick={() => setCurrentWeek(new Date())} className={chip}>This week</button>
                </div>
                <button onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))} className={navBtn}><ChevronRight size={20} /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
                {eachDayOfInterval({ start: startOfWeek(currentWeek), end: endOfWeek(currentWeek) }).map((day) => {
                  const dayPosts = postsOnDay(day);
                  const isToday = isSameDay(day, new Date());
                  return (
                    <div key={day.toISOString()} className="space-y-2">
                      <button
                        onClick={() => { setCurrentDay(day); setView("day"); }}
                        className="w-full text-left text-xs font-semibold px-2 py-1.5 rounded-lg transition-colors"
                        style={isToday ? { background: "var(--primary)", color: "var(--primary-foreground)" } : { color: "var(--muted-foreground)" }}
                      >
                        {format(day, "EEE d")}
                        {isToday && <span className="ml-1 opacity-80">· Today</span>}
                      </button>
                      {dayPosts.length === 0 ? (
                        <button
                          onClick={() => { setAdding(true); setForm((f) => ({ ...f, date: format(day, "yyyy-MM-dd") })); }}
                          className="w-full rounded-2xl border border-dashed border-border p-4 text-center text-[11px] text-muted-foreground hover:bg-muted transition-colors"
                        >
                          <Plus size={14} className="inline mr-1" /> Slot available
                        </button>
                      ) : (
                        dayPosts.map((p) => (
                          <PostCard key={p.row} post={p} size="sm" onAddVisual={updateVisualUrl} onOpen={setSelectedPost} />
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {view === "day" && (
            <>
              <div className="flex items-center justify-between">
                <button onClick={() => setCurrentDay(subDays(currentDay, 1))} className={navBtn}><ChevronLeft size={20} /></button>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{format(currentDay, "EEEE, MMMM d, yyyy")}</span>
                  <button onClick={() => setCurrentDay(new Date())} className={chip}>Today</button>
                </div>
                <button onClick={() => setCurrentDay(addDays(currentDay, 1))} className={navBtn}><ChevronRight size={20} /></button>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {postsOnDay(currentDay).length === 0 ? (
                  <div className="sm:col-span-2 lg:col-span-3 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                    No posts scheduled for this day.
                  </div>
                ) : (
                  postsOnDay(currentDay).map((p) => (
                    <PostCard key={p.row} post={p} size="lg" onAddVisual={updateVisualUrl} onOpen={setSelectedPost} />
                  ))
                )}
              </div>
            </>
          )}

          {/* Add form */}
          {adding && (
            <div className="rounded-2xl p-5 border bg-card border-border shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Add post</span>
                <button onClick={() => { setAdding(false); setSelectedDate(null); }} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
              </div>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm bg-muted border border-border text-foreground outline-none focus:ring-2 focus:ring-[var(--ring)]" />
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Post title / topic *" className="w-full px-3 py-2.5 rounded-xl text-sm bg-muted border border-border text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-[var(--ring)]" />
              <div className="flex gap-2">
                {FUNNEL.map((f) => <button key={f} onClick={() => setForm({ ...form, funnel_stage: f })} className={`flex-1 py-2 rounded-xl text-xs font-semibold border ${form.funnel_stage === f ? "badge-" + f.toLowerCase() : "border-border text-muted-foreground"}`}>{f}</button>)}
              </div>
              <div className="flex gap-2 flex-wrap">
                {FORMATS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setForm({ ...form, format: f })}
                    className="text-xs px-3 py-1.5 rounded-full border transition-colors"
                    style={form.format === f ? { background: "var(--accent)", color: "var(--primary)", borderColor: "var(--border-accent)" } : { borderColor: "var(--border)", color: "var(--muted-foreground)" }}
                  >{f}</button>
                ))}
              </div>
              <input value={form.lead_magnet} onChange={(e) => setForm({ ...form, lead_magnet: e.target.value })} placeholder="Lead magnet to attach (optional)" className="w-full px-3 py-2.5 rounded-xl text-sm bg-muted border border-border text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-[var(--ring)]" />
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes (optional)" className="w-full px-3 py-2.5 rounded-xl text-sm bg-muted border border-border text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-[var(--ring)]" />
              <Button onClick={save} disabled={!form.title.trim() || !form.date || saving} className="w-full">{saving ? "Saving..." : "Save post"}</Button>
            </div>
          )}

          {/* Post detail */}
          {selectedPost && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "oklch(0 0 0 / 45%)" }} onClick={() => setSelectedPost(null)}>
              <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-5 space-y-4 bg-card border border-border shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{selectedPost.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{selectedPost.date} · {selectedPost.format} · {selectedPost.funnel_stage}</p>
                  </div>
                  <button onClick={() => setSelectedPost(null)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
                </div>
                {selectedPost.lead_magnet && <p className="text-sm" style={{ color: "var(--primary)" }}>🎁 Lead magnet: {selectedPost.lead_magnet}</p>}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Update status</p>
                  <div className="flex flex-wrap gap-2">
                    {STATUSES.map((s) => (
                      <button key={s} onClick={() => updateStatus(selectedPost, s)} className={`text-xs px-3 py-1.5 rounded-full font-medium ${selectedPost.status === s ? statusColors[s] : "border border-border text-muted-foreground"}`}>{s}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
