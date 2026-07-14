// Shared client-side data layer + pure helpers for the Analytics dashboard.
// Everything here runs in the browser (the /analytics page is a client
// component) and reads the same Google Sheet the rest of the app does, via the
// /api/sheets proxy. Two real sources:
//   • "Account Posts" (A:M) — our own posts scraped daily (reactions / comments
//     / reposts / post_type / dates). Views/impressions are deliberately absent
//     — LinkedIn only shows those to the post owner; no scraper can pull them.
//   • "Intel" (A:P) — creator feed rows; the comment_* columns carry our own
//     outbound-comment activity, which feeds the commenting heatmap.

import { format, subDays, startOfWeek, parseISO, differenceInCalendarDays } from "date-fns";

export interface AccountPost {
  creator: string;
  posted_at: string;          // ISO 8601
  posted_at_display: string;
  post_type: string;          // "regular" | "repost" | "quote" ...
  text: string;
  reactions: number;
  comments: number;
  reposts: number;
  worked: string;             // winner | neutral | flop
  url: string;
  last_scraped: string;
}

export type Metric = "reactions" | "comments" | "reposts";
export type Persona = "Taha" | "Sophiya" | "All";

export const METRIC_LABEL: Record<Metric, string> = {
  reactions: "Reactions",
  comments: "Comments",
  reposts: "Reposts",
};

// Score rule shared with the rest of the app (Posts tab / CLAUDE.md):
//   score = reactions + comments×3  (a comment is worth 3× a like)
export const score = (p: AccountPost) => p.reactions + p.comments * 3;

// ── Fetch ────────────────────────────────────────────────────────────────

export async function fetchAccountPosts(): Promise<AccountPost[]> {
  const res = await fetch("/api/sheets?tab=Account%20Posts&range=A:M");
  if (!res.ok) return [];
  const { rows } = await res.json();
  return (rows as string[][])
    .slice(1)
    .filter((r) => r[0]?.trim())
    .map((r) => ({
      creator: r[0],
      posted_at: r[2] || "",
      posted_at_display: r[3] || "",
      post_type: r[4] || "post",
      text: r[5] || "",
      reactions: parseInt(r[6]) || 0,
      comments: parseInt(r[7]) || 0,
      reposts: parseInt(r[8]) || 0,
      worked: (r[9] || "").toLowerCase(),
      url: r[10] || "",
      last_scraped: r[12] || "",
    }));
}

// Our own outbound comments (one per posted Intel row) → dates for the heatmap.
export async function fetchCommentDates(): Promise<string[]> {
  const res = await fetch("/api/sheets?tab=Intel&range=A:P");
  if (!res.ok) return [];
  const { rows } = await res.json();
  // Header order (CLAUDE.md): pulled_at | posted_at | type | source | title |
  // url | summary | score | starred | comment_text | comment_status |
  // comment_posted_at | comment_style | image_url | ...  → J=9, K=10, L=11.
  return (rows as string[][])
    .slice(1)
    .filter((r) => (r[10] || "").toLowerCase() === "posted" && r[11])
    .map((r) => r[11]);
}

// ── Pure transforms ──────────────────────────────────────────────────────

// Keep only real original posts for a persona (reposts/quotes excluded — same
// rule the existing analytics page uses), sorted oldest→newest.
export function originalPosts(posts: AccountPost[], who: Persona): AccountPost[] {
  return posts
    .filter((p) => who === "All" || p.creator === who)
    .filter((p) => p.post_type === "regular")
    .sort((a, b) => (a.posted_at || "").localeCompare(b.posted_at || ""));
}

function safeDate(iso: string): Date | null {
  if (!iso) return null;
  try {
    const d = iso.length <= 10 ? parseISO(iso) : new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

export interface Totals {
  n: number;
  reactions: number;
  comments: number;
  reposts: number;
  avgEng: number;
  winRate: number;
}

export function totals(posts: AccountPost[]): Totals {
  const n = posts.length;
  const reactions = posts.reduce((a, p) => a + p.reactions, 0);
  const comments = posts.reduce((a, p) => a + p.comments, 0);
  const reposts = posts.reduce((a, p) => a + p.reposts, 0);
  const winners = posts.filter((p) => p.worked === "winner").length;
  return {
    n,
    reactions,
    comments,
    reposts,
    avgEng: n ? Math.round((reactions + comments) / n) : 0,
    winRate: n ? Math.round((winners / n) * 100) : 0,
  };
}

// Sum a metric over posts within the last `days`, and the % change vs the
// equally-long window before it → drives the trend badges on the KPI cards.
export function metricTrend(
  posts: AccountPost[],
  metric: Metric,
  days = 30
): { value: number; deltaPct: number | null } {
  const now = new Date();
  const cutoff = subDays(now, days);
  const prevCutoff = subDays(now, days * 2);
  let cur = 0;
  let prev = 0;
  for (const p of posts) {
    const d = safeDate(p.posted_at);
    if (!d) continue;
    if (d >= cutoff) cur += p[metric];
    else if (d >= prevCutoff) prev += p[metric];
  }
  const deltaPct = prev === 0 ? (cur === 0 ? 0 : null) : Math.round(((cur - prev) / prev) * 100);
  return { value: cur, deltaPct };
}

// A small per-post series (chronological) for the KPI card sparklines.
export function sparkline(posts: AccountPost[], metric: Metric, take = 16): number[] {
  const vals = posts.map((p) => p[metric]);
  return vals.slice(-take);
}

// ── Time-series bucketing for the big performance chart ───────────────────

export type Range = "Day" | "Week" | "Month";

export interface SeriesPoint {
  label: string;
  reactions: number;
  comments: number;
  reposts: number;
}

export function timeSeries(posts: AccountPost[], range: Range): SeriesPoint[] {
  const buckets = new Map<string, SeriesPoint & { sort: string }>();
  const keyFmt = range === "Day" ? "MMM d" : range === "Week" ? "MMM d" : "MMM yyyy";
  for (const p of posts) {
    const d = safeDate(p.posted_at);
    if (!d) continue;
    const anchor = range === "Week" ? startOfWeek(d, { weekStartsOn: 1 }) : d;
    const sort = format(anchor, range === "Month" ? "yyyy-MM" : "yyyy-MM-dd");
    const label = format(anchor, keyFmt);
    const cur = buckets.get(sort) || { label, sort, reactions: 0, comments: 0, reposts: 0 };
    cur.reactions += p.reactions;
    cur.comments += p.comments;
    cur.reposts += p.reposts;
    buckets.set(sort, cur);
  }
  return [...buckets.values()]
    .sort((a, b) => a.sort.localeCompare(b.sort))
    .map(({ label, reactions, comments, reposts }) => ({ label, reactions, comments, reposts }));
}

// ── Content streak (GitHub-style weekly grid) ─────────────────────────────
// Returns `weeks` columns × 7 rows (Sun→Sat). Each cell = # posts that day.

export interface StreakCell {
  date: string;
  count: number;
  inFuture: boolean;
}

export function streakGrid(posts: AccountPost[], weeks = 26): StreakCell[][] {
  const perDay = new Map<string, number>();
  for (const p of posts) {
    const d = safeDate(p.posted_at);
    if (!d) continue;
    const k = format(d, "yyyy-MM-dd");
    perDay.set(k, (perDay.get(k) || 0) + 1);
  }
  const today = new Date();
  // Grid ends on the current week; first column starts (weeks-1) weeks back,
  // aligned to Sunday.
  const gridStart = startOfWeek(subDays(today, (weeks - 1) * 7), { weekStartsOn: 0 });
  const cols: StreakCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: StreakCell[] = [];
    for (let d = 0; d < 7; d++) {
      const day = subDays(today, 0); // placeholder, overwritten below
      const cur = new Date(gridStart);
      cur.setDate(gridStart.getDate() + w * 7 + d);
      const k = format(cur, "yyyy-MM-dd");
      col.push({
        date: k,
        count: perDay.get(k) || 0,
        inFuture: differenceInCalendarDays(cur, today) > 0,
      });
      void day;
    }
    cols.push(col);
  }
  return cols;
}

// ── Commenting heatmap (12 months, Mon/Wed/Fri-labelled 7-row grid) ───────

export interface HeatCell {
  date: string;
  count: number;
  inFuture: boolean;
}

export function commentHeatmap(dates: string[], weeks = 53): HeatCell[][] {
  const perDay = new Map<string, number>();
  for (const iso of dates) {
    const d = safeDate(iso);
    if (!d) continue;
    const k = format(d, "yyyy-MM-dd");
    perDay.set(k, (perDay.get(k) || 0) + 1);
  }
  const today = new Date();
  const gridStart = startOfWeek(subDays(today, (weeks - 1) * 7), { weekStartsOn: 1 });
  const cols: HeatCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: HeatCell[] = [];
    for (let d = 0; d < 7; d++) {
      const cur = new Date(gridStart);
      cur.setDate(gridStart.getDate() + w * 7 + d);
      const k = format(cur, "yyyy-MM-dd");
      col.push({ date: k, count: perDay.get(k) || 0, inFuture: differenceInCalendarDays(cur, today) > 0 });
    }
    cols.push(col);
  }
  return cols;
}

// Map a raw count to a 0–4 intensity level given the busiest day in the grid.
export function heatLevel(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (max <= 1) return 4;
  const r = count / max;
  if (r > 0.66) return 4;
  if (r > 0.4) return 3;
  if (r > 0.15) return 2;
  return 1;
}

// ── Best day of week ──────────────────────────────────────────────────────

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function byWeekday(
  posts: AccountPost[],
  metric: Metric
): { day: string; avg: number; count: number }[] {
  const sums = Array(7).fill(0);
  const counts = Array(7).fill(0);
  for (const p of posts) {
    const d = safeDate(p.posted_at);
    if (!d) continue;
    const i = d.getDay();
    sums[i] += p[metric];
    counts[i] += 1;
  }
  // Render Mon→Sun (LinkedIn-week ordering, like the reference).
  const order = [1, 2, 3, 4, 5, 6, 0];
  return order.map((i) => ({
    day: DOW[i],
    avg: counts[i] ? Math.round(sums[i] / counts[i]) : 0,
    count: counts[i],
  }));
}

// ── Post types (donut) ────────────────────────────────────────────────────

export function byPostType(
  posts: AccountPost[],
  metric: Metric = "reactions"
): { type: string; count: number; avg: number; pct: number }[] {
  const map = new Map<string, { count: number; sum: number }>();
  for (const p of posts) {
    const t = (p.post_type || "post").toLowerCase();
    const cur = map.get(t) || { count: 0, sum: 0 };
    cur.count += 1;
    cur.sum += p[metric];
    map.set(t, cur);
  }
  const total = posts.length || 1;
  return [...map.entries()]
    .map(([type, { count, sum }]) => ({
      type,
      count,
      avg: count ? Math.round(sum / count) : 0,
      pct: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

export function prettyType(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}
