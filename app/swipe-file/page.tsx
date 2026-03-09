"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Star, X, ExternalLink, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const FORMATS = ["All", "Text", "Carousel", "Image", "Video", "Story"];
const POST_TAGS = ["Hook", "CTA", "Storytelling", "Listicle", "Controversy", "Value", "Case Study", "Framework", "Humor"];

interface SwipeEntry {
  post_text: string;
  url: string;
  creator: string;
  format: string;
  tags: string;
  notes: string;
  date: string;
  starred: string;
  row: number;
}

export default function SwipeFile() {
  const [entries, setEntries] = useState<SwipeEntry[]>([]);
  const [search, setSearch] = useState("");
  const [filterFormat, setFilterFormat] = useState("All");
  const [filterCreator, setFilterCreator] = useState("All");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ post_text: "", url: "", creator: "", format: "Text", tags: [] as string[], notes: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await fetch("/api/sheets?tab=SwipeFile&range=A:I");
    if (res.ok) {
      const { rows } = await res.json();
      setEntries(
        (rows as string[][]).slice(1).map((r, i) => ({
          post_text: r[0], url: r[1], creator: r[2], format: r[3],
          tags: r[4], notes: r[5], date: r[6], starred: r[7],
          row: i + 2,
        })).filter((e) => e.post_text).reverse()
      );
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.post_text.trim()) return;
    setSaving(true);
    await fetch("/api/sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tab: "SwipeFile",
        values: [form.post_text, form.url, form.creator, form.format, form.tags.join(","), form.notes, new Date().toISOString().split("T")[0], "FALSE"],
      }),
    });
    setSaving(false);
    setAdding(false);
    setForm({ post_text: "", url: "", creator: "", format: "Text", tags: [], notes: "" });
    await load();
  };

  const toggleStar = async (entry: SwipeEntry) => {
    await fetch("/api/sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tab: "SwipeFile", action: "update", rowIndex: entry.row,
        values: [entry.post_text, entry.url, entry.creator, entry.format, entry.tags, entry.notes, entry.date, entry.starred === "TRUE" ? "FALSE" : "TRUE"],
      }),
    });
    await load();
  };

  const creators = ["All", ...Array.from(new Set(entries.map((e) => e.creator).filter(Boolean)))];

  const filtered = entries.filter((e) => {
    const matchSearch = !search || e.post_text?.toLowerCase().includes(search.toLowerCase()) || e.creator?.toLowerCase().includes(search.toLowerCase()) || e.tags?.toLowerCase().includes(search.toLowerCase());
    const matchFormat = filterFormat === "All" || e.format === filterFormat;
    const matchCreator = filterCreator === "All" || e.creator === filterCreator;
    return matchSearch && matchFormat && matchCreator;
  });

  const tagColors = "bg-indigo-500/10 text-indigo-300 border-indigo-500/20";

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Swipe File</p>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BookOpen size={20} className="text-indigo-400" />
            Saved Posts ({entries.length})
          </h1>
        </div>
        <Button size="sm" onClick={() => setAdding(true)}>
          <Plus size={16} className="mr-1" /> Add
        </Button>
      </div>

      {/* Search + filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search posts, creators, tags..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-card border border-white/10 text-foreground placeholder:text-muted-foreground outline-none focus:border-indigo-500/50"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FORMATS.map((f) => (
            <button
              key={f}
              onClick={() => setFilterFormat(f)}
              className={`text-xs px-3 py-1.5 rounded-full border whitespace-nowrap transition-all ${
                filterFormat === f ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300" : "border-white/10 text-muted-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        {creators.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {creators.map((c) => (
              <button
                key={c}
                onClick={() => setFilterCreator(c)}
                className={`text-xs px-3 py-1.5 rounded-full border whitespace-nowrap transition-all ${
                  filterCreator === c ? "bg-amber-500/20 border-amber-500/50 text-amber-300" : "border-white/10 text-muted-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Add form */}
      {adding && (
        <div className="rounded-2xl p-4 border space-y-3" style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)" }}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Add Post to Swipe File</span>
            <button onClick={() => setAdding(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
          </div>
          <Textarea value={form.post_text} onChange={(e) => setForm({ ...form, post_text: e.target.value })} placeholder="Paste the post text..." className="min-h-[100px] bg-black/20 border-white/10 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <input value={form.creator} onChange={(e) => setForm({ ...form, creator: e.target.value })} placeholder="Creator name" className="px-3 py-2 rounded-xl text-sm bg-black/20 border border-white/10 text-foreground placeholder:text-muted-foreground outline-none" />
            <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="Post URL" className="px-3 py-2 rounded-xl text-sm bg-black/20 border border-white/10 text-foreground placeholder:text-muted-foreground outline-none" />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {["Text", "Carousel", "Image", "Video", "Story"].map((f) => (
              <button key={f} onClick={() => setForm({ ...form, format: f })} className={`text-xs px-3 py-1.5 rounded-full border whitespace-nowrap ${form.format === f ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300" : "border-white/10 text-muted-foreground"}`}>{f}</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {POST_TAGS.map((t) => (
              <button key={t} onClick={() => setForm({ ...form, tags: form.tags.includes(t) ? form.tags.filter((x) => x !== t) : [...form.tags, t] })} className={`text-xs px-2.5 py-1 rounded-full border transition-all ${form.tags.includes(t) ? tagColors : "border-white/10 text-muted-foreground"}`}>{t}</button>
            ))}
          </div>
          <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes — what made this work?" className="w-full px-3 py-2 rounded-xl text-sm bg-black/20 border border-white/10 text-foreground placeholder:text-muted-foreground outline-none" />
          <Button onClick={save} disabled={!form.post_text.trim() || saving} className="w-full">{saving ? "Saving..." : "Save to Swipe File"}</Button>
        </div>
      )}

      {/* Entries */}
      {filtered.length === 0 && !adding && (
        <div className="text-center py-12 text-muted-foreground">
          <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No posts saved yet. Start adding posts you love!</p>
        </div>
      )}
      <div className="space-y-3">
        {filtered.map((e) => (
          <div key={e.row} className="rounded-2xl p-4 border space-y-2.5" style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)" }}>
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {e.creator && <span className="text-xs font-medium text-indigo-300">{e.creator}</span>}
                  <span className="text-xs px-2 py-0.5 rounded border border-white/10 text-muted-foreground">{e.format}</span>
                  {e.date && <span className="text-xs text-muted-foreground">{e.date}</span>}
                </div>
                <p className="text-sm line-clamp-3 leading-relaxed">{e.post_text}</p>
              </div>
              <button onClick={() => toggleStar(e)} className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${e.starred === "TRUE" ? "text-amber-400" : "text-muted-foreground hover:text-amber-400"}`}>
                <Star size={18} fill={e.starred === "TRUE" ? "currentColor" : "none"} />
              </button>
            </div>
            {e.tags && (
              <div className="flex flex-wrap gap-1.5">
                {e.tags.split(",").filter(Boolean).map((t) => (
                  <span key={t} className={`text-xs px-2 py-0.5 rounded-full border ${tagColors}`}>{t.trim()}</span>
                ))}
              </div>
            )}
            {e.notes && <p className="text-xs text-muted-foreground italic">&ldquo;{e.notes}&rdquo;</p>}
            {e.url && (
              <a href={e.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-indigo-400 hover:underline">
                <ExternalLink size={12} /> View original
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
