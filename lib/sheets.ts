import { google } from "googleapis";

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
// Intel tab — unified news feed
// Schema: pulled_at | posted_at | type | source | title | url | summary | score | starred
// (columns A..I)
// ============================================================

export type IntelType = "linkedin" | "reddit" | "news";

export interface IntelRow {
  pulled_at: string;     // ISO — when WE fetched it
  posted_at: string;     // ISO — when the post was originally created (may be empty)
  type: IntelType;
  source: string;
  title: string;
  url: string;
  summary: string;
  score: number;         // upvotes for reddit, 0 for news
  starred: boolean;
  rowIndex?: number;     // 1-based, only set when read from sheet
}

const INTEL_TAB = "Intel";

export async function loadIntel(opts: { sinceDays?: number } = {}): Promise<IntelRow[]> {
  const rows = await readSheet(INTEL_TAB, "A:I");
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
      rowIndex: i + 1,
    });
  }
  return out;
}

export async function appendIntel(items: Omit<IntelRow, "starred" | "rowIndex">[]) {
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
// Schema: batch_date | hook | body | format | funnel_stage | visual_brief | lead_magnet | sources_used | authenticity_tag | status
// ============================================================

export interface SavedPost {
  batch_date: string;
  hook: string;
  body: string;
  format: string;
  funnel_stage: string;
  visual_brief: string;
  lead_magnet: string;     // serialized "name | value_prop | cta"
  sources_used: string;    // joined with " ; "
  authenticity_tag: string;
  status: string;          // "draft" / "approved" / "posted"
}

const POSTS_TAB = "Posts";

export async function appendPosts(posts: SavedPost[]) {
  if (posts.length === 0) return { saved: 0 };
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const values = posts.map((p) => [
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
  return { saved: posts.length };
}
