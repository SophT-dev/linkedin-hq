"use client";

import { useState, useEffect } from "react";
import { Plus, X, ExternalLink, Layers, TrendingUp, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// LeadMagnets is read by HEADER NAME, not fixed column position (2026-07-11),
// so columns can be reordered in the Sheet without breaking this view.
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

// "Ours" = lead magnets published on one of our own profiles, marked by the
// Source Creator (source_person) column. Right now that's Taha Anwar's profile.
const OUR_CREATORS = ["Taha Anwar"];

export default function LeadMagnets() {
  const [magnets, setMagnets] = useState<LeadMagnet[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [tab, setTab] = useState("own");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", hero_text: "", landing_url: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await fetch("/api/sheets?tab=LeadMagnets&range=A:Z");
    if (res.ok) {
      const { rows } = await res.json();
      const hdr = ((rows[0] as string[]) || []).map((h) => String(h || "").trim());
      setHeaders(hdr);
      const idx: Record<string, number> = {};
      hdr.forEach((h, i) => { if (h && idx[h] === undefined) idx[h] = i; });
      const g = (r: string[], k: string) => { const i = idx[k]; return i === undefined ? "" : (r[i] ?? ""); };
      setMagnets(
        (rows as string[][]).slice(1).map((raw, i) => ({
          id: g(raw, "id"), post_id: g(raw, "post_id"), slug: g(raw, "slug"), status: g(raw, "status"), title: g(raw, "title"),
          hero_text: g(raw, "hero_text"), value_props: g(raw, "value_props"), cta_text: g(raw, "cta_text"), outline_md: g(raw, "outline_md"),
          body_md: g(raw, "body_md"), notion_url: g(raw, "notion_url"), landing_url: g(raw, "landing_url"), gif_url: g(raw, "gif_url"),
          created_at: g(raw, "created_at"), clicks: parseInt(g(raw, "clicks")) || 0, conversions: parseInt(g(raw, "conversions")) || 0,
          kind: g(raw, "kind"), source_person: g(raw, "source_person"), source_post_url: g(raw, "source_post_url"),
          key_takeaway: g(raw, "key_takeaway"), used_in_post: g(raw, "used_in_post"), row: i + 2, raw,
        })).filter((m) => m.title.trim())
      );
    }
  };

  useEffect(() => { load(); }, []);

  // Ours = our own profiles (Source Creator is one of us); everything else is Received.
  const own = magnets.filter((m) => OUR_CREATORS.includes(m.source_person.trim())).sort((a, b) => b.clicks - a.clicks);
  const received = magnets.filter((m) => !OUR_CREATORS.includes(m.source_person.trim()));

  const totalClicks = own.reduce((a, m) => a + m.clicks, 0);
  const totalConversions = own.reduce((a, m) => a + m.conversions, 0);

  const headerIdx = (): Record<string, number> => {
    const idx: Record<string, number> = {};
    headers.forEach((h, i) => { if (h && idx[h] === undefined) idx[h] = i; });
    return idx;
  };

  const save = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    // Build the row by header name (order-independent). A manual add on the
    // "Ours" tab is one of our own magnets, so it's tagged with our creator.
    const idx = headerIdx();
    const values: (string | number)[] = new Array(headers.length).fill("");
    const set = (k: string, v: string | number) => { const i = idx[k]; if (i !== undefined) values[i] = v; };
    set("status", "published");
    set("title", form.title);
    set("hero_text", form.hero_text);
    set("landing_url", form.landing_url);
    set("created_at", new Date().toISOString().split("T")[0]);
    set("clicks", 0);
    set("conversions", 0);
    set("source_person", OUR_CREATORS[0]);
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
    const idx = headerIdx();
    const values = [...m.raw];
    while (values.length < headers.length) values.push("");
    const si = idx["status"];
    if (si !== undefined) values[si] = newStatus;
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
