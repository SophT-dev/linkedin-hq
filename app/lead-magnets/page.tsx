"use client";

import { useState, useEffect } from "react";
import { Plus, X, ExternalLink, Layers, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LeadMagnet {
  name: string;
  landing_page_url: string;
  source_post: string;
  clicks: number;
  conversions: number;
  date: string;
  notes: string;
  row: number;
}

export default function LeadMagnets() {
  const [magnets, setMagnets] = useState<LeadMagnet[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", landing_page_url: "", source_post: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await fetch("/api/sheets?tab=LeadMagnets&range=A:H");
    if (res.ok) {
      const { rows } = await res.json();
      setMagnets(
        (rows as string[][]).slice(1).map((r, i) => ({
          name: r[0], landing_page_url: r[1], source_post: r[2],
          clicks: parseInt(r[3]) || 0, conversions: parseInt(r[4]) || 0,
          date: r[5], notes: r[6], row: i + 2,
        })).filter((m) => m.name).sort((a, b) => b.clicks - a.clicks)
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
        tab: "LeadMagnets",
        values: [form.name, form.landing_page_url, form.source_post, 0, 0, new Date().toISOString().split("T")[0], form.notes],
      }),
    });
    setSaving(false);
    setAdding(false);
    setForm({ name: "", landing_page_url: "", source_post: "", notes: "" });
    await load();
  };

  const totalClicks = magnets.reduce((a, m) => a + m.clicks, 0);
  const totalConversions = magnets.reduce((a, m) => a + m.conversions, 0);

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Funnel</p>
          <h1 className="text-xl font-bold flex items-center gap-2"><Layers size={20} className="text-indigo-400" /> Lead Magnets</h1>
        </div>
        <Button size="sm" onClick={() => setAdding(true)}><Plus size={16} className="mr-1" /> Add</Button>
      </div>

      {/* Summary */}
      {magnets.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Magnets", value: magnets.length },
            { label: "Total Clicks", value: totalClicks },
            { label: "Conversions", value: totalConversions },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl p-3 border text-center" style={{ background: "oklch(0.205 0 0)", borderColor: "oklch(1 0 0 / 8%)" }}>
              <p className="text-lg font-bold">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <div className="rounded-2xl p-4 border space-y-3" style={{ background: "oklch(0.205 0 0)", borderColor: "oklch(1 0 0 / 8%)" }}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Add Lead Magnet</span>
            <button onClick={() => setAdding(false)} className="text-muted-foreground"><X size={18} /></button>
          </div>
          {[
            { key: "name", placeholder: "Lead magnet name *" },
            { key: "landing_page_url", placeholder: "Landing page URL" },
            { key: "source_post", placeholder: "LinkedIn post(s) linking to it" },
            { key: "notes", placeholder: "Notes" },
          ].map(({ key, placeholder }) => (
            <input key={key} value={form[key as keyof typeof form]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder} className="w-full px-3 py-2.5 rounded-xl text-sm bg-black/20 border border-white/10 text-foreground placeholder:text-muted-foreground outline-none" />
          ))}
          <p className="text-xs text-muted-foreground">Update clicks/conversions directly in Google Sheets as they come in.</p>
          <Button onClick={save} disabled={!form.name.trim() || saving} className="w-full">{saving ? "Saving..." : "Save"}</Button>
        </div>
      )}

      <div className="space-y-3">
        {magnets.map((m) => {
          const cvr = m.clicks > 0 ? ((m.conversions / m.clicks) * 100).toFixed(1) : "0";
          return (
            <div key={m.row} className="rounded-xl p-4 border space-y-3" style={{ background: "oklch(0.205 0 0)", borderColor: "oklch(1 0 0 / 8%)" }}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{m.name}</p>
                  {m.source_post && <p className="text-xs text-muted-foreground mt-0.5">From: {m.source_post}</p>}
                </div>
                {m.landing_page_url && (
                  <a href={m.landing_page_url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 p-1 flex-shrink-0"><ExternalLink size={16} /></a>
                )}
              </div>
              <div className="flex gap-4">
                <div>
                  <p className="text-lg font-bold">{m.clicks}</p>
                  <p className="text-xs text-muted-foreground">Clicks</p>
                </div>
                <div>
                  <p className="text-lg font-bold">{m.conversions}</p>
                  <p className="text-xs text-muted-foreground">Conversions</p>
                </div>
                <div>
                  <p className="text-lg font-bold flex items-center gap-1">{cvr}% <TrendingUp size={14} className="text-green-400" /></p>
                  <p className="text-xs text-muted-foreground">CVR</p>
                </div>
              </div>
            </div>
          );
        })}
        {magnets.length === 0 && !adding && (
          <div className="text-center py-12 text-muted-foreground">
            <Layers size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No lead magnets tracked yet. Add your first one!</p>
          </div>
        )}
      </div>
    </div>
  );
}
