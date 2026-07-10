// New (2026-07-11): creates the "Account Posts" tab -- our OWN published posts
// (Taha's + Sophiya's profiles) scraped daily via the same Apify actor
// (apimaestro~linkedin-profile-posts) we use for tracked experts. This is the
// real-data source for the Analytics "my account" view. One row per post,
// upserted by `urn` (stable id) by sync-account-posts.mjs.
//
// HONEST LIMIT: this actor returns reactions/comments/reposts (public), NOT
// views/impressions/saves -- LinkedIn never exposes those to any scraper
// (owner-only private metrics). Those columns are deliberately absent; enter
// them by hand from LinkedIn's native analytics if ever needed.
//
// Usage: node scripts/setup-account-posts-tab.mjs
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
const TAB = "Account Posts";
const HEADERS = [
  "creator",           // A - Taha / Sophiya
  "urn",               // B - full_urn, stable dedup key
  "posted_at",         // C - ISO-ish "2026-07-10 22:54:15" (for date math)
  "posted_at_display", // D - human-readable
  "post_type",         // E - post / repost / etc.
  "text_preview",      // F - first ~140 chars of the post
  "reactions",         // G - total_reactions (all like/support/love/etc.)
  "comments",          // H
  "reposts",           // I
  "worked",            // J - winner / neutral / flop (reactions + comments*3)
  "post_url",          // K
  "first_seen",        // L - when we first scraped this post
  "last_scraped",      // M - most recent stats refresh
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
