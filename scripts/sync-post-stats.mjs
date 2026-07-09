// Stage 12: performance tracking, ported from Notion to Sheets. Same
// matching/scoring logic as bleed-ai-brain/scripts/stats-scrape.cjs (Apify
// scrape -> match by Posted URL -> Likes/Comments/Views/Worked?), now
// targeting the Posts tab's L-Q columns instead of the Notion Content
// Command Center -- replacing its role per Stage 12.
//
// SAFETY: defaults to DRY-RUN like the original script (prints what it
// WOULD do, hits nothing). Pass --run to actually scrape LinkedIn via
// Apify -- this costs money and hits a real profile, so it needs an
// explicit --run, same gate the original script had ("Sophiya's call").
//
//   node scripts/sync-post-stats.mjs                              # dry run
//   doppler run -- node scripts/sync-post-stats.mjs --run         # real run (APIFY_TOKEN from Doppler)
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

const RUN = process.argv.includes("--run");
const SHEET_ID = process.env.GOOGLE_SHEETS_ID;
const POSTS_TAB = "Posts";

// Profiles to track.
const PROFILES = [
  { creator: "Taha", url: "https://www.linkedin.com/in/taha-coldemail/" },
  { creator: "Sophiya", url: process.env.SOPHIYA_LINKEDIN_URL || "https://www.linkedin.com/in/sophiya-imran/" },
];

const ACTOR = process.env.APIFY_LINKEDIN_POSTS_ACTOR || "apimaestro~linkedin-profile-posts";
const norm = (u) => (u || "").split("?")[0].replace(/\/$/, "").toLowerCase();

function workedVerdict({ likes, comments }) {
  const score = (likes || 0) + (comments || 0) * 3;
  if (score >= 80) return "winner";
  if (score <= 15) return "flop";
  return "neutral";
}

async function scrapeProfile(profile) {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error("APIFY_TOKEN not set (Doppler)");
  const res = await fetch(
    `https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items?token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: profile.url, profileUrl: profile.url, maxPosts: 20 }),
    }
  );
  if (!res.ok) throw new Error(`Apify ${ACTOR} -> ${res.status} ${await res.text()}`);
  const items = await res.json();
  return items
    .map((it) => ({
      url: it.url || it.postUrl || it.link,
      likes: it.numLikes ?? it.likes ?? it.reactions ?? it.likesCount ?? 0,
      comments: it.numComments ?? it.comments ?? it.commentsCount ?? 0,
      views: it.numViews ?? it.views ?? it.impressions ?? null,
    }))
    .filter((p) => p.url);
}

async function main() {
  console.log(`sync-post-stats ${RUN ? "(LIVE)" : "(DRY RUN — pass --run to hit LinkedIn via Apify)"}`);
  console.log(`actor: ${ACTOR}`);
  PROFILES.forEach((p) => console.log(`  • ${p.creator}: ${p.url}${p.url.includes("PLACEHOLDER") ? "   <-- NEEDS REAL URL" : ""}`));

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  const dataRes = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${POSTS_TAB}!A2:Q1000` });
  const rows = (dataRes.data.values || []).map((r, i) => ({ rowIndex: i + 2, id: r[0], postedUrl: r[11] || "" })).filter((r) => r.id && r.postedUrl);

  console.log(`\n${rows.length} Posts tab row(s) have a posted_url to match against.`);

  if (!RUN) {
    console.log("\nDry run — would: scrape each profile, match scraped posts to Posts tab rows by posted_url,");
    console.log("then update likes/comments/views + worked in columns M-Q. No network calls made. Exiting.");
    return;
  }

  let updated = 0;
  for (const profile of PROFILES) {
    if (profile.url.includes("PLACEHOLDER")) { console.log(`skip ${profile.creator} (no URL)`); continue; }
    let posts = [];
    try { posts = await scrapeProfile(profile); }
    catch (e) { console.error(`✗ scrape ${profile.creator}: ${e.message}`); continue; }
    console.log(`${profile.creator}: ${posts.length} posts scraped`);

    for (const post of posts) {
      const row = rows.find((r) => norm(r.postedUrl) === norm(post.url));
      if (!row) continue;
      const worked = workedVerdict(post);
      const now = new Date().toISOString();
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${POSTS_TAB}!M${row.rowIndex}:Q${row.rowIndex}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[Number(post.likes) || 0, Number(post.comments) || 0, post.views != null ? Number(post.views) : "", worked, now]] },
      });
      updated++;
      console.log(`  ✓ ${post.url}  ♥${post.likes} 💬${post.comments}  -> ${worked}`);
    }
  }
  console.log(`\nDone. Updated ${updated} row(s).`);
}

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
