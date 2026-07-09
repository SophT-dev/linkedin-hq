"use client";

import { useState, useEffect } from "react";
import { Plus, X, Lightbulb, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATUS_FILTERS = ["All", "raw", "unused", "scheduled"];
const FUNNEL_FILTERS = ["All", "TOFU", "MOFU", "BOFU"];
const FUNNEL = ["TOFU", "MOFU", "BOFU"];
const STATUSES = ["raw", "unused", "scheduled"];

const statusColors: Record<string, string> = {
  raw: "bg-gray-500/15 text-gray-300",
  unused: "bg-blue-500/15 text-blue-300",
  scheduled: "bg-green-500/15 text-green-300",
};

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

const emptyForm = {
  idea_angle: "",
  suggested_format: "",
  funnel_stage: "TOFU",
  tags: "",
  lead_magnet_ideas: "",
  source: "quick capture",
  status: "raw",
  scheduled_slot: "",
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
    await fetch("/api/sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tab: "Post Ideas",
        values: [
          form.idea_angle, form.suggested_format, form.funnel_stage, form.tags,
          form.lead_magnet_ideas, form.source, form.status, form.scheduled_slot,
        ],
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
        values: [
          idea.idea_angle, idea.suggested_format, idea.funnel_stage, idea.tags,
          idea.lead_magnet_ideas, idea.source, status, idea.scheduled_slot,
        ],
      }),
    });
    await load();
  };

  const filtered = ideas
    .filter((i) => statusFilter === "All" || i.status === statusFilter)
    .filter((i) => funnelFilter === "All" || i.funnel_stage === funnelFilter);

  const funnelDot: Record<string, string> = { TOFU: "bg-blue-400", MOFU: "bg-amber-400", BOFU: "bg-green-400" };

  return (
    <div className="max-w-lg lg:max-w-5xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Ideas</p>
          <h1 className="text-xl font-bold flex items-center gap-2"><Lightbulb size={20} className="text-indigo-400" /> Post Ideas ({ideas.length})</h1>
        </div>
        <Button size="sm" onClick={() => setAdding(true)}><Plus size={16} /></Button>
      </div>

      <div className="space-y-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_FILTERS.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`text-xs px-3 py-1.5 rounded-full border whitespace-nowrap ${statusFilter === s ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300" : "border-white/10 text-muted-foreground"}`}>{s}</button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FUNNEL_FILTERS.map((f) => (
            <button key={f} onClick={() => setFunnelFilter(f)} className={`text-xs px-3 py-1.5 rounded-full border whitespace-nowrap ${funnelFilter === f ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300" : "border-white/10 text-muted-foreground"}`}>{f}</button>
          ))}
        </div>
      </div>

      {adding && (
        <div className="rounded-2xl p-4 border space-y-3" style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)" }}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Add Idea</span>
            <button onClick={() => setAdding(false)} className="text-muted-foreground"><X size={18} /></button>
          </div>
          <textarea value={form.idea_angle} onChange={(e) => setForm({ ...form, idea_angle: e.target.value })} placeholder="Describe the idea angle..." className="w-full px-3 py-2.5 rounded-xl text-sm bg-black/20 border border-white/10 text-foreground placeholder:text-muted-foreground outline-none min-h-[80px] resize-none" />
          <input value={form.suggested_format} onChange={(e) => setForm({ ...form, suggested_format: e.target.value })} placeholder="Suggested format (e.g. F1, F12...)" className="w-full px-3 py-2.5 rounded-xl text-sm bg-black/20 border border-white/10 text-foreground placeholder:text-muted-foreground outline-none" />
          <div className="flex gap-2">
            {FUNNEL.map((f) => <button key={f} onClick={() => setForm({ ...form, funnel_stage: f })} className={`flex-1 py-2 rounded-xl text-xs font-semibold border ${form.funnel_stage === f ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300" : "border-white/10 text-muted-foreground"}`}>{f}</button>)}
          </div>
          <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="Tags (comma-separated)" className="w-full px-3 py-2.5 rounded-xl text-sm bg-black/20 border border-white/10 text-foreground placeholder:text-muted-foreground outline-none" />
          <input value={form.lead_magnet_ideas} onChange={(e) => setForm({ ...form, lead_magnet_ideas: e.target.value })} placeholder="Related lead magnet ideas (optional)" className="w-full px-3 py-2.5 rounded-xl text-sm bg-black/20 border border-white/10 text-foreground placeholder:text-muted-foreground outline-none" />
          <input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Source (e.g. Template Library, Knowledge Base doc, quick capture)" className="w-full px-3 py-2.5 rounded-xl text-sm bg-black/20 border border-white/10 text-foreground placeholder:text-muted-foreground outline-none" />
          <Button onClick={save} disabled={!form.idea_angle.trim() || saving} className="w-full">{saving ? "Saving..." : "Save Idea"}</Button>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((idea) => (
          <div key={idea.row} className="rounded-xl p-4 border space-y-2.5" style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)" }}>
            <div className="flex items-start gap-2 justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[idea.status] || statusColors["raw"]}`}>{idea.status}</span>
                {idea.funnel_stage && <div className={`w-2 h-2 rounded-full ${funnelDot[idea.funnel_stage]}`} title={idea.funnel_stage} />}
                {idea.suggested_format && <span className="text-xs text-muted-foreground">{idea.suggested_format}</span>}
              </div>
            </div>
            <p className="text-sm leading-relaxed">{idea.idea_angle}</p>
            {idea.tags && <p className="text-xs text-muted-foreground">{idea.tags.split(",").map((t) => t.trim()).filter(Boolean).join(" · ")}</p>}
            {idea.lead_magnet_ideas && <p className="text-xs text-muted-foreground">Lead magnet: <span className="text-indigo-300">{idea.lead_magnet_ideas}</span></p>}
            {idea.scheduled_slot && <p className="text-xs text-green-300">Scheduled: {idea.scheduled_slot}</p>}
            {idea.source && <p className="text-[11px] text-muted-foreground italic">Source: {idea.source}</p>}
            <div className="flex gap-2 pt-1">
              {STATUSES.filter((s) => s !== idea.status).map((s) => (
                <button key={s} onClick={() => updateStatus(idea, s)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-white/10 px-2 py-1 rounded-lg transition-colors">
                  <ArrowRight size={10} /> {s}
                </button>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="text-center py-10 text-muted-foreground"><Lightbulb size={40} className="mx-auto mb-3 opacity-30" /><p className="text-sm">No ideas match this filter.</p></div>}
      </div>
    </div>
  );
}
