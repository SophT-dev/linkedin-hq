// New (2026-07-11): scrapes ALL of our own posts (Taha + Sophiya) and their
// public stats via the same Apify actor we use for tracked experts
// (apimaestro~linkedin-profile-posts), storing them in the "Account Posts" tab.
// This is the real-data engine behind the Analytics "my account" view.
//
// WHAT IT DOES each run: pulls the last ~100 posts per profile (well past the
// "at least 30 days" ask), then UPSERTS by `urn`:
//   - new post  -> append a row (first_seen = now)
//   - seen post -> refresh reactions/comments/reposts/worked + last_scraped
// So running it daily keeps every recent post's stats current AND captures new
// posts automatically. Old posts stay in the sheet as a permanent record.
//
// HONEST LIMIT: reactions/comments/reposts only. This actor (like every public
// LinkedIn scraper) cannot return views/impressions/saves -- those are
// owner-only private metrics. Confirmed against Taha's real posts 2026-07-11.
//
// SAFETY: DRY-RUN by default (prints what it would do, no Apify call, no cost).
// Pass --run to actually scrape via Apify (costs credits, hits real profiles).
//   node scripts/sync-account-posts.mjs                                # dry run
//   doppler run --project bleedai --config prd -- \
//     node scripts/sync-account-posts.mjs --run                        # real run
//   ...--run --profile taha        # only one profile
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { google } from "googleapis";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
function loadEnvLocal() {
  // Tolerate a missing .env.local -- in CI (the daily GitHub Action) the same
  // vars are injected as real env vars/secrets instead, so this is optional.
  let raw;
  try { raw = readFileSync(path.join(repoRoot, ".env.local"), "utf8"); }
  catch { return; }
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
const RUN = args.includes("--run");
const profileArg = (() => { const i = args.indexOf("--profile"); return i !== -1 ? (args[i + 1] || "").toLowerCase() : ""; })();
const MAX_POSTS = (() => { const i = args.indexOf("--max"); return i !== -1 ? Number(args[i + 1]) || 100 : 100; })();

const SHEET_ID = process.env.GOOGLE_SHEETS_ID;
const TAB = "Account Posts";
const ACTOR = process.env.APIFY_LINKEDIN_POSTS_ACTOR || "apimaestro~linkedin-profile-posts";

let PROFILES = [
  { creator: "Taha", url: "https://www.linkedin.com/in/taha-coldemail/" },
  { creator: "Sophiya", url: process.env.SOPHIYA_LINKEDIN_URL || "https://www.linkedin.com/in/sophiya-imran/" },
];
if (profileArg) PROFILES = PROFILES.filter((p) => p.creator.toLowerCase() === profileArg);

function workedVerdict(reactions, comments) {
  const score = (reactions || 0) + (comments || 0) * 3;
  if (score >= 80) return "winner";
  if (score <= 15) return "flop";
  return "neutral";
}

function displayDate(isoish) {
  // "2026-07-10 22:54:15" -> "10 Jul 2026, 10:54 pm" (no Date.now(), just format)
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(isoish || "");
  if (!m) return isoish || "";
  const [, y, mo, d, hh, mm] = m;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  let h = Number(hh); const ap = h >= 12 ? "pm" : "am"; h = h % 12 || 12;
  return `${Number(d)} ${months[Number(mo) - 1]} ${y}, ${h}:${mm} ${ap}`;
}

async function scrapeProfile(profile) {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error("APIFY_TOKEN not set (run via `doppler run --project bleedai --config prd -- ...`)");
  const res = await fetch(
    `https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items?token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: profile.url, profileUrl: profile.url, maxPosts: MAX_POSTS }),
    }
  );
  if (!res.ok) throw new Error(`Apify ${ACTOR} -> ${res.status} ${await res.text()}`);
  const items = await res.json();
  const seen = new Set();
  return items
    .map((it) => ({
      urn: it.full_urn || it.urn?.activity_urn || it.url,
      url: (it.url || "").split("?")[0],
      posted_at: it.posted_at?.date || "",
      post_type: it.post_type || "post",
      text: (it.text || "").replace(/\s+/g, " ").trim().slice(0, 140),
      reactions: it.stats?.total_reactions ?? 0,
      comments: it.stats?.comments ?? 0,
      reposts: it.stats?.reposts ?? 0,
    }))
    .filter((p) => p.urn && p.url)
    .filter((p) => { if (seen.has(p.urn)) return false; seen.add(p.urn); return true; });
}

function getSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

async function main() {
  console.log(`sync-account-posts ${RUN ? "(LIVE — hitting Apify)" : "(DRY RUN — no Apify call, no cost)"}`);
  console.log(`actor: ${ACTOR} · maxPosts: ${MAX_POSTS}`);
  PROFILES.forEach((p) => console.log(`  • ${p.creator}: ${p.url}`));

  const sheets = getSheets();

  // Load existing rows -> map urn -> { rowIndex, firstSeen }
  const existingRes = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${TAB}!A2:M100000` });
  const existing = new Map();
  (existingRes.data.values || []).forEach((r, i) => {
    const urn = r[1];
    if (urn) existing.set(urn, { rowIndex: i + 2, firstSeen: r[11] || "" });
  });
  console.log(`\n${existing.size} post(s) already in "${TAB}".`);

  if (!RUN) {
    console.log("\nDry run — would scrape each profile above, then append new posts / refresh stats on");
    console.log("existing ones (matched by urn). No network call, no Apify cost. Pass --run to execute.");
    return;
  }

  const now = new Date().toISOString();
  // Accumulate ALL writes and flush in one batched request each (Sheets allows
  // only 60 write-requests/min/user -- per-row updates blew past that at ~100
  // posts). refreshData = non-contiguous ValueRanges for one values.batchUpdate;
  // appendRows = a single values.append.
  const refreshData = [];
  const appendRows = [];

  for (const profile of PROFILES) {
    let posts = [];
    try { posts = await scrapeProfile(profile); }
    catch (e) { console.error(`✗ scrape ${profile.creator}: ${e.message}`); continue; }

    let pNew = 0, pRef = 0;
    for (const p of posts) {
      const worked = workedVerdict(p.reactions, p.comments);
      const found = existing.get(p.urn);
      // rowIndex < 2 means it was appended earlier THIS run (or by a prior
      // profile) and isn't a real sheet row yet -- skip, don't try to update it.
      if (found && found.rowIndex < 2) continue;
      if (found) {
        // Refresh stats (G:J) + last_scraped (M); leaves first_seen (L) intact.
        refreshData.push({ range: `${TAB}!G${found.rowIndex}:J${found.rowIndex}`, values: [[p.reactions, p.comments, p.reposts, worked]] });
        refreshData.push({ range: `${TAB}!M${found.rowIndex}`, values: [[now]] });
        pRef++;
      } else {
        appendRows.push([
          profile.creator, p.urn, p.posted_at, displayDate(p.posted_at), p.post_type,
          p.text, p.reactions, p.comments, p.reposts, worked, p.url, now, now,
        ]);
        existing.set(p.urn, { rowIndex: 0, firstSeen: now });
        pNew++;
      }
    }
    console.log(`\n${profile.creator}: ${posts.length} unique posts scraped -> +${pNew} new, ${pRef} refreshed`);
  }

  // Flush -- append first (new rows), then one batched update for refreshes.
  if (appendRows.length) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${TAB}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: appendRows },
    });
  }
  if (refreshData.length) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { valueInputOption: "USER_ENTERED", data: refreshData },
    });
  }

  console.log(`\nDone. Appended ${appendRows.length} new post(s), refreshed ${refreshData.length / 2} existing.`);
}

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
