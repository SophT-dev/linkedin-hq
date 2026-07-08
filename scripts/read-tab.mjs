// Small reusable reader for the `linkedin-post` skill (Stage 13) and anyone
// else who needs one Sheet tab as JSON without writing a one-off script.
// Deliberately dumb: one tab in, array of row-objects out (keyed by header).
//
// Usage: node scripts/read-tab.mjs --tab "Template Library" [--range A1:Z300]
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

const args = process.argv.slice(2);
const get = (flag, def) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : def;
};
const tab = get("--tab");
const range = get("--range", "A1:Z1000");
if (!tab) {
  console.error("Usage: node scripts/read-tab.mjs --tab <tab name> [--range A1:Z1000]");
  process.exit(1);
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
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: `${tab}!${range}`,
  });
  const rows = res.data.values || [];
  if (!rows.length) { console.log("[]"); return; }
  const headers = rows[0];
  const out = rows.slice(1).filter((r) => r.some((c) => c !== "")).map((r) => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = r[i] ?? ""; });
    return obj;
  });
  console.log(JSON.stringify(out, null, 2));
}

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
