// Sophiya's ask (2026-07-08): pulled_at/posted_at are ISO 8601
// ("2026-04-15T00:40:31+05:00") because several scripts do date math on
// them (daily-content-tldr.mjs's recency windows, loadIntel's cutoff
// filter, auto-capture-tracked-visuals.mjs's --hours check) -- reformatting
// those columns to plain text would break all of that. Instead: two new
// display-only columns (O: pulled_at_display, P: posted_at_display) in
// "7:26 PM, 8 April 2026" style, computed FROM the machine columns, safe to
// re-run any time. The machine columns are untouched.
//
// Usage: node scripts/add-intel-display-dates.mjs
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

function humanize(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Karachi" });
  const date = d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Karachi" });
  return `${time.toLowerCase()}, ${date}`;
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

  const existing = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: "Intel!O1:P1" });
  if (!(existing.data.values || []).length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: "Intel!O1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [["pulled_at_display", "posted_at_display"]] },
    });
    console.log("Added O1:P1 headers.");
  }

  const dataRes = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: "Intel!A2:B5000" });
  const rows = dataRes.data.values || [];
  const values = rows.map((r) => [humanize(r[0]), humanize(r[1])]);
  if (!values.length) { console.log("No data rows."); return; }

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `Intel!O2:P${values.length + 1}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });
  console.log(`Wrote human-readable dates for ${values.length} rows.`);
}

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
