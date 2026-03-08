"use client";

import { useState, useEffect } from "react";
import { Plus, ExternalLink, X, Users, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Creator {
  name: string;
  linkedin_url: string;
  niche: string;
  last_post_date: string;
  post_frequency: string;
  primary_format: string;
  notes: string;
  row: number;
}

export default function Creators() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<Creator | null>(null);
  const [form, setForm] = useState({ name: "", linkedin_url: "", niche: "", post_frequency: "", primary_format: "Text", notes: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await fetch("/api/sheets?tab=Creators&range=A:H");
    if (res.ok) {
      const { rows } = await res.json();
      setCreators(
        (rows as string[][]).slice(1).map((r, i) => ({
          name: r[0], linkedin_url: r[1], niche: r[2], last_post_date: r[3],
          post_frequency: r[4], primary_format: r[5], notes: r[6], row: i + 2,
        })).filter((c) => c.name)
      );
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await fetch("/api/sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tab: "Creators",
        values: [form.name, form.linkedin_url, form.niche, "", form.post_frequency, form.primary_format, form.notes],
      }),
    });
    setSaving(false);
    setAdding(false);
    setForm({ name: "", linkedin_url: "", niche: "", post_frequency: "", primary_format: "Text", notes: "" });
    await load();
  };

  const isActive = (lastPost: string) => {
    if (!lastPost) return null;
    const diff = Math.floor((Date.now() - new Date(lastPost).getTime()) / (1000 * 60 * 60 * 24));
    return diff <= 7;
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {selected ? (
        // Detail view
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground">
              <X size={20} />
            </button>
            <h2 className="text-lg font-bold">{selected.name}</h2>
          </div>
          <div className="rounded-2xl p-4 border space-y-3" style={{ background: "oklch(0.205 0 0)", borderColor: "oklch(1 0 0 / 8%)" }}>
            {selected.niche && <div><span className="text-xs text-muted-foreground">Niche</span><p className="text-sm">{selected.niche}</p></div>}
            {selected.post_frequency && <div><span className="text-xs text-muted-foreground">Posting Frequency</span><p className="text-sm">{selected.post_frequency}</p></div>}
            {selected.primary_format && <div><span className="text-xs text-muted-foreground">Primary Format</span><p className="text-sm">{selected.primary_format}</p></div>}
            {selected.notes && <div><span className="text-xs text-muted-foreground">Study Notes</span><p className="text-sm whitespace-pre-line mt-1">{selected.notes}</p></div>}
            {selected.linkedin_url && (
              <a href={selected.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-indigo-400 hover:underline">
                <ExternalLink size={14} /> Open LinkedIn Profile
              </a>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Competitors</p>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Users size={20} className="text-indigo-400" /> Creators ({creators.length})
              </h1>
            </div>
            <Button size="sm" onClick={() => setAdding(true)}><Plus size={16} className="mr-1" /> Add</Button>
          </div>

          {adding && (
            <div className="rounded-2xl p-4 border space-y-3" style={{ background: "oklch(0.205 0 0)", borderColor: "oklch(1 0 0 / 8%)" }}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Add Creator</span>
                <button onClick={() => setAdding(false)} className="text-muted-foreground"><X size={18} /></button>
              </div>
              {[
                { key: "name", placeholder: "Creator name *" },
                { key: "linkedin_url", placeholder: "LinkedIn URL" },
                { key: "niche", placeholder: "Niche / focus area" },
                { key: "post_frequency", placeholder: "Posting frequency (e.g. daily, 3x/week)" },
              ].map(({ key, placeholder }) => (
                <input
                  key={key}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={placeholder}
                  className="w-full px-3 py-2.5 rounded-xl text-sm bg-black/20 border border-white/10 text-foreground placeholder:text-muted-foreground outline-none"
                />
              ))}
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Study notes — what's working for them, what formats they use, hooks that landed..."
                className="w-full px-3 py-2.5 rounded-xl text-sm bg-black/20 border border-white/10 text-foreground placeholder:text-muted-foreground outline-none min-h-[80px] resize-none"
              />
              <Button onClick={save} disabled={!form.name.trim() || saving} className="w-full">
                {saving ? "Saving..." : "Save Creator"}
              </Button>
            </div>
          )}

          <div className="space-y-3">
            {creators.map((c) => {
              const active = isActive(c.last_post_date);
              return (
                <button
                  key={c.row}
                  onClick={() => setSelected(c)}
                  className="w-full rounded-2xl p-4 border text-left transition-all hover:brightness-110 space-y-2"
                  style={{ background: "oklch(0.205 0 0)", borderColor: "oklch(1 0 0 / 8%)" }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{c.name}</span>
                      {active !== null && (
                        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${active ? "bg-green-500/15 text-green-400" : "bg-gray-500/15 text-muted-foreground"}`}>
                          <Activity size={10} /> {active ? "Active" : "Quiet"}
                        </span>
                      )}
                    </div>
                    {c.linkedin_url && (
                      <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-indigo-400 p-1">
                        <ExternalLink size={16} />
                      </a>
                    )}
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    {c.niche && <span>{c.niche}</span>}
                    {c.post_frequency && <span>· {c.post_frequency}</span>}
                    {c.primary_format && <span>· {c.primary_format}</span>}
                  </div>
                  {c.notes && <p className="text-xs text-muted-foreground line-clamp-2">{c.notes}</p>}
                </button>
              );
            })}

            {creators.length === 0 && !adding && (
              <div className="text-center py-12 text-muted-foreground">
                <Users size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No creators tracked yet. Add your first one!</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
