"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { RefreshCw, Zap, ArrowUpRight } from "lucide-react";
import NewsItem, { NewsItemData, catFor } from "@/components/NewsItem";
import DailyReport from "@/components/DailyReport";

// Topic categories (mapped from Intel `type`). "all" + "saved" are virtual.
const CATEGORIES = [
  { key: "all", label: "All", emoji: "✨" },
  { key: "tools", label: "Tool Updates", emoji: "🛠️" },
  { key: "linkedin", label: "Creators", emoji: "👀" },
  { key: "news", label: "News", emoji: "📰" },
  { key: "reddit", label: "Community", emoji: "💬" },
  { key: "saved", label: "Saved", emoji: "⭐" },
];

type WindowMode = "24h" | "week" | "all";
const WINDOWS: { key: WindowMode; label: string; ms: number | null }[] = [
  { key: "24h", label: "24h", ms: 24 * 60 * 60 * 1000 },
  { key: "week", label: "Week", ms: 7 * 24 * 60 * 60 * 1000 },
  { key: "all", label: "All time", ms: null },
];

type SortMode = "latest" | "popular";
const SORTS: { key: SortMode; label: string }[] = [
  { key: "latest", label: "Latest" },
  { key: "popular", label: "Top" },
];

function tsOrZero(iso: string): number {
  const t = Date.parse(iso);
  return isNaN(t) ? 0 : t;
}
function postAge(item: NewsItemData): number {
  return tsOrZero(item.posted_at) || tsOrZero(item.pulled_at);
}

export default function NewsPage() {
  const [items, setItems] = useState<NewsItemData[]>([]);
  const [cat, setCat] = useState<string>("all");
  const [windowMode, setWindowMode] = useState<WindowMode>("week");
  const [sort, setSort] = useState<SortMode>("latest");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);
  const [lastSeen, setLastSeen] = useState<number>(0);
  const [showCount, setShowCount] = useState(12);
  const [view, setView] = useState<"feed" | "glance">("feed");

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
      localStorage.setItem("news.lastSeen", String(Date.now()));
    });
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    setRefreshMsg("Pulling the latest… 30-60s");
    try {
      const res = await fetch("/api/intel/refresh", { method: "POST" });
      const data = await res.json();
      const added = (data.ingested ?? 0) as number;
      const skipped = (data.skipped ?? 0) as number;
      if (data.ok || data.fetched > 0) {
        setRefreshMsg(
          added > 0 ? `+${added} new (${skipped} already here)` : `Nothing new (${skipped} already here)`
        );
      } else {
        setRefreshMsg(`Error: ${(data.errors || ["unknown"]).slice(0, 1).join("; ")}`);
      }
      setLastSeen(Date.now() - 1);
      await load();
      setTimeout(() => localStorage.setItem("news.lastSeen", String(Date.now())), 500);
    } catch (e) {
      setRefreshMsg(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRefreshing(false);
      setTimeout(() => setRefreshMsg(null), 8000);
    }
  };

  // At-a-glance: top 5 of the last 24h by score, then recency. Falls back to
  // top-by-score all-time if nothing landed in 24h. Pure sorting — no AI cost.
  const topToday = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const recent = items.filter((i) => postAge(i) >= cutoff);
    const pool = recent.length > 0 ? recent : items;
    return [...pool]
      .sort((a, b) => (b.score || 0) - (a.score || 0) || postAge(b) - postAge(a))
      .slice(0, 5)
      .map((i) => ({ item: i, fresh: recent.length > 0 }));
  }, [items]);

  const visible = useMemo(() => {
    const cutoffMs = WINDOWS.find((w) => w.key === windowMode)?.ms ?? null;
    const cutoffTs = cutoffMs ? Date.now() - cutoffMs : 0;

    let list =
      cat === "all" ? items : cat === "saved" ? items.filter((i) => i.starred) : items.filter((i) => i.type === cat);

    if (cutoffTs) list = list.filter((i) => postAge(i) >= cutoffTs);

    list = [...list];
    if (sort === "popular") {
      list.sort((a, b) => (b.score || 0) - (a.score || 0) || postAge(b) - postAge(a));
    } else {
      list.sort((a, b) => postAge(b) - postAge(a));
    }
    return list;
  }, [items, cat, windowMode, sort]);

  useEffect(() => setShowCount(12), [cat, windowMode, sort]);

  const isEmpty = !loading && visible.length === 0;

  return (
    <div className="min-h-dvh bg-[#f6f6f7] text-gray-900">
      <div className="mx-auto max-w-2xl px-4 pb-28 pt-6">
        {/* Header */}
        <header className="mb-4 flex items-end justify-between">
          <div>
            <h1 className="text-[26px] font-bold tracking-tight text-gray-900">Newsfeed</h1>
            <p className="text-[13px] text-gray-500">Your cold email intel, at a glance.</p>
          </div>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[13px] font-medium text-[#b1130f] shadow-sm ring-1 ring-gray-200 transition hover:ring-gray-300 disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing" : "Refresh"}
          </button>
        </header>

        {refreshMsg && (
          <div className="mb-3 rounded-xl bg-[#b1130f]/8 px-3 py-2 text-[12px] font-medium text-[#b1130f]">
            {refreshMsg}
          </div>
        )}

        {/* View toggle: Feed vs At-a-Glance daily report */}
        <div className="mb-4 inline-flex rounded-full bg-gray-200/70 p-1">
          {([
            { key: "feed", label: "📰 Feed" },
            { key: "glance", label: "⚡ At a Glance" },
          ] as const).map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition ${
                view === v.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        {view === "glance" && <DailyReport />}

        {view === "feed" && (
          <>
        {/* At-a-glance */}
        {!loading && topToday.length > 0 && (
          <section className="mb-5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200/80">
            <div className="mb-2.5 flex items-center gap-2">
              <Zap size={16} className="text-[#b1130f]" fill="#b1130f" />
              <h2 className="text-[14px] font-bold text-gray-900">Today&apos;s Top Updates</h2>
              <span className="text-[11px] text-gray-400">
                {topToday[0].fresh ? "last 24h" : "latest"}
              </span>
            </div>
            <ol className="space-y-1">
              {topToday.map(({ item }, i) => {
                const { color, label } = catFor(item.type);
                return (
                  <li key={`${item.url}-${i}`}>
                    <button
                      onClick={() => window.open(item.url, "_blank", "noopener,noreferrer")}
                      className="group flex w-full items-start gap-2.5 rounded-lg px-2 py-1.5 text-left transition hover:bg-gray-50"
                    >
                      <span className="mt-0.5 text-[12px] font-bold text-gray-300">{i + 1}</span>
                      <span className="flex-1 text-[13.5px] font-medium leading-snug text-gray-800 group-hover:text-[#b1130f]">
                        {item.title}
                      </span>
                      <span
                        className="mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
                        style={{ background: `${color}14`, color }}
                      >
                        {label}
                      </span>
                      <ArrowUpRight size={14} className="mt-0.5 shrink-0 text-gray-300 group-hover:text-[#b1130f]" />
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {/* Category tabs */}
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORIES.map((c) => {
            const active = cat === c.key;
            return (
              <button
                key={c.key}
                onClick={() => setCat(c.key)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${
                  active
                    ? "bg-gray-900 text-white shadow-sm"
                    : "bg-white text-gray-600 ring-1 ring-gray-200 hover:ring-gray-300"
                }`}
              >
                <span className="mr-1">{c.emoji}</span>
                {c.label}
              </button>
            );
          })}
        </div>

        {/* Window + sort */}
        <div className="mb-4 flex items-center gap-3 text-[12px]">
          <div className="flex gap-1">
            {WINDOWS.map((w) => (
              <button
                key={w.key}
                onClick={() => setWindowMode(w.key)}
                className={`rounded-md px-2 py-1 font-medium transition ${
                  windowMode === w.key ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
          <span className="text-gray-300">·</span>
          <div className="flex gap-1">
            {SORTS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSort(s.key)}
                className={`rounded-md px-2 py-1 font-medium transition ${
                  sort === s.key ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Feed */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-gray-200/60" />
            ))}
          </div>
        ) : isEmpty ? (
          <div className="rounded-2xl bg-white px-4 py-12 text-center ring-1 ring-gray-200/80">
            <p className="text-[14px] text-gray-500">
              {items.length === 0
                ? "No intel yet. Tap Refresh to pull the latest."
                : `Nothing in ${cat === "all" ? "this view" : CATEGORIES.find((c) => c.key === cat)?.label} for the ${WINDOWS.find((w) => w.key === windowMode)?.label}.`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.slice(0, showCount).map((item, i) => {
              const isNew = lastSeen > 0 && tsOrZero(item.pulled_at) > lastSeen;
              return <NewsItem key={`${item.url}-${i}`} item={item} isNew={isNew} />;
            })}
            {visible.length > showCount && (
              <button
                onClick={() => setShowCount((c) => c + 12)}
                className="w-full rounded-xl bg-white py-3 text-[13px] font-medium text-gray-600 ring-1 ring-gray-200 transition hover:ring-gray-300"
              >
                Show more ({visible.length - showCount} left)
              </button>
            )}
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}
