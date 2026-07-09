"use client";

import { useEffect, useMemo, useState } from "react";
import { Flame, Search } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PostCard, type TemplateRow } from "@/components/viral-posts/post-card";
import { FiltersMenu } from "@/components/viral-posts/filters-menu";

const SAVED_KEY = "viral-posts-saved";

function parseRows(rows: string[][]): TemplateRow[] {
  return rows
    .slice(1)
    .map((r, i) => ({
      id: r[9] || `row-${i}`, // url is the most stable unique-ish key; falls back to index
      hook: r[0] || "",
      suggested_format: r[1] || "",
      expert: r[2] || "",
      domain: r[3] || "",
      likes: Number.parseInt(r[4] || "0", 10) || 0,
      comments: Number.parseInt(r[5] || "0", 10) || 0,
      shares: Number.parseInt(r[6] || "0", 10) || 0,
      comment_to_like_ratio: r[7] || "0",
      engagement_tier: r[8] || "",
      url: r[9] || "",
      date_added: r[10] || "",
    }))
    .filter((p) => p.hook);
}

function GroupedList({
  rows,
  groupBy,
  saved,
  onToggleSave,
}: {
  rows: TemplateRow[];
  groupBy: "domain" | "expert";
  saved: Set<string>;
  onToggleSave: (id: string) => void;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, TemplateRow[]>();
    for (const row of rows) {
      const key = (row[groupBy] || "Uncategorized").trim() || "Uncategorized";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [rows, groupBy]);

  if (groups.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-8">
      {groups.map(([name, items]) => (
        <div key={name} className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">{name}</h2>
            <span className="text-[11px] text-muted-foreground">{items.length} posts</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items
              .sort((a, b) => b.likes - a.likes)
              .map((p) => (
                <PostCard key={p.id} post={p} saved={saved.has(p.id)} onToggleSave={onToggleSave} />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground space-y-2"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <p>No Template Library rows found yet.</p>
      <p className="text-xs">
        Run <code className="px-1 py-0.5 rounded bg-black/20">node scripts/build-template-library.mjs</code> to build it from the tagged corpus.
      </p>
    </div>
  );
}

export default function ViralPostsPage() {
  const [tab, setTab] = useState("for-you");
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [format, setFormat] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/sheets?tab=${encodeURIComponent("Template Library")}&range=A:K`);
        if (res.ok) {
          const { rows } = await res.json();
          setRows(parseRows(rows as string[][]));
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();

    try {
      const raw = window.localStorage.getItem(SAVED_KEY);
      if (raw) setSaved(new Set(JSON.parse(raw)));
    } catch {
      // ignore malformed localStorage
    }
  }, []);

  const toggleSave = (id: string) => {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      window.localStorage.setItem(SAVED_KEY, JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const formats = useMemo(
    () => Array.from(new Set(rows.map((r) => r.suggested_format).filter(Boolean))).sort(),
    [rows]
  );

  const filteredRows = useMemo(
    () => (format ? rows.filter((r) => r.suggested_format === format) : rows),
    [rows, format]
  );

  const forYouRows = useMemo(
    () => [...filteredRows].sort((a, b) => b.likes - a.likes),
    [filteredRows]
  );

  const searchRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return forYouRows;
    return forYouRows.filter((r) => r.hook.toLowerCase().includes(q));
  }, [forYouRows, search]);

  return (
    <div className="max-w-lg lg:max-w-6xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Content</p>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Flame size={20} className="text-indigo-400" /> Viral Posts
          </h1>
        </div>
        <FiltersMenu formats={formats} active={format} onChange={setFormat} />
      </div>

      {loading ? (
        <div className="rounded-2xl border p-8 text-center text-sm text-muted-foreground" style={{ borderColor: "var(--border-subtle)" }}>
          Loading Template Library...
        </div>
      ) : error ? (
        <div className="rounded-2xl border p-8 text-center text-sm text-muted-foreground" style={{ borderColor: "var(--border-subtle)" }}>
          Couldn&apos;t load the Template Library tab. Check your Sheets connection.
        </div>
      ) : rows.length === 0 ? (
        <EmptyState />
      ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v as string)}>
          <TabsList variant="line">
            <TabsTrigger value="for-you">For You</TabsTrigger>
            <TabsTrigger value="search">Search</TabsTrigger>
            <TabsTrigger value="topics">Topics</TabsTrigger>
            <TabsTrigger value="creators">Creators</TabsTrigger>
          </TabsList>

          <TabsContent value="for-you" className="pt-4">
            {forYouRows.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {forYouRows.map((p) => (
                  <PostCard key={p.id} post={p} saved={saved.has(p.id)} onToggleSave={toggleSave} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="search" className="pt-4 space-y-4">
            <div
              className="flex items-center gap-2 rounded-xl border px-3 py-2"
              style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)" }}
            >
              <Search size={15} className="text-muted-foreground flex-shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search hooks..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            {searchRows.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground" style={{ borderColor: "var(--border-subtle)" }}>
                {search ? "No hooks match that search." : "Start typing to search hooks."}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchRows.map((p) => (
                  <PostCard key={p.id} post={p} saved={saved.has(p.id)} onToggleSave={toggleSave} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="topics" className="pt-4">
            <GroupedList rows={filteredRows} groupBy="domain" saved={saved} onToggleSave={toggleSave} />
          </TabsContent>

          <TabsContent value="creators" className="pt-4">
            <GroupedList rows={filteredRows} groupBy="expert" saved={saved} onToggleSave={toggleSave} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
