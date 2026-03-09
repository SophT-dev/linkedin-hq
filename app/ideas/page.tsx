"use client";

import { useState, useEffect } from "react";
import { Plus, X, Lightbulb, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const TYPES = ["All", "Post", "Hook", "Strategy", "Lead Magnet"];
const FUNNEL = ["TOFU", "MOFU", "BOFU"];
const STATUSES = ["New", "In Progress", "Used", "Archived"];

const statusColors: Record<string, string> = {
  New: "bg-blue-500/15 text-blue-300",
  "In Progress": "bg-amber-500/15 text-amber-300",
  Used: "bg-green-500/15 text-green-300",
  Archived: "bg-gray-500/15 text-gray-300",
};

interface Idea {
  idea: string;
  type: string;
  funnel_stage: string;
  lead_magnet: string;
  status: string;
  hook_score: string;
  date: string;
  row: number;
}

export default function IdeasBank() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [filter, setFilter] = useState("All");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ idea: "", type: "Post", funnel_stage: "TOFU", lead_magnet: "", status: "New" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await fetch("/api/sheets?tab=IdeasBank&range=A:H");
    if (res.ok) {
      const { rows } = await res.json();
      setIdeas(
        (rows as string[][]).slice(1).map((r, i) => ({
          idea: r[0], type: r[1], funnel_stage: r[2], lead_magnet: r[3],
          status: r[4], hook_score: r[5], date: r[6], row: i + 2,
        })).filter((id) => id.idea).reverse()
      );
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.idea.trim()) return;
    setSaving(true);
    await fetch("/api/sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tab: "IdeasBank",
        values: [form.idea, form.type, form.funnel_stage, form.lead_magnet, form.status, "", new Date().toISOString().split("T")[0]],
      }),
    });
    setSaving(false);
    setAdding(false);
    setForm({ idea: "", type: "Post", funnel_stage: "TOFU", lead_magnet: "", status: "New" });
    await load();
  };

  const updateStatus = async (idea: Idea, status: string) => {
    await fetch("/api/sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tab: "IdeasBank", action: "update", rowIndex: idea.row,
        values: [idea.idea, idea.type, idea.funnel_stage, idea.lead_magnet, status, idea.hook_score, idea.date],
      }),
    });
    await load();
  };

  const filtered = filter === "All" ? ideas : ideas.filter((i) => i.type === filter);

  const funnelDot: Record<string, string> = { TOFU: "bg-blue-400", MOFU: "bg-amber-400", BOFU: "bg-green-400" };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Ideas</p>
          <h1 className="text-xl font-bold flex items-center gap-2"><Lightbulb size={20} className="text-indigo-400" /> Ideas Bank ({ideas.length})</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/ai-studio?tab=ideas" className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border border-white/10 text-muted-foreground hover:text-foreground">
            <Sparkles size={14} /> AI Ideas
          </Link>
          <Button size="sm" onClick={() => setAdding(true)}><Plus size={16} /></Button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TYPES.map((t) => (
          <button key={t} onClick={() => setFilter(t)} className={`text-xs px-3 py-1.5 rounded-full border whitespace-nowrap ${filter === t ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300" : "border-white/10 text-muted-foreground"}`}>{t}</button>
        ))}
      </div>

      {adding && (
        <div className="rounded-2xl p-4 border space-y-3" style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)" }}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Add Idea</span>
            <button onClick={() => setAdding(false)} className="text-muted-foreground"><X size={18} /></button>
          </div>
          <textarea value={form.idea} onChange={(e) => setForm({ ...form, idea: e.target.value })} placeholder="Describe the idea..." className="w-full px-3 py-2.5 rounded-xl text-sm bg-black/20 border border-white/10 text-foreground placeholder:text-muted-foreground outline-none min-h-[80px] resize-none" />
          <div className="flex gap-2 flex-wrap">
            {["Post", "Hook", "Strategy", "Lead Magnet"].map((t) => (
              <button key={t} onClick={() => setForm({ ...form, type: t })} className={`text-xs px-3 py-1.5 rounded-full border ${form.type === t ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300" : "border-white/10 text-muted-foreground"}`}>{t}</button>
            ))}
          </div>
          <div className="flex gap-2">
            {FUNNEL.map((f) => <button key={f} onClick={() => setForm({ ...form, funnel_stage: f })} className={`flex-1 py-2 rounded-xl text-xs font-semibold border ${form.funnel_stage === f ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300" : "border-white/10 text-muted-foreground"}`}>{f}</button>)}
          </div>
          <input value={form.lead_magnet} onChange={(e) => setForm({ ...form, lead_magnet: e.target.value })} placeholder="Related lead magnet (optional)" className="w-full px-3 py-2.5 rounded-xl text-sm bg-black/20 border border-white/10 text-foreground placeholder:text-muted-foreground outline-none" />
          <Button onClick={save} disabled={!form.idea.trim() || saving} className="w-full">{saving ? "Saving..." : "Save Idea"}</Button>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((idea) => (
          <div key={idea.row} className="rounded-xl p-4 border space-y-2.5" style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)" }}>
            <div className="flex items-start gap-2 justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[idea.status] || statusColors["New"]}`}>{idea.status}</span>
                {idea.funnel_stage && <div className={`w-2 h-2 rounded-full ${funnelDot[idea.funnel_stage]}`} title={idea.funnel_stage} />}
                <span className="text-xs text-muted-foreground">{idea.type}</span>
              </div>
              {idea.hook_score && <span className="text-xs font-bold text-indigo-300">{idea.hook_score}/10</span>}
            </div>
            <p className="text-sm leading-relaxed">{idea.idea}</p>
            {idea.lead_magnet && <p className="text-xs text-muted-foreground">Lead magnet: <span className="text-indigo-300">{idea.lead_magnet}</span></p>}
            <div className="flex gap-2 pt-1">
              {STATUSES.filter((s) => s !== idea.status).slice(0, 2).map((s) => (
                <button key={s} onClick={() => updateStatus(idea, s)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-white/10 px-2 py-1 rounded-lg transition-colors">
                  <ArrowRight size={10} /> {s}
                </button>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="text-center py-10 text-muted-foreground"><Lightbulb size={40} className="mx-auto mb-3 opacity-30" /><p className="text-sm">No ideas yet. Add one or generate with AI!</p></div>}
      </div>
    </div>
  );
}
