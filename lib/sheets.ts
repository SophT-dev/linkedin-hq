import { google } from "googleapis";
import { nanoid } from "nanoid";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const SHEET_ID = process.env.GOOGLE_SHEETS_ID!;

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: SCOPES,
  });
}

export async function readSheet(tab: string, range = "A:Z") {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${tab}!${range}`,
  });
  return res.data.values || [];
}

export async function appendRow(tab: string, values: (string | number | boolean | null)[]) {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${tab}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [values] },
  });
}

export async function updateRow(tab: string, rowIndex: number, values: (string | number | boolean | null)[]) {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const range = `${tab}!A${rowIndex}:Z${rowIndex}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [values] },
  });
}

export async function deleteRow(tab: string, rowIndex: number) {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  // Get the sheet ID for the tab
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const sheet = meta.data.sheets?.find(
    (s) => s.properties?.title === tab
  );
  if (!sheet?.properties?.sheetId) throw new Error(`Sheet tab "${tab}" not found`);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sheet.properties.sheetId,
            dimension: "ROWS",
            startIndex: rowIndex - 1,
            endIndex: rowIndex,
          },
        },
      }],
    },
  });
}

// Config helper — reads Config tab for key-value pairs
export async function getConfig(): Promise<Record<string, string>> {
  const rows = await readSheet("Config", "A:B");
  const config: Record<string, string> = {};
  for (const row of rows.slice(1)) { // skip header
    if (row[0]) config[row[0]] = row[1] || "";
  }
  return config;
}

// ============================================================
// DailyReports tab — the Daily TLDR archive. Revamped 2026-07-08 (Sophiya:
// the old one-blob-per-day shape was "messy and unstructured") from
// `date | generated_at | report_md` to one row per digest item, matching
// every other tab built this cycle (Template Library, Post Ideas, Visual
// Swipe are all one-row-per-item — a markdown wall was the outlier).
// Schema: date | category | headline | summary | source_type | source_name | url
// ============================================================
const REPORTS_TAB = "DailyReports";

async function ensureTab(title: string) {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const exists = meta.data.sheets?.some((s) => s.properties?.title === title);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title } } }] },
    });
  }
}

export interface DailyReportItem {
  date: string; // YYYY-MM-DD
  category: string; // e.g. "LinkedIn", "Reddit", "Newsletter", "Tool Update"
  headline: string;
  summary: string;
  source_type: string; // "linkedin" | "reddit" | "newsletter" | "news"
  source_name: string; // person/subreddit/publication
  url: string;
}

export async function listReportDates(): Promise<string[]> {
  try {
    const rows = await readSheet(REPORTS_TAB, "A:A");
    const dates = new Set(
      rows.map((r) => r[0]).filter((d) => d && /^\d{4}-\d{2}-\d{2}$/.test(d))
    );
    return [...dates].sort().reverse();
  } catch {
    return [];
  }
}

export async function getDailyReportItems(date: string): Promise<DailyReportItem[]> {
  try {
    const rows = await readSheet(REPORTS_TAB, "A:G");
    return rows
      .filter((r) => r[0] === date)
      .map((r) => ({
        date: r[0],
        category: r[1] || "",
        headline: r[2] || "",
        summary: r[3] || "",
        source_type: r[4] || "",
        source_name: r[5] || "",
        url: r[6] || "",
      }));
  } catch {
    return [];
  }
}

// Replaces any existing rows for this date (idempotent re-run) then appends
// the fresh set — a digest re-run for the same day shouldn't duplicate rows.
export async function saveDailyReportItems(date: string, items: Omit<DailyReportItem, "date">[]) {
  await ensureTab(REPORTS_TAB);
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const existingRes = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${REPORTS_TAB}!A:A` });
  const existingRows = existingRes.data.values || [];
  const rowIndicesToClear = existingRows
    .map((r, i) => (r[0] === date ? i + 1 : -1)) // 1-based sheet row
    .filter((i) => i > 0);
  if (rowIndicesToClear.length) {
    // Clear in place (leaves blank rows rather than shifting everything —
    // simplest safe idempotent approach for a Sheets API without a delete-by-filter).
    await sheets.spreadsheets.values.batchClear({
      spreadsheetId: SHEET_ID,
      requestBody: { ranges: rowIndicesToClear.map((i) => `${REPORTS_TAB}!A${i}:G${i}`) },
    });
  }

  const values = items.map((it) => [date, it.category, it.headline, it.summary, it.source_type, it.source_name, it.url]);
  if (values.length) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${REPORTS_TAB}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });
  }
  return { date, count: values.length };
}

// ============================================================
// Intel tab — unified news feed (extended with comment fields)
// Schema: pulled_at | posted_at | type | source | title | url | summary |
//         score | starred | comment_text | comment_status |
//         comment_posted_at | comment_style
// (columns A..M)
//
// The 4 comment_* columns are added by setup-v2.gs's ensureColumns helper.
// Old rows from before the extension just have empty cells in M..P, which
// loadIntel reads as empty strings — so the auto-comment loop treats them
// as "not yet commented" and is free to comment on them.
// ============================================================

export type IntelType = "linkedin" | "reddit" | "news" | "tools" | "youtube";
export type CommentStatus =
  | ""
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "quality_failed"
  | "skipped"
  | "posted"
  | "post_failed"
  | "deleted";

export interface IntelRow {
  pulled_at: string;     // ISO — when WE fetched it
  posted_at: string;     // ISO — when the post was originally created (may be empty)
  type: IntelType;
  source: string;
  title: string;
  url: string;
  summary: string;
  score: number;         // reactions+comments*2 for linkedin, upvotes for reddit
  starred: boolean;
  comment_text: string;       // empty if not yet generated
  comment_status: CommentStatus;
  comment_posted_at: string;  // ISO timestamp when LinkedIn accepted it
  comment_style: string;      // which preset was picked
  image_url?: string;    // post's image/GIF, if the scraper returned one (Stage 15, col N)
  rowIndex?: number;     // 1-based, only set when read from sheet
}

const INTEL_TAB = "Intel";

export async function loadIntel(opts: { sinceDays?: number } = {}): Promise<IntelRow[]> {
  const rows = await readSheet(INTEL_TAB, "A:N");
  if (rows.length <= 1) return [];

  const cutoff = opts.sinceDays
    ? Date.now() - opts.sinceDays * 24 * 60 * 60 * 1000
    : 0;

  const out: IntelRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[5]) continue; // require URL (col F)
    const pulledAt = r[0] || "";
    if (cutoff && pulledAt) {
      const ts = Date.parse(pulledAt);
      if (!isNaN(ts) && ts < cutoff) continue;
    }
    const scoreNum = Number(r[7]);
    out.push({
      pulled_at: pulledAt,
      posted_at: r[1] || "",
      type: (r[2] || "news") as IntelType,
      source: r[3] || "",
      title: r[4] || "",
      url: r[5] || "",
      summary: r[6] || "",
      score: isNaN(scoreNum) ? 0 : scoreNum,
      starred: String(r[8]).toUpperCase() === "TRUE",
      comment_text: r[9] || "",
      comment_status: (r[10] || "") as CommentStatus,
      comment_posted_at: r[11] || "",
      comment_style: r[12] || "",
      image_url: r[13] || "",
      rowIndex: i + 1,
    });
  }
  return out;
}

// Returns LinkedIn intel rows that haven't had a comment generated yet,
// sorted by engagement score descending. Used by /api/comments/plan to
// pick the best candidates each run.
export async function loadLinkedInPostsNeedingComment(): Promise<IntelRow[]> {
  const all = await loadIntel();
  return all
    .filter((r) => r.type === "linkedin" && !r.comment_status)
    .sort((a, b) => b.score - a.score);
}

// Counts LinkedIn intel rows where the comment was actually posted today
// (used for the daily cap). "Today" is Asia/Karachi local day (Taha's
// timezone), so the cap resets at PKT midnight instead of UTC midnight
// (which would be 5 AM PKT).
//
// comment_posted_at is written by /api/comments/log in the format
// "YYYY-MM-DD HH:mm:ss PKT" (already in Karachi local time), so we just
// compare the first 10 chars against today's Karachi date. For backwards
// compat with any legacy rows written in UTC ISO format (before the PKT
// switch), we also convert those to Karachi day as a fallback.
export async function countCommentsPostedToday(): Promise<number> {
  const all = await loadIntel();
  const today = karachiDay(new Date());
  return all.filter((r) => {
    if (r.comment_status !== "posted" || !r.comment_posted_at) return false;
    const raw = r.comment_posted_at.trim();
    // New PKT format: "YYYY-MM-DD HH:mm:ss PKT" — prefix is already the
    // Karachi day, compare directly.
    if (raw.endsWith("PKT")) return raw.slice(0, 10) === today;
    // Legacy ISO UTC format — convert to Karachi day.
    return karachiDay(new Date(raw)) === today;
  }).length;
}

// Counts how many comments each LinkedIn creator has received in the last
// N days, so /api/comments/plan can enforce a per-profile weekly cap and
// avoid looking like a bot to any single person. Walks a pre-loaded Intel
// array (the plan route already has it in memory) instead of re-fetching.
// Matches on `source` column — creator_name string, not a URL. Small
// collision risk if two creators share a name; accepted for simplicity.
// Day comparison uses the same PKT-prefix trick as countCommentsPostedToday
// with an ISO fallback for legacy rows.
export function countAuthorCommentsLastNDays(
  rows: IntelRow[],
  days: number
): Map<string, number> {
  const now = new Date();
  const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const cutoffDay = karachiDay(cutoffDate);
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (r.type !== "linkedin") continue;
    if (r.comment_status !== "posted" || !r.comment_posted_at) continue;
    if (!r.source) continue;
    const raw = r.comment_posted_at.trim();
    const day = raw.endsWith("PKT")
      ? raw.slice(0, 10)
      : karachiDay(new Date(raw));
    if (!day || day < cutoffDay) continue;
    counts.set(r.source, (counts.get(r.source) || 0) + 1);
  }
  return counts;
}

// Returns YYYY-MM-DD for a Date as observed in Asia/Karachi (UTC+5, no DST).
function karachiDay(d: Date): string {
  if (isNaN(d.getTime())) return "";
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(d);
}

// Returns an ISO 8601 string in Asia/Karachi local time with a +05:00
// offset, e.g. "2026-04-15T00:40:31+05:00". Used for pulled_at / posted_at
// columns so the date visible in the sheet matches Taha's wall-clock.
// Still parseable by Date.parse() (standard ISO), still sorts
// lexicographically, still the same instant in time as the UTC version.
export function karachiIso(d: Date): string {
  if (isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
  // Intl sometimes returns "24" for midnight in hour12:false mode; normalize.
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get(
    "day"
  )}T${hour}:${get("minute")}:${get("second")}+05:00`;
}

// Human-readable version of a karachiIso string, e.g. "7:26 pm, 8 April 2026"
// — Sophiya couldn't read the raw ISO timestamps easily (2026-07-08). The
// machine columns (pulled_at/posted_at) stay ISO since scripts sort/filter
// on them; this is a display-only companion column (Intel!O:P).
function humanizeKarachi(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const time = d
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Karachi" })
    .toLowerCase();
  const date = d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Karachi" });
  return `${time}, ${date}`;
}

// Updates the comment_* columns on the Intel row matching this URL.
// Used by both /api/comments/plan (to write the draft) and
// /api/comments/log (to record the posted/failed status).
export async function attachCommentToIntelRow(
  url: string,
  patch: {
    comment_text?: string;
    comment_status?: CommentStatus;
    comment_posted_at?: string;
    comment_style?: string;
  }
): Promise<{ rowIndex: number } | null> {
  const all = await loadIntel();
  const row = all.find((r) => r.url === url);
  if (!row || !row.rowIndex) return null;

  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  // Comment columns are J..M (10..13, 0-indexed 9..12).
  const data: { range: string; values: (string | number)[][] }[] = [];
  const colMap: Record<string, string> = {
    comment_text: "J",
    comment_status: "K",
    comment_posted_at: "L",
    comment_style: "M",
  };

  for (const [key, value] of Object.entries(patch)) {
    const col = colMap[key];
    if (!col) continue;
    if (value === undefined) continue;
    data.push({
      range: `${INTEL_TAB}!${col}${row.rowIndex}`,
      values: [[value as string]],
    });
  }

  if (data.length === 0) return { rowIndex: row.rowIndex };

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { valueInputOption: "USER_ENTERED", data },
  });

  return { rowIndex: row.rowIndex };
}

export async function appendIntel(
  items: Omit<
    IntelRow,
    | "starred"
    | "rowIndex"
    | "comment_text"
    | "comment_status"
    | "comment_posted_at"
    | "comment_style"
  >[]
) {
  if (items.length === 0) return { ingested: 0, skipped: 0, new_urls: [] as string[] };

  // Dedupe against existing URLs
  const existing = await loadIntel();
  const existingUrls = new Set(existing.map((r) => r.url));

  const fresh = items.filter((it) => it.url && !existingUrls.has(it.url));
  if (fresh.length === 0) return { ingested: 0, skipped: items.length, new_urls: [] as string[] };

  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const values = fresh.map((it) => [
    it.pulled_at,
    it.posted_at || "",
    it.type,
    it.source,
    it.title,
    it.url,
    it.summary,
    it.score || 0,
    "FALSE",
    "", // comment_text
    "", // comment_status
    "", // comment_posted_at
    "", // comment_style
    it.image_url || "", // Stage 15 — post's image/GIF, if the scraper returned one
    humanizeKarachi(it.pulled_at), // pulled_at_display — Sophiya asked for readable dates, 2026-07-08
    humanizeKarachi(it.posted_at || ""), // posted_at_display
  ]);
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${INTEL_TAB}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });
  return {
    ingested: fresh.length,
    skipped: items.length - fresh.length,
    new_urls: fresh.map((f) => f.url),
  };
}

export async function toggleIntelStar(rowIndex: number, starred: boolean) {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  // starred is column I in the new schema
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${INTEL_TAB}!I${rowIndex}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[starred ? "TRUE" : "FALSE"]] },
  });
}

// ============================================================
// WinsLog tab — the user's real client wins (authenticity moat)
// Schema: date | client | campaign | what_we_did | result | lesson | tags
// ============================================================

export interface WinRow {
  date: string;
  client: string;
  campaign: string;
  what_we_did: string;
  result: string;
  lesson: string;
  tags: string;
}

const WINS_TAB = "WinsLog";

export async function loadWinsLog(): Promise<WinRow[]> {
  try {
    const rows = await readSheet(WINS_TAB, "A:G");
    if (rows.length <= 1) return [];
    return rows.slice(1).map((r) => ({
      date: r[0] || "",
      client: r[1] || "",
      campaign: r[2] || "",
      what_we_did: r[3] || "",
      result: r[4] || "",
      lesson: r[5] || "",
      tags: r[6] || "",
    }));
  } catch {
    // Tab doesn't exist yet — fail soft so the batch can still run.
    return [];
  }
}

export async function loadStarredIntel(): Promise<IntelRow[]> {
  const all = await loadIntel();
  return all.filter((i) => i.starred);
}

// ============================================================
// Posts tab — generated batch output
// Schema (v2, after migrate-posts-add-id.gs):
//   id | batch_date | hook | body | format | funnel_stage | visual_brief |
//   lead_magnet | sources_used | authenticity_tag | status
// (columns A..K)
// ============================================================

export interface SavedPost {
  batch_date: string;
  hook: string;
  body: string;
  format: string;
  funnel_stage: string;
  visual_brief: string;
  lead_magnet: string;     // serialized "name | value_prop | cta" OR a URL after publish
  sources_used: string;    // joined with " ; "
  authenticity_tag: string;
  status: string;          // "draft" / "approved" / "posted"
}

export interface PostRow extends SavedPost {
  id: string;
  rowIndex: number;        // 1-based sheet row
}

const POSTS_TAB = "Posts";

export async function loadPosts(): Promise<PostRow[]> {
  const rows = await readSheet(POSTS_TAB, "A:K");
  if (rows.length <= 1) return [];
  const out: PostRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[0]) continue; // require id
    out.push({
      id: r[0],
      batch_date: r[1] || "",
      hook: r[2] || "",
      body: r[3] || "",
      format: r[4] || "",
      funnel_stage: r[5] || "",
      visual_brief: r[6] || "",
      lead_magnet: r[7] || "",
      sources_used: r[8] || "",
      authenticity_tag: r[9] || "",
      status: r[10] || "draft",
      rowIndex: i + 1,
    });
  }
  return out;
}

export async function loadPostById(id: string): Promise<PostRow | null> {
  const all = await loadPosts();
  return all.find((p) => p.id === id) || null;
}

export interface AppendedPost {
  id: string;
  rowIndex: number;
  hook: string;
}

export async function appendPosts(
  posts: SavedPost[]
): Promise<{ saved: number; items: AppendedPost[] }> {
  if (posts.length === 0) return { saved: 0, items: [] };
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  // Find the next row index so we can return stable indices for every
  // appended post. Append writes to the first empty row, so the base is
  // (current last row + 1).
  const existing = await readSheet(POSTS_TAB, "A:A");
  const baseRowIndex = existing.length + 1;

  const withIds = posts.map((p) => ({ ...p, id: nanoid(10) }));
  const values = withIds.map((p) => [
    p.id,
    p.batch_date,
    p.hook,
    p.body,
    p.format,
    p.funnel_stage,
    p.visual_brief,
    p.lead_magnet,
    p.sources_used,
    p.authenticity_tag,
    p.status,
  ]);
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${POSTS_TAB}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });
  const items: AppendedPost[] = withIds.map((p, i) => ({
    id: p.id,
    rowIndex: baseRowIndex + i,
    hook: p.hook,
  }));
  return { saved: posts.length, items };
}

export async function updatePostLeadMagnet(rowIndex: number, url: string) {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  // lead_magnet is column H in the v2 schema.
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${POSTS_TAB}!H${rowIndex}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[url]] },
  });
}

// ============================================================
// LeadMagnets tab — the full build pipeline row for each lead magnet
// Schema:
//   id | post_id | slug | status | title | hero_text | value_props |
//   cta_text | outline_md | body_md | notion_url | landing_url |
//   gif_url | created_at | clicks | conversions
// (columns A..P)
//
// status values: researching | outline_ready | body_ready | published | error
// value_props is stored as a JSON string of an array.
// ============================================================

export interface LeadMagnetRow {
  id: string;
  post_id: string;
  slug: string;
  status: "researching" | "outline_ready" | "body_ready" | "published" | "error";
  title: string;
  hero_text: string;
  value_props: string;       // JSON string of string[]
  cta_text: string;
  outline_md: string;
  body_md: string;
  notion_url: string;
  landing_url: string;
  gif_url: string;
  created_at: string;
  clicks: number;
  conversions: number;
  rowIndex: number;
}

const LEAD_MAGNETS_TAB = "LeadMagnets";

// Field -> spreadsheet column is resolved by HEADER NAME, not fixed position,
// so the columns can be reordered in the Sheet without breaking the app.
// (2026-07-11: moved source_person to the front + made this order-independent.)
async function readLeadMagnetSheet(): Promise<{ headers: string[]; rows: string[][]; idx: Record<string, number> }> {
  const all = await readSheet(LEAD_MAGNETS_TAB, "A:Z");
  const headers = (all[0] || []).map((h) => String(h || "").trim());
  const idx: Record<string, number> = {};
  headers.forEach((h, i) => { if (h && idx[h] === undefined) idx[h] = i; });
  return { headers, rows: all.slice(1), idx };
}

function kebab(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function createLeadMagnetRow(input: {
  post_id: string;
  title: string;
  status?: LeadMagnetRow["status"];
}): Promise<{ id: string; slug: string; rowIndex: number }> {
  const { headers, rows, idx } = await readLeadMagnetSheet();
  const slugCol = idx["slug"];
  const usedSlugs = new Set(rows.map((r) => r[slugCol]).filter(Boolean));
  let slug = kebab(input.title) || "lead-magnet";
  if (usedSlugs.has(slug)) slug = `${slug}-${nanoid(4).toLowerCase()}`;

  const id = nanoid(10);
  const createdAt = new Date().toISOString();
  const baseRowIndex = rows.length + 2; // +1 header, +1 for the new row

  const row: (string | number)[] = new Array(headers.length).fill("");
  const set = (k: string, v: string | number) => { const i = idx[k]; if (i !== undefined) row[i] = v; };
  set("id", id);
  set("post_id", input.post_id);
  set("slug", slug);
  set("status", input.status || "researching");
  set("title", input.title);
  set("created_at", createdAt);
  set("clicks", 0);
  set("conversions", 0);

  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${LEAD_MAGNETS_TAB}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });

  return { id, slug, rowIndex: baseRowIndex };
}

function parseLeadMagnetRow(r: string[], rowIndex: number, idx: Record<string, number>): LeadMagnetRow {
  const g = (k: string) => { const i = idx[k]; return i === undefined ? "" : (r[i] || ""); };
  return {
    id: g("id"),
    post_id: g("post_id"),
    slug: g("slug"),
    status: (g("status") || "researching") as LeadMagnetRow["status"],
    title: g("title"),
    hero_text: g("hero_text"),
    value_props: g("value_props"),
    cta_text: g("cta_text"),
    outline_md: g("outline_md"),
    body_md: g("body_md"),
    notion_url: g("notion_url"),
    landing_url: g("landing_url"),
    gif_url: g("gif_url"),
    created_at: g("created_at"),
    clicks: Number(g("clicks")) || 0,
    conversions: Number(g("conversions")) || 0,
    rowIndex,
  };
}

export async function loadLeadMagnets(): Promise<LeadMagnetRow[]> {
  try {
    const { headers, rows, idx } = await readLeadMagnetSheet();
    if (!headers.length) return [];
    const idCol = idx["id"];
    const out: LeadMagnetRow[] = [];
    for (let i = 0; i < rows.length; i++) {
      if (idCol === undefined || !rows[i][idCol]) continue; // key off id presence, same as before
      out.push(parseLeadMagnetRow(rows[i], i + 2, idx)); // header is row 1, data starts at row 2
    }
    return out;
  } catch {
    return [];
  }
}

export async function loadLeadMagnetById(id: string): Promise<LeadMagnetRow | null> {
  const all = await loadLeadMagnets();
  return all.find((r) => r.id === id) || null;
}

export async function loadLeadMagnetBySlug(slug: string): Promise<LeadMagnetRow | null> {
  const all = await loadLeadMagnets();
  return all.find((r) => r.slug === slug) || null;
}

// Column letter helper for partial row updates. 0 => A, 1 => B, ...
function colLetter(i: number): string {
  return String.fromCharCode("A".charCodeAt(0) + i);
}

export async function updateLeadMagnetRow(
  id: string,
  patch: Partial<Omit<LeadMagnetRow, "id" | "rowIndex">>
): Promise<void> {
  const row = await loadLeadMagnetById(id);
  if (!row) throw new Error(`LeadMagnet row not found for id=${id}`);
  const { idx } = await readLeadMagnetSheet();

  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const data: { range: string; values: (string | number)[][] }[] = [];
  for (const [key, value] of Object.entries(patch)) {
    const colIndex = idx[key];
    if (colIndex === undefined) continue;
    data.push({
      range: `${LEAD_MAGNETS_TAB}!${colLetter(colIndex)}${row.rowIndex}`,
      values: [[value as string | number]],
    });
  }

  if (data.length === 0) return;
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { valueInputOption: "USER_ENTERED", data },
  });
}

// ============================================================
// Comments tab — auto-generated comments on scraped LinkedIn posts
// Schema (16 cols):
//   id | post_id | post_url | post_urn | creator_name | comment_text |
//   style_preset | status | posted_at | linkedin_response_id | error |
//   reactions | replies | created_at | scraped_at | day
// (columns A..P)
//
// status values: draft | quality_failed | posted | post_failed | deleted
// day is YYYY-MM-DD for the daily cap counter.
// ============================================================

// (Comments tab CRUD removed — comment data now lives as 4 extra columns
// on each Intel row. See attachCommentToIntelRow / loadLinkedInPostsNeedingComment
// / countCommentsPostedToday at the top of this file.)
