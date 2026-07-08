// A standing "parking lot" tab: small polish/loose-end items flagged during
// the build that Sophiya wants to address later, all in one place instead of
// scattered across chat history. Add a row here any time something gets
// deferred rather than fixed immediately.
//
// Usage: node scripts/setup-flags-tab.mjs

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
const TAB = "Flags";
const HEADERS = ["date_flagged", "stage", "item", "note", "resolved?"];

const SEED_ROWS = [
  ["2026-07-08", "Stage 1 — Sources tab", "last_touched column mostly blank", "Left as-is per Sophiya's call (\"not relevant right now\") — revisit at the end of the build if it turns out useful.", "FALSE"],
  ["2026-07-08", "Stage 1 — Sources tab", "Locations aren't clickable links", "Currently plain text paths. For anything with a real URL (Notion, Drive, bleedai.com) these should become hyperlinks; local-only repo paths have no universal clickable target. Revisit at the end of the build.", "FALSE"],
];

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

  const existingRes = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${TAB}!A:A` });
  const existingItems = new Set((existingRes.data.values || []).slice(1).map((r) => r[0]));
  const hasHeader = (existingRes.data.values || []).length > 0;

  const rowsToWrite = [];
  if (!hasHeader) rowsToWrite.push(HEADERS);
  for (const row of SEED_ROWS) {
    if (!existingItems.has(row[0])) rowsToWrite.push(row);
  }

  if (rowsToWrite.length > 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${TAB}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: rowsToWrite },
    });
    console.log(`Wrote ${rowsToWrite.length} row(s) to "${TAB}".`);
  } else {
    console.log("Nothing new to write.");
  }
}

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
