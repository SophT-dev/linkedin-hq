// Revamps the DailyReports tab (2026-07-08): from the old one-blob-per-day
// shape (date | generated_at | report_md -- Sophiya: "messy and
// unstructured") to one row per digest item, matching every other tab built
// this cycle. Old data was backed up to
// .scratch-synthesis/dailyreports-backup-2026-07-08.json before this ran.
//
// Schema: date | category | headline | summary | source_type | source_name | url
//
// Usage: node scripts/setup-daily-reports-tab.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { google } from "googleapis";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
function loadEnvLocal() {
  const raw = readFileSync(path.join(repoRoot, ".env.local"), "utf8");
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
const TAB = "DailyReports";
const HEADERS = ["date", "category", "headline", "summary", "source_type", "source_name", "url"];

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
  const existingTabs = (meta.data.sheets || []).map((s) => s.properties?.title);
  if (!existingTabs.includes(TAB)) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: TAB } } }] },
    });
    console.log(`Created "${TAB}" tab.`);
  }

  // Clear everything (old blob rows are backed up separately) and write the new header.
  await sheets.spreadsheets.values.clear({ spreadsheetId: SHEET_ID, range: `${TAB}!A1:Z1000` });
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${TAB}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [HEADERS] },
  });
  console.log(`Wrote new row-per-item header to "${TAB}". Old blob rows backed up separately.`);
}

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
