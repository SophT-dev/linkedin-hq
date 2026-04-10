"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { RefreshCw } from "lucide-react";
import NewsItem, { NewsItemData } from "@/components/NewsItem";

const SOURCE_FILTERS = [
  { key: "all", label: "all" },
  { key: "linkedin", label: "linkedin" },
  { key: "reddit", label: "reddit" },
  { key: "news", label: "news" },
];

type WindowMode = "1h" | "24h" | "week" | "all";

const WINDOWS: { key: WindowMode; label: string; ms: number | null }[] = [
  { key: "1h", label: "past hour", ms: 60 * 60 * 1000 },
  { key: "24h", label: "past 24h", ms: 24 * 60 * 60 * 1000 },
  { key: "week", label: "past week", ms: 7 * 24 * 60 * 60 * 1000 },
  { key: "all", label: "all time", ms: null },
];

function nextWiderWindow(current: WindowMode): WindowMode | null {
  const idx = WINDOWS.findIndex((w) => w.key === current);
  if (idx < 0 || idx >= WINDOWS.length - 1) return null;
  return WINDOWS[idx + 1].key;
}

type SortMode = "latest" | "popular" | "freshest";

const SORTS: { key: SortMode; label: string }[] = [
  { key: "latest", label: "latest" },
  { key: "popular", label: "most popular" },
  { key: "freshest", label: "just pulled" },
];

// Order in which the type groups are rendered.
const GROUP_ORDER: { key: string; label: string }[] = [
  { key: "reddit", label: "reddit" },
  { key: "news", label: "news" },
  { key: "linkedin", label: "linkedin" },
];

const PER_GROUP_INITIAL = 5;
const PER_GROUP_INCREMENT = 5;

function tsOrZero(iso: string): number {
  const t = Date.parse(iso);
  return isNaN(t) ? 0 : t;
}

// The "post age" of an item — what we filter the time window against.
// Falls back to pulled_at when posted_at is missing so it never lies.
function postAge(item: NewsItemData): number {
  return tsOrZero(item.posted_at) || tsOrZero(item.pulled_at);
}

export default function NewsPage() {
  const [items, setItems] = useState<NewsItemData[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [windowMode, setWindowMode] = useState<WindowMode>("week");
  const [sort, setSort] = useState<SortMode>("latest");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);
  const [lastSeen, setLastSeen] = useState<number>(0);
  // Per-group "show more" state — number of items to render in each group.
  const [groupShowCount, setGroupShowCount] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/news", { cache: "no-store" });
      const data = await res.json();
      setItems(data.items || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const stored = Number(localStorage.getItem("news.lastSeen") || "0");
    setLastSeen(stored);
    load().then(() => {
      const now = Date.now();
      localStorage.setItem("news.lastSeen", String(now));
    });
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    setRefreshMsg("researching... 30-60s");
    try {
      const res = await fetch("/api/intel/refresh", { method: "POST" });
      const data = await res.json();
      const added = (data.ingested ?? 0) as number;
      const skipped = (data.skipped ?? 0) as number;
      if (data.ok || data.fetched > 0) {
        setRefreshMsg(
          added > 0
            ? `+${added} new (${skipped} already in feed)`
            : `nothing new (${skipped} already in feed)`
        );
      } else {
        setRefreshMsg(
          `error: ${(data.errors || ["unknown"]).slice(0, 1).join("; ")}`
        );
      }
      setLastSeen(Date.now() - 1);
      await load();
      const now = Date.now();
      setTimeout(() => {
        localStorage.setItem("news.lastSeen", String(now));
      }, 500);
    } catch (e) {
      setRefreshMsg(`error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRefreshing(false);
      setTimeout(() => setRefreshMsg(null), 8000);
    }
  };

  // Pipeline: source filter → window filter → sort. Grouping comes after.
  const visible = useMemo(() => {
    const cutoffMs = WINDOWS.find((w) => w.key === windowMode)?.ms ?? null;
    const cutoffTs = cutoffMs ? Date.now() - cutoffMs : 0;

    let list = filter === "all" ? items : items.filter((i) => i.type === filter);

    if (cutoffTs) {
      list = list.filter((i) => {
        const age = postAge(i);
        // Items with no parseable date are excluded from windowed views.
        return age > 0 && age >= cutoffTs;
      });
    }

    list = [...list];
    if (sort === "popular") {
      list.sort((a, b) => {
        const sd = (b.score || 0) - (a.score || 0);
        if (sd !== 0) return sd;
        return postAge(b) - postAge(a);
      });
    } else if (sort === "freshest") {
      list.sort((a, b) => tsOrZero(b.pulled_at) - tsOrZero(a.pulled_at));
    } else {
      list.sort((a, b) => postAge(b) - postAge(a));
    }
    return list;
  }, [items, filter, windowMode, sort]);

  // Group visible items by type, preserving each group's sort order.
  const grouped = useMemo(() => {
    const map: Record<string, NewsItemData[]> = {};
    for (const it of visible) {
      const key = it.type || "news";
      if (!map[key]) map[key] = [];
      map[key].push(it);
    }
    return map;
  }, [visible]);

  // Counts for the source filter chips (across ALL items, ignoring source filter).
  const totalByType: Record<string, number> = {};
  for (const it of items) totalByType[it.type] = (totalByType[it.type] || 0) + 1;

  const showCountFor = (groupKey: string) =>
    groupShowCount[groupKey] ?? PER_GROUP_INITIAL;

  const expandGroup = (groupKey: string) => {
    setGroupShowCount((prev) => ({
      ...prev,
      [groupKey]: (prev[groupKey] ?? PER_GROUP_INITIAL) + PER_GROUP_INCREMENT,
    }));
  };

  const wider = nextWiderWindow(windowMode);
  const isEmpty = !loading && visible.length === 0;

  // When source filter is "all", render the grouped layout.
  // When source filter is a single type, render a flat list (no grouping needed).
  const renderGrouped = filter === "all";

  return (
    <div className="min-h-dvh px-4 pt-6 pb-24 max-w-2xl mx-auto">
      <header className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold lowercase">news</h1>
          <p className="text-xs text-muted-foreground lowercase">
            your personalized cold email intel feed
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border transition-colors disabled:opacity-50"
          style={{
            background: "var(--surface-2)",
            borderColor: "var(--border-accent)",
            color: "var(--color-accent)",
          }}
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "refreshing" : "refresh"}
        </button>
      </header>

      {refreshMsg && (
        <div
          className="mb-3 px-3 py-2 rounded-lg text-xs"
          style={{
            background: "var(--surface-2)",
            color: "var(--color-accent)",
          }}
        >
          {refreshMsg}
        </div>
      )}

      {/* Source chips */}
      <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-none">
        {SOURCE_FILTERS.map((f) => {
          const count = f.key === "all" ? items.length : totalByType[f.key] || 0;
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="shrink-0 text-xs px-3 py-1.5 rounded-full border transition-all"
              style={{
                background: active ? "var(--color-accent)" : "var(--surface-1)",
                borderColor: active ? "var(--color-accent)" : "var(--border-subtle)",
                color: active ? "white" : "var(--foreground)",
              }}
            >
              {f.label} {count > 0 && <span className="opacity-60">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Window chips */}
      <div className="flex items-center gap-2 mb-2 mt-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">
          when
        </span>
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 scrollbar-none">
          {WINDOWS.map((w) => {
            const active = windowMode === w.key;
            return (
              <button
                key={w.key}
                onClick={() => setWindowMode(w.key)}
                className="shrink-0 text-[11px] px-2.5 py-1 rounded-md border transition-all"
                style={{
                  background: active ? "var(--surface-3)" : "transparent",
                  borderColor: active ? "var(--border-accent)" : "var(--border-subtle)",
                  color: active ? "var(--color-accent)" : "var(--muted-foreground, #888)",
                }}
              >
                {w.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sort chips */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">
          sort
        </span>
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 scrollbar-none">
          {SORTS.map((s) => {
            const active = sort === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setSort(s.key)}
                className="shrink-0 text-[11px] px-2.5 py-1 rounded-md border transition-all"
                style={{
                  background: active ? "var(--surface-3)" : "transparent",
                  borderColor: active ? "var(--border-accent)" : "var(--border-subtle)",
                  color: active ? "var(--color-accent)" : "var(--muted-foreground, #888)",
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 rounded-xl animate-pulse"
              style={{ background: "var(--surface-1)" }}
            />
          ))}
        </div>
      ) : isEmpty ? (
        <div
          className="text-center py-10 px-4 rounded-xl border"
          style={{
            background: "var(--surface-1)",
            borderColor: "var(--border-subtle)",
          }}
        >
          <p className="text-sm text-muted-foreground mb-3">
            {items.length === 0
              ? "no intel yet. click refresh to pull the latest."
              : `no ${filter === "all" ? "" : filter + " "}posts in the ${WINDOWS.find((w) => w.key === windowMode)?.label}.`}
          </p>
          {wider && items.length > 0 && (
            <button
              onClick={() => setWindowMode(wider)}
              className="text-xs px-4 py-2 rounded-lg border transition-colors"
              style={{
                background: "var(--surface-2)",
                borderColor: "var(--border-accent)",
                color: "var(--color-accent)",
              }}
            >
              expand to {WINDOWS.find((w) => w.key === wider)?.label}
            </button>
          )}
        </div>
      ) : renderGrouped ? (
        <div className="space-y-6">
          {GROUP_ORDER.filter((g) => (grouped[g.key] || []).length > 0).map((g) => {
            const groupItems = grouped[g.key] || [];
            const showCount = showCountFor(g.key);
            const visibleSlice = groupItems.slice(0, showCount);
            const hasMore = groupItems.length > showCount;
            return (
              <section key={g.key}>
                <header className="flex items-center gap-2 mb-2 px-1">
                  <h2 className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                    {g.label}
                  </h2>
                  <span className="text-[10px] text-muted-foreground opacity-70">
                    {visibleSlice.length} of {groupItems.length}
                  </span>
                </header>
                <div className="space-y-3">
                  {visibleSlice.map((item, i) => {
                    const itemTs = tsOrZero(item.pulled_at);
                    const isNew = lastSeen > 0 && itemTs > lastSeen;
                    return (
                      <div
                        key={`${item.url}-${i}`}
                        style={
                          isNew
                            ? {
                                outline: "1px solid var(--color-accent)",
                                borderRadius: "12px",
                              }
                            : undefined
                        }
                      >
                        <NewsItem item={item} />
                      </div>
                    );
                  })}
                </div>
                {hasMore && (
                  <button
                    onClick={() => expandGroup(g.key)}
                    className="mt-2 w-full text-xs py-2 rounded-lg border transition-colors hover:bg-white/5"
                    style={{
                      borderColor: "var(--border-subtle)",
                      color: "var(--color-accent)",
                    }}
                  >
                    show {Math.min(PER_GROUP_INCREMENT, groupItems.length - showCount)} more
                  </button>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        // Single source selected — flat list, capped at 20.
        <div className="space-y-3">
          {visible.slice(0, 20).map((item, i) => {
            const itemTs = tsOrZero(item.pulled_at);
            const isNew = lastSeen > 0 && itemTs > lastSeen;
            return (
              <div
                key={`${item.url}-${i}`}
                style={
                  isNew
                    ? {
                        outline: "1px solid var(--color-accent)",
                        borderRadius: "12px",
                      }
                    : undefined
                }
              >
                <NewsItem item={item} />
              </div>
            );
          })}
          {visible.length > 20 && (
            <p className="text-center text-xs text-muted-foreground py-2">
              showing 20 of {visible.length}. narrow with the time window above.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
