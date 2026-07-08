// New (2026-07-09): creates the "Connects" tab -- people worth sending a real
// connection request to, sourced from who's already commenting on tracked
// cold-email experts' posts (people already interested in this space, per
// Sophiya's explicit targeting rule). Forward-capture, same pattern as
// Visual Swipe -- seeded by capture-connects.mjs, not backfilled.
//
// Usage: node scripts/setup-connects-tab.mjs
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
const TAB = "Connects";
const HEADERS = [
  "name",
  "profile_url",
  "commented_on",
  "source_expert",
  "date_added",
  "status",
  "notes",
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
  } else {
    console.log(`"${TAB}" tab already exists.`);
  }

  const existingRes = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${TAB}!A1:A1` });
  if (!(existingRes.data.values || []).length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${TAB}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [HEADERS] },
    });
    console.log("Wrote header row.");
  } else {
    console.log("Header row already present.");
  }
}

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
