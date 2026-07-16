// Stage 14: LinkedIn Health Check for the content system (renamed 2026-07-08
// from daily-content-tldr.mjs -- pure rename, no logic change -- to remove
// a name collision with the new, different "Daily TLDR" reading digest that
// pulls LinkedIn+Reddit+newsletters and posts to Slack). Folds into COOKED's
// existing `daily check-in` (no new automation/cron) -- concise, link-out,
// tech-newsletter style. Covers: tracked-creator posts (Intel, starred or
// high-score + recent), a performance update on recent posts (Posts tab),
// today's ideas (Post Ideas backlog), and the next Content Calendar slot so
// it can be flagged for a swap if something more timely beats it -- the
// swap judgment itself is a human/Claude call made during the check-in,
// this script just surfaces the distilled data, never a raw-source re-scan.
//
// Usage: node scripts/linkedin-health-check.mjs
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

async function readTab(sheets, tab, range = "A1:AZ1000") {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${tab}!${range}` });
  const rows = res.data.values || [];
  if (!rows.length) return [];
  const headers = rows[0];
  return rows.slice(1).filter((r) => r.some((c) => c !== "")).map((r) => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = r[i] ?? ""; });
    return obj;
  });
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

  const [intel, posts, ideas, calendar] = await Promise.all([
    readTab(sheets, "Intel", "A1:M500"),
    readTab(sheets, "Posts"),
    readTab(sheets, "Post Ideas"),
    readTab(sheets, "Content Calendar"),
  ]);

  const now = Date.now();
  const dayMs = 86400000;

  console.log("=== LINKEDIN HEALTH CHECK ===\n");

  // 1. Tracked-creator posts worth knowing about
  const starred = intel.filter((r) => (r.starred || "").toString().toUpperCase() === "TRUE");
  const recent = intel.filter((r) => {
    if (!r.pulled_at) return false;
    return now - new Date(r.pulled_at).getTime() < 2 * dayMs && Number(r.score) >= 50;
  });
  const creatorHighlights = [...new Set([...starred, ...recent])].slice(0, 5);
  console.log(`INTEL (${starred.length} starred, ${recent.length} recent high-score):`);
  if (creatorHighlights.length) {
    creatorHighlights.forEach((r) => console.log(`  - [${r.source}] ${(r.title || "").slice(0, 90)} -- ${r.url}`));
  } else {
    console.log("  nothing new worth flagging");
  }

  // 2. Recent post performance
  const withStats = posts.filter((p) => p.posted_url && p.stats_updated_at);
  const recentStats = withStats.filter((p) => now - new Date(p.stats_updated_at).getTime() < 3 * dayMs);
  console.log(`\nPOST PERFORMANCE (${withStats.length} tracked total, ${recentStats.length} updated in last 3 days):`);
  recentStats.forEach((p) => console.log(`  - "${(p.hook || "").slice(0, 60)}..." -- ${p.likes} likes, ${p.comments} comments, ${p.worked}`));
  if (!recentStats.length) console.log("  no new stats since last check-in");

  // 3. Today's ideas
  const raw = ideas.filter((i) => i.status === "raw");
  const unused = ideas.filter((i) => i.status === "unused");
  console.log(`\nIDEAS (${raw.length} raw/untriaged, ${unused.length} in backlog, unused):`);
  raw.slice(0, 3).forEach((i) => console.log(`  - [needs triage] ${i.idea_angle}`));
  if (unused.length) console.log(`  - e.g. "${unused[0].idea_angle}" (${unused[0].suggested_format}, ${unused[0].funnel_stage})`);

  // 4. Next Content Calendar slot(s) -- flag for swap during the check-in, not decided here
  const planned = calendar.filter((c) => c.status === "planned").sort((a, b) => new Date(a.date) - new Date(b.date));
  console.log(`\nNEXT CALENDAR SLOT(S) (flag for swap if something more timely beat it):`);
  planned.slice(0, 2).forEach((c) => console.log(`  - ${c.date} (${c.profile}): ${c.angle_theme}`));
  if (!planned.length) console.log("  calendar is empty or all slots used -- needs refilling");

  console.log("\n=== end health check ===");
}

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
