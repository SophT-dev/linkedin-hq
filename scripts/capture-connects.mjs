// New (2026-07-09): pulls the real names + profile URLs of people who
// commented on a given LinkedIn post, and logs them to the Connects tab as
// candidates for real connection requests -- per Sophiya's targeting rule:
// people already commenting on other cold-email experts' posts are already
// interested in this space.
//
// Free, no Apify/login needed -- LinkedIn's public post page (no session)
// server-renders a handful of top comments with the commenter's name and
// profile URL. This won't catch every commenter (LinkedIn caps what a
// logged-out view shows), but it's a real, zero-cost starting list.
//
// Usage:
//   node scripts/capture-connects.mjs --url <linkedin_post_url> --expert "<source expert name>"
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

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      out[key] = args[i + 1];
      i++;
    }
  }
  return out;
}

const { url: POST_URL, expert: SOURCE_EXPERT } = parseArgs();
if (!POST_URL) {
  console.error("Usage: node scripts/capture-connects.mjs --url <linkedin_post_url> --expert \"<name>\"");
  process.exit(1);
}

const SHEET_ID = process.env.GOOGLE_SHEETS_ID;
const TAB = "Connects";
const norm = (u) => (u || "").split("?")[0].replace(/\/$/, "").toLowerCase();

async function fetchPostHtml(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    },
  });
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  return res.text();
}

function extractCommenters(html) {
  const matches = [...html.matchAll(/comment__author[^>]*href="([^"]+)"[^>]*>\s*([^<]+)/g)];
  const seen = new Set();
  const out = [];
  for (const [, href, rawName] of matches) {
    const profileUrl = href.split("?")[0];
    const name = rawName.replace(/\s+/g, " ").trim();
    const key = norm(profileUrl);
    if (seen.has(key)) continue;
    seen.add(key);
    // Skip company pages (not a person to connect with)
    if (profileUrl.includes("/company/")) continue;
    out.push({ name, profileUrl });
  }
  return out;
}

async function main() {
  console.log(`Fetching ${POST_URL} ...`);
  const html = await fetchPostHtml(POST_URL);
  const commenters = extractCommenters(html);
  console.log(`Found ${commenters.length} real commenter(s) on the public page.`);

  if (commenters.length === 0) {
    console.log("Nothing to add.");
    return;
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  const existingRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${TAB}!A2:B10000`,
  });
  const existingUrls = new Set(
    (existingRes.data.values || []).map((r) => norm(r[1]))
  );

  const now = new Date().toISOString().slice(0, 10);
  const newRows = commenters
    .filter((c) => !existingUrls.has(norm(c.profileUrl)))
    .map((c) => [
      c.name,
      c.profileUrl,
      POST_URL,
      SOURCE_EXPERT || "",
      now,
      "not_contacted",
      "",
    ]);

  if (newRows.length === 0) {
    console.log("All commenters already logged. Nothing new.");
    return;
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${TAB}!A1`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: newRows },
  });

  console.log(`Added ${newRows.length} new connect candidate(s):`);
  newRows.forEach((r) => console.log(`  • ${r[0]} — ${r[1]}`));
}

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
