"use client";

import { useState, useEffect } from "react";
import { Plus, X, ExternalLink, Layers, TrendingUp, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// LeadMagnets tab schema (A:U, 21 columns) — see linkedin-hq/CLAUDE.md's tab reference.
const COLS = 21;

interface LeadMagnet {
  id: string;
  post_id: string;
  slug: string;
  status: string;
  title: string;
  hero_text: string;
  value_props: string;
  cta_text: string;
  outline_md: string;
  body_md: string;
  notion_url: string;
  landing_url: string;
  gif_url: string;
  created_at: string;
  clicks: number;
  conversions: number;
  kind: string;
  source_person: string;
  source_post_url: string;
  key_takeaway: string;
  used_in_post: string;
  row: number;
  raw: string[];
}

const OWN_STATUS_COLORS: Record<string, string> = {
  researching: "bg-gray-500/20 text-gray-300",
  outline_ready: "bg-blue-500/20 text-blue-300",
  body_ready: "bg-purple-500/20 text-purple-300",
  published: "bg-green-500/20 text-green-300",
  error: "bg-red-500/20 text-red-300",
};

const RECEIVED_STATUS_COLORS: Record<string, string> = {
  unreviewed: "bg-amber-500/20 text-amber-300",
  reviewed: "bg-green-500/20 text-green-300",
};

function parseTakeaway(text: string): string[] {
  if (!text) return [];
  return text
    .split(/\n/)
    .map((line) => line.replace(/^[-•]\s*/, "").trim())
    .filter(Boolean);
}

function pad(row: string[], len: number): string[] {
  const out = row.slice(0, len);
  while (out.length < len) out.push("");
  return out;
}

export default function LeadMagnets() {
  const [magnets, setMagnets] = useState<LeadMagnet[]>([]);
  const [tab, setTab] = useState("own");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", hero_text: "", landing_url: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await fetch("/api/sheets?tab=LeadMagnets&range=A:U");
    if (res.ok) {
      const { rows } = await res.json();
      setMagnets(
        (rows as string[][]).slice(1).map((raw, i) => {
          const r = pad(raw, COLS);
          return {
            id: r[0], post_id: r[1], slug: r[2], status: r[3], title: r[4],
            hero_text: r[5], value_props: r[6], cta_text: r[7], outline_md: r[8],
            body_md: r[9], notion_url: r[10], landing_url: r[11], gif_url: r[12],
            created_at: r[13], clicks: parseInt(r[14]) || 0, conversions: parseInt(r[15]) || 0,
            kind: r[16] || "own", source_person: r[17], source_post_url: r[18],
            key_takeaway: r[19], used_in_post: r[20], row: i + 2, raw: r,
          };
        }).filter((m) => m.title.trim())
      );
    }
  };

  useEffect(() => { load(); }, []);

  const own = magnets.filter((m) => m.kind !== "received").sort((a, b) => b.clicks - a.clicks);
  const received = magnets.filter((m) => m.kind === "received");

  const totalClicks = own.reduce((a, m) => a + m.clicks, 0);
  const totalConversions = own.reduce((a, m) => a + m.conversions, 0);

  const save = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    // Full 21-column row, correct field positions (id/post_id/slug left blank — this is a
    // manual UI add, not a skill-built magnet with a nanoid + post link).
    const values = [
      "", "", "", "published", form.title, form.hero_text, "", "", "", "", "",
      form.landing_url, "", new Date().toISOString().split("T")[0], 0, 0,
      "own", "", "", "", "",
    ];
    await fetch("/api/sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tab: "LeadMagnets", values }),
    });
    setSaving(false);
    setAdding(false);
    setForm({ title: "", hero_text: "", landing_url: "" });
    await load();
  };

  const toggleReviewed = async (m: LeadMagnet) => {
    const newStatus = m.status === "reviewed" ? "unreviewed" : "reviewed";
    const values = [...m.raw];
    values[3] = newStatus;
    await fetch("/api/sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tab: "LeadMagnets", action: "update", rowIndex: m.row, values }),
    });
    await load();
  };

  return (
    <div className="max-w-lg lg:max-w-5xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Funnel</p>
          <h1 className="text-xl font-bold flex items-center gap-2"><Layers size={20} className="text-indigo-400" /> Lead Magnets</h1>
        </div>
        {tab === "own" && (
          <Button size="sm" onClick={() => setAdding(true)}><Plus size={16} className="mr-1" /> Add</Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as string)}>
        <TabsList variant="line">
          <TabsTrigger value="own">Ours ({own.length})</TabsTrigger>
          <TabsTrigger value="received">Received ({received.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="own" className="pt-4 space-y-5">
          {/* Summary */}
          {own.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Magnets", value: own.length },
                { label: "Total Clicks", value: totalClicks },
                { label: "Conversions", value: totalConversions },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl p-3 border text-center" style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)" }}>
                  <p className="text-lg font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}

          {adding && (
            <div className="rounded-2xl p-4 border space-y-3" style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)" }}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Add Lead Magnet</span>
                <button onClick={() => setAdding(false)} className="text-muted-foreground"><X size={18} /></button>
              </div>
              {[
                { key: "title", placeholder: "Lead magnet title *" },
                { key: "hero_text", placeholder: "Hero text / tagline" },
                { key: "landing_url", placeholder: "Landing page URL" },
              ].map(({ key, placeholder }) => (
                <input
                  key={key}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={placeholder}
                  className="w-full px-3 py-2.5 rounded-xl text-sm bg-black/20 border border-white/10 text-foreground placeholder:text-muted-foreground outline-none"
                />
              ))}
              <p className="text-xs text-muted-foreground">Update clicks/conversions directly in Google Sheets as they come in.</p>
              <Button onClick={save} disabled={!form.title.trim() || saving} className="w-full">{saving ? "Saving..." : "Save"}</Button>
            </div>
          )}

          <div className="space-y-3">
            {own.map((m) => {
              const cvr = m.clicks > 0 ? ((m.conversions / m.clicks) * 100).toFixed(1) : "0";
              return (
                <div key={m.row} className="rounded-xl p-4 border space-y-3" style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)" }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{m.title}</p>
                      {m.status && (
                        <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-semibold ${OWN_STATUS_COLORS[m.status] || "bg-gray-500/20 text-gray-300"}`}>
                          {m.status}
                        </span>
                      )}
                    </div>
                    {m.landing_url && (
                      <a href={m.landing_url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 p-1 flex-shrink-0"><ExternalLink size={16} /></a>
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
            {own.length === 0 && !adding && (
              <div className="text-center py-12 text-muted-foreground">
                <Layers size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No lead magnets tracked yet. Add your first one!</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="received" className="pt-4 space-y-3">
          {received.map((m) => {
            const takeaways = parseTakeaway(m.key_takeaway);
            const isDead = /dead link/i.test(m.key_takeaway || "");
            return (
              <div key={m.row} className="rounded-xl p-4 border space-y-2" style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)" }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{m.title}</p>
                    {m.source_person && (
                      <span className="text-xs text-indigo-300 flex items-center gap-1"><User size={11} /> {m.source_person}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 text-muted-foreground">received</span>
                    {isDead && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-semibold">dead link</span>}
                    <button
                      onClick={() => toggleReviewed(m)}
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold transition-colors ${RECEIVED_STATUS_COLORS[m.status] || "bg-gray-500/20 text-gray-300"}`}
                    >
                      {m.status || "unreviewed"}
                    </button>
                  </div>
                </div>
                {takeaways.length > 0 && (
                  <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                    {takeaways.map((t, idx) => <li key={idx}>{t}</li>)}
                  </ul>
                )}
                <div className="flex gap-3 flex-wrap pt-0.5">
                  {m.landing_url && (
                    <a href={m.landing_url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-300 flex items-center gap-1"><ExternalLink size={12} /> Resource link</a>
                  )}
                  {m.source_post_url && (
                    <a href={m.source_post_url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-300 flex items-center gap-1"><ExternalLink size={12} /> Source post</a>
                  )}
                </div>
              </div>
            );
          })}
          {received.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Layers size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No received lead magnets captured yet.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
