"use client";

import { useState, useEffect } from "react";
import { Plus, X, Lightbulb, ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATUS_FILTERS = ["All", "raw", "unused", "scheduled", "original"];
const FUNNEL_FILTERS = ["All", "TOFU", "MOFU", "BOFU"];
const FUNNEL = ["TOFU", "MOFU", "BOFU"];
const STATUSES = ["raw", "unused", "scheduled"];

// Post-it palette (bright notes always carry dark text -- intentional
// skeuomorphism, not theme colors, so these stay literal in the light app).
const NOTES = [
  { bg: "#7ed8d0", pin: "#f4f4f4" }, // teal
  { bg: "#f7a8cc", pin: "#f2c14e" }, // pink
  { bg: "#d3a4e3", pin: "#3b82f6" }, // purple
  { bg: "#f0e04a", pin: "#2563eb" }, // yellow
  { bg: "#c3d4e8", pin: "#ef4444" }, // light blue
  { bg: "#f5c542", pin: "#16a34a" }, // gold
];
const ROT = [-2.5, 1.5, -1, 2.5, -1.5, 1];

const funnelDot: Record<string, string> = { TOFU: "#2563eb", MOFU: "#d97706", BOFU: "#16a34a" };

interface Idea {
  idea_angle: string;
  suggested_format: string;
  funnel_stage: string;
  tags: string;
  lead_magnet_ideas: string;
  source: string;
  status: string;
  scheduled_slot: string;
  row: number;
}

// An idea is ORIGINAL if Sophiya told/gave it herself -- flagged via an
// "original" tag OR a source that names her. Future ones: the add form's
// "My own idea" toggle appends the original tag.
const isOriginal = (i: Idea) =>
  /(^|,|\s)original(\s|,|$)/i.test(i.tags || "") || /sophiya/i.test(i.source || "");

const emptyForm = {
  idea_angle: "",
  suggested_format: "",
  funnel_stage: "TOFU",
  tags: "",
  lead_magnet_ideas: "",
  source: "quick capture",
  status: "raw",
  scheduled_slot: "",
  original: false,
};

export default function IdeasBank() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [funnelFilter, setFunnelFilter] = useState("All");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await fetch("/api/sheets?tab=Post Ideas&range=A:H");
    if (res.ok) {
      const { rows } = await res.json();
      setIdeas(
        (rows as string[][]).slice(1).map((r, i) => ({
          idea_angle: r[0], suggested_format: r[1], funnel_stage: r[2], tags: r[3],
          lead_magnet_ideas: r[4], source: r[5], status: r[6], scheduled_slot: r[7],
          row: i + 2,
        })).filter((id) => id.idea_angle).reverse()
      );
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.idea_angle.trim()) return;
    setSaving(true);
    // "My own idea" -> ensure the original tag + a Sophiya-sourced note so it
    // stays flagged ORIGINAL permanently, even after a re-tag.
    const tags = form.original
      ? [form.tags, "original"].filter(Boolean).join(", ").replace(/(^|,\s*)original(,\s*original)+/i, "$1original")
      : form.tags;
    const source = form.original && !/sophiya/i.test(form.source) ? `Sophiya (original) — ${form.source}` : form.source;
    await fetch("/api/sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tab: "Post Ideas",
        values: [form.idea_angle, form.suggested_format, form.funnel_stage, tags, form.lead_magnet_ideas, source, form.status, form.scheduled_slot],
      }),
    });
    setSaving(false);
    setAdding(false);
    setForm(emptyForm);
    await load();
  };

  const updateStatus = async (idea: Idea, status: string) => {
    await fetch("/api/sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tab: "Post Ideas", action: "update", rowIndex: idea.row,
        values: [idea.idea_angle, idea.suggested_format, idea.funnel_stage, idea.tags, idea.lead_magnet_ideas, idea.source, status, idea.scheduled_slot],
      }),
    });
    await load();
  };

  const filtered = ideas
    .filter((i) => statusFilter === "All" || (statusFilter === "original" ? isOriginal(i) : i.status === statusFilter))
    .filter((i) => funnelFilter === "All" || i.funnel_stage === funnelFilter);

  const originalCount = ideas.filter(isOriginal).length;

  return (
    <div className="max-w-lg lg:max-w-6xl mx-auto px-4 lg:px-8 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Ideas</p>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Lightbulb size={22} style={{ color: "var(--primary)" }} /> Post Ideas
            <span className="text-muted-foreground font-normal text-lg">({ideas.length})</span>
          </h1>
          {originalCount > 0 && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Star size={12} className="fill-current" style={{ color: "#d97706" }} /> {originalCount} original (your own)
            </p>
          )}
        </div>
        <Button size="sm" onClick={() => setAdding(true)}><Plus size={16} className="mr-1" /> Add</Button>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_FILTERS.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-full border whitespace-nowrap transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground border-transparent" : "border-border text-muted-foreground hover:bg-muted"}`}>
              {s === "original" ? "★ original" : s}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FUNNEL_FILTERS.map((f) => (
            <button key={f} onClick={() => setFunnelFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-full border whitespace-nowrap transition-colors ${funnelFilter === f ? "bg-primary text-primary-foreground border-transparent" : "border-border text-muted-foreground hover:bg-muted"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Add form */}
      {adding && (
        <div className="rounded-2xl p-4 border border-border bg-card shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Add Idea</span>
            <button onClick={() => setAdding(false)} className="text-muted-foreground"><X size={18} /></button>
          </div>
          <textarea value={form.idea_angle} onChange={(e) => setForm({ ...form, idea_angle: e.target.value })} placeholder="Describe the idea angle..." className="w-full px-3 py-2.5 rounded-xl text-sm bg-muted border border-border outline-none min-h-[80px] resize-none" />
          <input value={form.suggested_format} onChange={(e) => setForm({ ...form, suggested_format: e.target.value })} placeholder="Suggested format (e.g. F1, F12...)" className="w-full px-3 py-2.5 rounded-xl text-sm bg-muted border border-border outline-none" />
          <div className="flex gap-2">
            {FUNNEL.map((f) => <button key={f} onClick={() => setForm({ ...form, funnel_stage: f })} className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${form.funnel_stage === f ? "bg-primary text-primary-foreground border-transparent" : "border-border text-muted-foreground"}`}>{f}</button>)}
          </div>
          <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="Tags (comma-separated)" className="w-full px-3 py-2.5 rounded-xl text-sm bg-muted border border-border outline-none" />
          <input value={form.lead_magnet_ideas} onChange={(e) => setForm({ ...form, lead_magnet_ideas: e.target.value })} placeholder="Related lead magnet ideas (optional)" className="w-full px-3 py-2.5 rounded-xl text-sm bg-muted border border-border outline-none" />
          <input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Source (e.g. Template Library, quick capture)" className="w-full px-3 py-2.5 rounded-xl text-sm bg-muted border border-border outline-none" />
          <button
            onClick={() => setForm({ ...form, original: !form.original })}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${form.original ? "border-transparent text-white" : "border-border text-muted-foreground"}`}
            style={form.original ? { background: "#d97706" } : undefined}
          >
            <Star size={15} className={form.original ? "fill-current" : ""} /> {form.original ? "Marked as MY OWN idea (original)" : "This is my own idea (mark original)"}
          </button>
          <Button onClick={save} disabled={!form.idea_angle.trim() || saving} className="w-full">{saving ? "Saving..." : "Save Idea"}</Button>
        </div>
      )}

      {/* Post-it grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-8 pt-2">
        {filtered.map((idea, i) => {
          const note = NOTES[i % NOTES.length];
          const rot = ROT[i % ROT.length];
          const original = isOriginal(idea);
          return (
            <div
              key={idea.row}
              className="relative pt-3 transition-transform hover:-translate-y-1 hover:z-10"
              style={{ transform: `rotate(${rot}deg)` }}
            >
              {/* pushpin */}
              <div
                className="absolute left-1/2 -top-0.5 -translate-x-1/2 w-4 h-4 rounded-full z-10"
                style={{ background: `radial-gradient(circle at 35% 30%, #ffffffcc, ${note.pin} 55%, #00000055)`, boxShadow: "0 2px 3px rgba(0,0,0,0.35)" }}
              />
              {/* note body */}
              <div
                className="p-4 pt-5 min-h-[190px] flex flex-col"
                style={{ background: note.bg, color: "#232323", boxShadow: "3px 5px 12px rgba(0,0,0,0.18)", borderRadius: "2px" }}
              >
                {original && (
                  <span className="self-start mb-2 inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-sm" style={{ background: "#232323", color: "#ffd25e" }}>
                    <Star size={10} className="fill-current" /> Original
                  </span>
                )}
                <div className="flex items-center gap-2 mb-1.5 text-[11px] font-semibold" style={{ color: "#00000099" }}>
                  <span className="uppercase tracking-wide">{idea.status}</span>
                  {idea.funnel_stage && <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: funnelDot[idea.funnel_stage] || "#666" }} />{idea.funnel_stage}</span>}
                  {idea.suggested_format && <span>· {idea.suggested_format}</span>}
                </div>
                <p className="text-sm font-medium leading-snug flex-1">{idea.idea_angle}</p>
                {idea.lead_magnet_ideas && <p className="text-[11px] mt-2" style={{ color: "#00000099" }}>🎁 {idea.lead_magnet_ideas}</p>}
                {idea.scheduled_slot && <p className="text-[11px] mt-1 font-semibold" style={{ color: "#1d6b32" }}>📅 {idea.scheduled_slot}</p>}
                {idea.source && <p className="text-[10px] mt-2 italic truncate" style={{ color: "#00000077" }} title={idea.source}>{idea.source}</p>}
                <div className="flex gap-1.5 mt-2.5 flex-wrap">
                  {STATUSES.filter((s) => s !== idea.status).map((s) => (
                    <button key={s} onClick={() => updateStatus(idea, s)} className="flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: "#00000012", color: "#00000099" }}>
                      <ArrowRight size={9} /> {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground"><Lightbulb size={40} className="mx-auto mb-3 opacity-30" /><p className="text-sm">No ideas match this filter.</p></div>
      )}
    </div>
  );
}
