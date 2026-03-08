"use client";

import { useState, useEffect } from "react";
import { Plus, X, ExternalLink, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const TYPES = ["All", "YouTube", "Article", "Podcast", "Newsletter", "Twitter/X", "Other"];

interface Source {
  title: string;
  url: string;
  type: string;
  key_insight: string;
  date: string;
  row: number;
}

export default function Sources() {
  const [sources, setSources] = useState<Source[]>([]);
  const [filter, setFilter] = useState("All");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", url: "", type: "YouTube", key_insight: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await fetch("/api/sheets?tab=Sources&range=A:F");
    if (res.ok) {
      const { rows } = await res.json();
      setSources(
        (rows as string[][]).slice(1).map((r, i) => ({
          title: r[0], url: r[1], type: r[2], key_insight: r[3], date: r[4], row: i + 2,
        })).filter((s) => s.title).reverse()
      );
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    await fetch("/api/sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tab: "Sources",
        values: [form.title, form.url, form.type, form.key_insight, new Date().toISOString().split("T")[0]],
      }),
    });
    setSaving(false);
    setAdding(false);
    setForm({ title: "", url: "", type: "YouTube", key_insight: "" });
    await load();
  };

  const filtered = filter === "All" ? sources : sources.filter((s) => s.type === filter);

  const typeColors: Record<string, string> = {
    YouTube: "bg-red-500/15 text-red-300 border-red-500/20",
    Article: "bg-blue-500/15 text-blue-300 border-blue-500/20",
    Podcast: "bg-purple-500/15 text-purple-300 border-purple-500/20",
    Newsletter: "bg-amber-500/15 text-amber-300 border-amber-500/20",
    "Twitter/X": "bg-gray-500/15 text-gray-300 border-gray-500/20",
    Other: "bg-green-500/15 text-green-300 border-green-500/20",
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Learning</p>
          <h1 className="text-xl font-bold flex items-center gap-2"><LinkIcon size={20} className="text-indigo-400" /> Sources ({sources.length})</h1>
        </div>
        <Button size="sm" onClick={() => setAdding(true)}><Plus size={16} className="mr-1" /> Add</Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TYPES.map((t) => (
          <button key={t} onClick={() => setFilter(t)} className={`text-xs px-3 py-1.5 rounded-full border whitespace-nowrap transition-all ${filter === t ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300" : "border-white/10 text-muted-foreground"}`}>{t}</button>
        ))}
      </div>

      {adding && (
        <div className="rounded-2xl p-4 border space-y-3" style={{ background: "oklch(0.205 0 0)", borderColor: "oklch(1 0 0 / 8%)" }}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Add Source</span>
            <button onClick={() => setAdding(false)} className="text-muted-foreground"><X size={18} /></button>
          </div>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title *" className="w-full px-3 py-2.5 rounded-xl text-sm bg-black/20 border border-white/10 text-foreground placeholder:text-muted-foreground outline-none" />
          <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="URL (optional)" className="w-full px-3 py-2.5 rounded-xl text-sm bg-black/20 border border-white/10 text-foreground placeholder:text-muted-foreground outline-none" />
          <div className="flex gap-2 flex-wrap">
            {["YouTube", "Article", "Podcast", "Newsletter", "Twitter/X", "Other"].map((t) => (
              <button key={t} onClick={() => setForm({ ...form, type: t })} className={`text-xs px-3 py-1.5 rounded-full border ${form.type === t ? typeColors[t] : "border-white/10 text-muted-foreground"}`}>{t}</button>
            ))}
          </div>
          <textarea value={form.key_insight} onChange={(e) => setForm({ ...form, key_insight: e.target.value })} placeholder="Key insight or takeaway (1-2 lines)" className="w-full px-3 py-2.5 rounded-xl text-sm bg-black/20 border border-white/10 text-foreground placeholder:text-muted-foreground outline-none min-h-[80px] resize-none" />
          <p className="text-xs text-muted-foreground">For full notes, use your <a href="https://docs.google.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">Google Doc Knowledge Base</a></p>
          <Button onClick={save} disabled={!form.title.trim() || saving} className="w-full">{saving ? "Saving..." : "Save Source"}</Button>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((s) => (
          <div key={s.row} className="rounded-xl p-4 border space-y-2" style={{ background: "oklch(0.205 0 0)", borderColor: "oklch(1 0 0 / 8%)" }}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${typeColors[s.type] || typeColors["Other"]}`}>{s.type}</span>
                  {s.date && <span className="text-xs text-muted-foreground">{s.date}</span>}
                </div>
                <p className="text-sm font-medium">{s.title}</p>
                {s.key_insight && <p className="text-xs text-muted-foreground italic">{s.key_insight}</p>}
              </div>
              {s.url && (
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 p-1 flex-shrink-0"><ExternalLink size={16} /></a>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="text-center py-10 text-muted-foreground"><p className="text-sm">No sources logged yet.</p></div>}
      </div>
    </div>
  );
}
