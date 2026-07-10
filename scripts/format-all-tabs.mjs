// One consistent house style applied across every tab in the linkedin-hq
// Sheet: frozen bold header row (brand red / white text), sized + wrapped
// columns, clean grid borders, filter view, and a SHARED status-color
// palette so the same word always means the same color on every tab.
//
// Re-run any time a new tab is added (append its config to TAB_CONFIGS)
// to keep the whole sheet looking like one system instead of a patchwork.
//
// Usage: node scripts/format-all-tabs.mjs

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { google } from "googleapis";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function loadEnvLocal() {
  const envPath = path.join(repoRoot, ".env.local");
  if (!existsSync(envPath)) throw new Error(`.env.local not found at ${envPath}`);
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) {
      let value = match[2];
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (!(match[1] in process.env)) process.env[match[1]] = value;
    }
  }
}
loadEnvLocal();

const SHEET_ID = process.env.GOOGLE_SHEETS_ID;
const BRAND_RED = { red: 0.69, green: 0.07, blue: 0.06 };

// One shared palette — same word, same color, on every tab in the sheet.
const STATUS_COLORS = {
  // Sources-tab statuses
  live: { red: 0.80, green: 0.93, blue: 0.80 },
  "live-partial": { red: 0.93, green: 0.96, blue: 0.78 },
  "live-manual": { red: 0.93, green: 0.96, blue: 0.78 },
  building: { red: 0.80, green: 0.87, blue: 0.98 },
  gap: { red: 0.98, green: 0.82, blue: 0.80 },
  "exists-unprocessed": { red: 0.98, green: 0.89, blue: 0.75 },
  dormant: { red: 0.90, green: 0.90, blue: 0.90 },
  retiring: { red: 0.90, green: 0.90, blue: 0.90 },
  // Visual Swipe-tab status
  captured: { red: 0.80, green: 0.93, blue: 0.80 },
  // Content Calendar-tab status
  planned: { red: 0.93, green: 0.96, blue: 0.78 },
  swapped: { red: 0.98, green: 0.89, blue: 0.75 },
  // Post Ideas-tab status
  scheduled: { red: 0.80, green: 0.87, blue: 0.98 },
  used: { red: 0.80, green: 0.93, blue: 0.80 },
  unused: { red: 0.90, green: 0.90, blue: 0.90 },
  raw: { red: 0.98, green: 0.89, blue: 0.75 },
  // Connects-tab status
  not_contacted: { red: 0.90, green: 0.90, blue: 0.90 },
  requested: { red: 0.93, green: 0.96, blue: 0.78 },
  connected: { red: 0.80, green: 0.93, blue: 0.80 },
  ignored: { red: 0.98, green: 0.82, blue: 0.80 },
  // LeadMagnets-tab status, received-magnet values (Stage 8)
  unreviewed: { red: 0.98, green: 0.89, blue: 0.75 },
  reviewed: { red: 0.80, green: 0.93, blue: 0.80 },
  // Posts-tab status
  draft: { red: 0.93, green: 0.96, blue: 0.78 },
  approved: { red: 0.80, green: 0.87, blue: 0.98 },
  posted: { red: 0.80, green: 0.93, blue: 0.80 },
  // LeadMagnets-tab status
  researching: { red: 0.93, green: 0.96, blue: 0.78 },
  outline_ready: { red: 0.80, green: 0.87, blue: 0.98 },
  body_ready: { red: 0.80, green: 0.87, blue: 0.98 },
  published: { red: 0.80, green: 0.93, blue: 0.80 },
  error: { red: 0.98, green: 0.82, blue: 0.80 },
  // Intel-tab comment_status
  pending_review: { red: 0.93, green: 0.96, blue: 0.78 },
  rejected: { red: 0.98, green: 0.82, blue: 0.80 },
  quality_failed: { red: 0.98, green: 0.82, blue: 0.80 },
  post_failed: { red: 0.98, green: 0.82, blue: 0.80 },
  deleted: { red: 0.90, green: 0.90, blue: 0.90 },
  // Flags-tab resolved? column
  TRUE: { red: 0.80, green: 0.93, blue: 0.80 },
  FALSE: { red: 0.98, green: 0.89, blue: 0.75 },
};

// Column widths in px, per tab. Short id/date/status columns stay narrow;
// long free-text columns (body, notes, summary) get room to breathe.
const TAB_CONFIGS = {
  Sources: { widths: [280, 340, 130, 110, 420], statusCol: 2 },
  Intel: {
    // pulled_at|posted_at|type|source|title|url|summary|score|starred|comment_text|comment_status|comment_posted_at|comment_style|image_url|pulled_at_display|posted_at_display
    widths: [150, 150, 90, 140, 260, 240, 320, 80, 80, 280, 140, 150, 120, 240, 170, 170],
    statusCol: 10,
  },
  Config: { widths: [220, 480] },
  WinsLog: {
    // date|client|campaign|what_we_did|result|lesson|tags|case_study_doc_link
    widths: [100, 160, 200, 320, 240, 240, 160, 220],
  },
  Posts: {
    // id|batch_date|hook|body|format|funnel_stage|visual_brief|lead_magnet|sources_used|authenticity_tag|status
    // |posted_url|likes|comments|views|worked|stats_updated_at  (L-Q, Stage 12: performance tracking)
    widths: [100, 110, 260, 340, 120, 130, 220, 220, 220, 150, 110, 240, 70, 90, 80, 90, 150],
    statusCol: 10,
  },
  LeadMagnets: {
    // source_person(=Source Creator)|id|post_id|slug|status|title|hero_text|value_props|cta_text|outline_md|body_md|notion_url|landing_url|gif_url|created_at|clicks|conversions|kind|source_post_url|key_takeaway|used_in_post|domain
    // 2026-07-11: source_person moved to the FIRST column; app reads by header name so order is free to change.
    widths: [200, 100, 100, 150, 120, 200, 220, 220, 220, 220, 220, 220, 220, 200, 130, 80, 100, 90, 240, 260, 100, 120],
    statusCol: 4,
  },
  DailyReports: {
    // date|category|headline|summary|source_type|source_name|url  (revamped 2026-07-08, one row per item)
    widths: [100, 130, 320, 380, 110, 150, 260],
  },
  Flags: { widths: [110, 180, 260, 420, 100], statusCol: 4 },
  "Template Library": {
    // hook|suggested_format|expert|domain|likes|comments|shares|comment_to_like_ratio|engagement_tier|url|date_added
    widths: [380, 170, 140, 160, 80, 90, 80, 150, 140, 260, 100],
  },
  "Visual Swipe": {
    // date|visual_type|source_person|source_url|notes|our_version_adaptation|drive_link|status
    widths: [100, 130, 150, 260, 280, 280, 220, 100],
    statusCol: 7,
  },
  "Content Calendar": {
    // date|day|profile|post_type|visual_type|angle_theme|source|status
    widths: [100, 70, 90, 200, 220, 320, 260, 100],
    statusCol: 7,
  },
  "Post Ideas": {
    // idea_angle|suggested_format|funnel_stage|tags|lead_magnet_ideas|source|status|scheduled_slot
    widths: [340, 130, 100, 200, 320, 260, 100, 160],
    statusCol: 6,
  },
  Connects: {
    // name|profile_url|commented_on|source_expert|date_added|status|notes
    widths: [180, 260, 320, 160, 100, 120, 260],
    statusCol: 5,
  },
};

async function formatTab(sheets, sheetId, tabName, config) {
  const dataRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${tabName}!A:Z`,
  });
  const rows = dataRes.data.values || [];
  const rowCount = Math.max(rows.length, 1);
  const colCount = config.widths.length;

  const requests = [
    {
      updateSheetProperties: {
        properties: { sheetId, gridProperties: { frozenRowCount: 1 }, tabColor: BRAND_RED },
        fields: "gridProperties.frozenRowCount,tabColor",
      },
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: colCount },
        cell: {
          userEnteredFormat: {
            backgroundColor: BRAND_RED,
            textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
            horizontalAlignment: "CENTER",
            verticalAlignment: "MIDDLE",
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)",
      },
    },
    ...config.widths.map((px, i) => ({
      updateDimensionProperties: {
        range: { sheetId, dimension: "COLUMNS", startIndex: i, endIndex: i + 1 },
        properties: { pixelSize: px },
        fields: "pixelSize",
      },
    })),
  ];

  if (rowCount > 1) {
    requests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: 1, endRowIndex: rowCount, startColumnIndex: 0, endColumnIndex: colCount },
        cell: { userEnteredFormat: { wrapStrategy: "WRAP", verticalAlignment: "TOP" } },
        fields: "userEnteredFormat(wrapStrategy,verticalAlignment)",
      },
    });
  }

  if (config.statusCol !== undefined) {
    requests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: 1, endRowIndex: rowCount, startColumnIndex: config.statusCol, endColumnIndex: config.statusCol + 1 },
        cell: { userEnteredFormat: { horizontalAlignment: "CENTER", textFormat: { bold: true } } },
        fields: "userEnteredFormat(horizontalAlignment,textFormat.bold)",
      },
    });
    for (let i = 1; i < rowCount; i++) {
      const val = (rows[i]?.[config.statusCol] || "").trim();
      const color = STATUS_COLORS[val];
      if (!color) continue;
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: i, endRowIndex: i + 1, startColumnIndex: config.statusCol, endColumnIndex: config.statusCol + 1 },
          cell: { userEnteredFormat: { backgroundColor: color } },
          fields: "userEnteredFormat.backgroundColor",
        },
      });
    }
  }

  requests.push({
    setBasicFilter: {
      filter: { range: { sheetId, startRowIndex: 0, endRowIndex: rowCount, startColumnIndex: 0, endColumnIndex: colCount } },
    },
  });
  requests.push({
    updateBorders: {
      range: { sheetId, startRowIndex: 0, endRowIndex: rowCount, startColumnIndex: 0, endColumnIndex: colCount },
      top: { style: "SOLID", width: 1, color: { red: 0.7, green: 0.7, blue: 0.7 } },
      bottom: { style: "SOLID", width: 1, color: { red: 0.7, green: 0.7, blue: 0.7 } },
      left: { style: "SOLID", width: 1, color: { red: 0.7, green: 0.7, blue: 0.7 } },
      right: { style: "SOLID", width: 1, color: { red: 0.7, green: 0.7, blue: 0.7 } },
      innerHorizontal: { style: "SOLID", width: 1, color: { red: 0.88, green: 0.88, blue: 0.88 } },
      innerVertical: { style: "SOLID", width: 1, color: { red: 0.88, green: 0.88, blue: 0.88 } },
    },
  });

  await sheets.spreadsheets.batchUpdate({ spreadsheetId: SHEET_ID, requestBody: { requests } });
  console.log(`Formatted "${tabName}" — ${Math.max(rowCount - 1, 0)} data row(s).`);
}

async function main() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const tabsByName = new Map((meta.data.sheets || []).map((s) => [s.properties.title, s.properties.sheetId]));

  for (const [tabName, config] of Object.entries(TAB_CONFIGS)) {
    const sheetId = tabsByName.get(tabName);
    if (sheetId === undefined) {
      console.log(`Skipping "${tabName}" — tab doesn't exist.`);
      continue;
    }
    await formatTab(sheets, sheetId, tabName, config);
  }
}

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
