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

export type IntelType = "linkedin" | "reddit" | "news";
export type CommentStatus =
  | ""
  | "draft"
  | "quality_failed"
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
  rowIndex?: number;     // 1-based, only set when read from sheet
}

const INTEL_TAB = "Intel";

export async function loadIntel(opts: { sinceDays?: number } = {}): Promise<IntelRow[]> {
  const rows = await readSheet(INTEL_TAB, "A:M");
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
  if (items.length === 0) return { ingested: 0, skipped: 0 };

  // Dedupe against existing URLs
  const existing = await loadIntel();
  const existingUrls = new Set(existing.map((r) => r.url));

  const fresh = items.filter((it) => it.url && !existingUrls.has(it.url));
  if (fresh.length === 0) return { ingested: 0, skipped: items.length };

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
  ]);
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${INTEL_TAB}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });
  return { ingested: fresh.length, skipped: items.length - fresh.length };
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
  const existing = await readSheet(LEAD_MAGNETS_TAB, "A:C");
  const usedSlugs = new Set(existing.slice(1).map((r) => r[2]).filter(Boolean));
  let slug = kebab(input.title) || "lead-magnet";
  if (usedSlugs.has(slug)) slug = `${slug}-${nanoid(4).toLowerCase()}`;

  const id = nanoid(10);
  const createdAt = new Date().toISOString();
  const baseRowIndex = existing.length + 1;

  const row = [
    id,
    input.post_id,
    slug,
    input.status || "researching",
    input.title,
    "",  // hero_text
    "",  // value_props
    "",  // cta_text
    "",  // outline_md
    "",  // body_md
    "",  // notion_url
    "",  // landing_url
    "",  // gif_url
    createdAt,
    0,   // clicks
    0,   // conversions
  ];

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

function parseLeadMagnetRow(r: string[], rowIndex: number): LeadMagnetRow {
  return {
    id: r[0] || "",
    post_id: r[1] || "",
    slug: r[2] || "",
    status: (r[3] || "researching") as LeadMagnetRow["status"],
    title: r[4] || "",
    hero_text: r[5] || "",
    value_props: r[6] || "",
    cta_text: r[7] || "",
    outline_md: r[8] || "",
    body_md: r[9] || "",
    notion_url: r[10] || "",
    landing_url: r[11] || "",
    gif_url: r[12] || "",
    created_at: r[13] || "",
    clicks: Number(r[14]) || 0,
    conversions: Number(r[15]) || 0,
    rowIndex,
  };
}

export async function loadLeadMagnets(): Promise<LeadMagnetRow[]> {
  try {
    const rows = await readSheet(LEAD_MAGNETS_TAB, "A:P");
    if (rows.length <= 1) return [];
    const out: LeadMagnetRow[] = [];
    for (let i = 1; i < rows.length; i++) {
      if (!rows[i][0]) continue;
      out.push(parseLeadMagnetRow(rows[i], i + 1));
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

const LEAD_MAGNET_COLUMNS: Array<keyof LeadMagnetRow> = [
  "id",
  "post_id",
  "slug",
  "status",
  "title",
  "hero_text",
  "value_props",
  "cta_text",
  "outline_md",
  "body_md",
  "notion_url",
  "landing_url",
  "gif_url",
  "created_at",
  "clicks",
  "conversions",
];

export async function updateLeadMagnetRow(
  id: string,
  patch: Partial<Omit<LeadMagnetRow, "id" | "rowIndex">>
): Promise<void> {
  const row = await loadLeadMagnetById(id);
  if (!row) throw new Error(`LeadMagnet row not found for id=${id}`);

  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const data: { range: string; values: (string | number)[][] }[] = [];
  for (const [key, value] of Object.entries(patch)) {
    const colIndex = LEAD_MAGNET_COLUMNS.indexOf(key as keyof LeadMagnetRow);
    if (colIndex < 0) continue;
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
