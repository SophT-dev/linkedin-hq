// Saves one day's Daily TLDR items to the (revamped) DailyReports tab.
// Mirrors lib/sheets.ts's saveDailyReportItems() logic in plain JS (scripts/
// here don't share the Next.js TS module graph -- same pattern as every
// other script in this folder). Idempotent: clears any existing rows for
// this date first, so re-running the digest for the same day doesn't
// duplicate rows.
//
// Usage: node scripts/save-daily-report.mjs --date 2026-07-08 --items-file <path to JSON array>
// items shape: [{ category, headline, summary, source_type, source_name, url }, ...]
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

const args = process.argv.slice(2);
const get = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : "";
};
const date = get("--date");
const itemsFile = get("--items-file");
if (!date || !itemsFile) {
  console.error("Usage: node scripts/save-daily-report.mjs --date YYYY-MM-DD --items-file <path>");
  process.exit(1);
}
const items = JSON.parse(readFileSync(itemsFile, "utf8"));

async function main() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  const existingRes = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${TAB}!A:A` });
  const existingRows = existingRes.data.values || [];
  const rowIndicesToClear = existingRows.map((r, i) => (r[0] === date ? i + 1 : -1)).filter((i) => i > 0);
  if (rowIndicesToClear.length) {
    await sheets.spreadsheets.values.batchClear({
      spreadsheetId: SHEET_ID,
      requestBody: { ranges: rowIndicesToClear.map((i) => `${TAB}!A${i}:G${i}`) },
    });
    console.log(`Cleared ${rowIndicesToClear.length} existing row(s) for ${date} before rewriting.`);
  }

  const values = items.map((it) => [date, it.category, it.headline, it.summary, it.source_type, it.source_name, it.url]);
  if (values.length) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${TAB}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });
  }
  console.log(`Saved ${values.length} item(s) for ${date} to ${TAB}.`);
}

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
