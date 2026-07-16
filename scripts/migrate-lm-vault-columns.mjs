// One-off, idempotent migration for the Lead Magnet Vault MVP schema widen.
// Appends the 12 new LeadMagnets columns (post_likes..source_person_url) and
// the 1 new Template Library column (starred) to each tab's header row, if
// not already present. Safe to re-run — only ever appends missing headers,
// never touches existing ones or any data rows.
//
// Usage: node scripts/migrate-lm-vault-columns.mjs
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

const LEAD_MAGNETS_TAB = "LeadMagnets";
const TEMPLATE_LIBRARY_TAB = "Template Library";

// New LeadMagnets columns, in the exact order they should be appended.
const NEW_LEAD_MAGNET_HEADERS = [
  "post_likes",
  "post_comments",
  "cta_keyword",
  "contents_desc",
  "content_style",
  "format_tag",
  "visual_type",
  "lm_form",
  "lm_type",
  "vault_path",
  "starred",
  "source_person_url",
];

async function migrateTabHeaders(sheets, tab, newHeaders) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${tab}!1:1`,
  });
  const existing = (res.data.values?.[0] || []).map((h) => String(h || "").trim());
  const existingSet = new Set(existing.filter(Boolean));

  const toAdd = newHeaders.filter((h) => !existingSet.has(h));
  const skipped = newHeaders.filter((h) => existingSet.has(h));

  if (toAdd.length === 0) {
    console.log(`[${tab}] Nothing to add — all ${newHeaders.length} column(s) already present. Skipped: ${skipped.join(", ") || "(none)"}`);
    return;
  }

  const finalHeaders = [...existing, ...toAdd];
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${tab}!1:1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [finalHeaders] },
  });

  console.log(`[${tab}] Added ${toAdd.length} column(s): ${toAdd.join(", ")}`);
  if (skipped.length) console.log(`[${tab}] Skipped (already present): ${skipped.join(", ")}`);
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

  console.log("=== Migrating LeadMagnets tab ===");
  await migrateTabHeaders(sheets, LEAD_MAGNETS_TAB, NEW_LEAD_MAGNET_HEADERS);

  console.log("\n=== Migrating Template Library tab ===");
  await migrateTabHeaders(sheets, TEMPLATE_LIBRARY_TAB, ["starred"]);

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
