// Manual, one-off companion to build-template-library.mjs. That script does
// a full clear+rewrite from the tagged corpus on every run -- it has no path
// for a hook Sophiya finds by hand outside the corpus (e.g. flagged from a
// LinkedIn post directly). This appends a single row instead, without
// touching the existing corpus-built rows.
//
// Rows added here are tagged engagement_tier="manual-add" -- as of the
// 2026-07-09 fix, build-template-library.mjs specifically detects that tag
// and re-attaches these rows after its corpus rewrite, so a future rebuild
// no longer wipes them. Do not hand-edit the engagement_tier cell away from
// "manual-add", or this row will be silently dropped on the next rebuild.
//
// Never invents likes/comments/shares -- leaves them blank if not supplied,
// per this repo's "never invent a stat" rule.
//
// Usage:
//   node scripts/add-template-library-entry.mjs --hook "<hook text>" \
//     --expert "<name>" --domain "<domain>" --url "<post url>" \
//     [--format "<F1-F12 label>"] [--likes N] [--comments N] [--shares N] [--starred]
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
const TAB = "Template Library";
const args = process.argv.slice(2);
const get = (flag, def = "") => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : def;
};
const has = (flag) => args.includes(flag);

async function main() {
  const hook = get("--hook");
  const expert = get("--expert");
  const domain = get("--domain");
  const url = get("--url");
  const format = get("--format", "");
  const likes = get("--likes", "");
  const comments = get("--comments", "");
  const shares = get("--shares", "");
  const starred = has("--starred");

  if (!hook || !expert || !url) {
    console.error("Usage: --hook <text> --expert <name> --domain <domain> --url <post url> [--format ...] [--likes N] [--comments N] [--shares N]");
    process.exit(1);
  }

  const today = new Date().toISOString().slice(0, 10);

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  // Find current row count so the comment_to_like_ratio formula points at the right row.
  const existingRes = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${TAB}!A:A` });
  const nextRow = (existingRes.data.values || []).length + 1;

  const likesVal = likes === "" ? 0 : Number(likes);
  const commentsVal = comments === "" ? 0 : Number(comments);
  const sharesVal = shares === "" ? 0 : Number(shares);

  const row = [
    hook,
    format,
    expert,
    domain,
    likesVal,
    commentsVal,
    sharesVal,
    `=IF(E${nextRow}=0,0,F${nextRow}/E${nextRow})`,
    "manual-add",
    url,
    today,
    starred ? "TRUE" : "FALSE",
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${TAB}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });

  console.log(`Appended manual Template Library row for "${expert}" at row ${nextRow}.`);
  if (likes === "" && comments === "" && shares === "") {
    console.log("Note: likes/comments/shares not supplied -- left as 0 rather than invented. Fill in real numbers if/when known.");
  }
}

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
