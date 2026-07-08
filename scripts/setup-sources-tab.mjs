// Stage 1 of the content-system plan: creates (if missing) and seeds the
// "Sources" tab — the one map of every content source, where it lives, and
// its status. Idempotent: safe to re-run, only appends rows not already
// present (matched by name).
//
// Usage: node scripts/setup-sources-tab.mjs

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { google } from "googleapis";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

// --- minimal .env.local loader (no dotenv dependency in this repo) ---
function loadEnvLocal() {
  const envPath = path.join(repoRoot, ".env.local");
  if (!existsSync(envPath)) {
    throw new Error(`.env.local not found at ${envPath}`);
  }
  const raw = readFileSync(envPath, "utf8");
  const lines = raw.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) {
      const key = match[1];
      let value = match[2];
      // Handle a double-quoted value that may itself contain literal \n
      // sequences (the private key) — value is already on one line here
      // since the key is written as a single quoted line in this file.
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
    i++;
  }
}
loadEnvLocal();

const SHEET_ID = process.env.GOOGLE_SHEETS_ID;
const TAB = "Sources";
const HEADERS = ["name", "location", "status", "last_touched", "notes"];

// Seed rows compiled from the full research + planning conversation.
// status values: live | live-partial | live-manual | dormant | building | gap | exists-unprocessed | retiring
const SEED_ROWS = [
  ["Scraped Expert Posts (11 experts, 6,642 posts, tagged)", "campaign-master/knowledge-base/learning-center", "live", "2026-07-04", "Pass-1 tagged (domain/signal/likes/comments). Pass-2 domain synthesis not started yet (Stage 6)."],
  ["Past LinkedIn Posts (Taha)", "linkedin-hq Google Sheet — Posts tab", "live", "", ""],
  ["Past LinkedIn Posts (Sophiya)", "linkedin-hq Google Sheet — Posts tab", "live-partial", "", "Sophiya's own LinkedIn profile URL is still a placeholder in stats-scrape.cjs."],
  ["Wins / Client Stories", "linkedin-hq Google Sheet — WinsLog tab", "live", "", ""],
  ["Lead replies / Email reply screenshots", "COOKED/proof/ (PROOF-LIBRARY.md, SLACK-SCREENSHOT-CHECKLIST.md)", "live-manual", "", "Working manual pipeline for sales proof. Needs a content-worthy? tag to also feed LinkedIn content (Stage 9)."],
  ["Calendar / booked-call proof", "Google Calendar (API/MCP already connected)", "gap", "", "No screenshot needed — pull booked-call counts directly via API (Stage 9)."],
  ["Playbooks / Hook bank / Format Library", "linkedin-hq/playbook/ (COPYWRITING-BIBLE.md, FORMAT-LIBRARY.md, STRATEGY.md, PLAYBOOK.md, INSIDER-RESEARCH.md, RESOURCES.md)", "live", "", ""],
  ["Branding", "Bleed AI Branding/BRAND.md", "live", "2026-06-22", "Canonical brand bible — colors, fonts, voice, banned words."],
  ["Company story / wins / losses / growth", "COOKED/CLAUDE.md — COMPANY SNAPSHOT", "live-partial", "", "Has identity/pricing/team/financials. Missing Story/Wins/Losses/Growth narrative (Stage 10)."],
  ["Campaign Workflows / Process Knowledge", "lm-sales-agent skills (run-sales-pitch, process-replies) + campaign-master scripts/README", "live", "", "Real methodology/tool-stack detail for 'show the work' philosophy."],
  ["Webinars / Lectures", "", "gap", "", "No home identified yet — needs Sophiya to confirm where these live, if they exist."],
  ["Campaign Case Studies", "", "gap", "", "Likely belongs near lm-sales-agent's proposal/case docs — needs confirming."],
  ["Memes", "", "gap", "", "Low priority — add manually if/when one turns up worth using."],
  ["YouTube transcripts (eric-nowoslawski)", "campaign-master/knowledge-base/learning-center/eric-nowoslawski/youtube", "exists-unprocessed", "", "~52 transcripts scraped but never tagged (Pass-1 tagging never ran on these)."],
  ["Template Library", "linkedin-hq Google Sheet — Template Library tab", "building", "", "Stage 2 — curated top slice (~150-200 posts) ranked by likes/comments from the tagged corpus."],
  ["Visual Swipe", "linkedin-hq Google Sheet — Visual Swipe tab", "building", "", "Stage 5 — forward-only capture of visuals/screen-recordings worth stealing."],
  ["Domain Synthesis docs", "TBD (Stage 6)", "building", "", "One mega-playbook per domain, condensing high-signal posts from the tagged corpus."],
  ["Content Calendar", "linkedin-hq Google Sheet — Content Calendar tab", "building", "", "Stage 7 — Taha + Sophiya personal profiles, informed by tracked-expert posting-cadence research."],
  ["LeadMagnetVault", "linkedin-hq Google Sheet — LeadMagnetVault tab", "building", "", "Stage 8 — lead magnets received from commenting on others' posts."],
  ["Ideas", "linkedin-hq Google Sheet — Ideas tab", "building", "", "Stage 8 — quick chat-log capture of new ideas, feeds the Daily TLDR."],
  ["Google Drive \"LinkedIn\" folder", "Google Drive", "building", "", "Stage 4 — Post Renders, Visual Swipe, Proof Screenshots subfolders."],
  ["LinkedIn comment bot / Intel feed", "linkedin-hq (lib/comments.ts, n8n-linkedin-creators.json) + Intel tab", "dormant", "2026-04-14", "Built, never activated. Stage 15 reactivates: rotate Apify key, populate linkedin_creators, import n8n workflow."],
  ["Notion Content Command Center", "Notion (bleed-ai-brain/scripts/notion-sync.cjs)", "retiring", "", "Currently 'the record' per linkedin-hq/CLAUDE.md — being replaced by Sheets-based performance tracking (Stage 12)."],
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

  // Verify access + list existing tabs.
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const existingTabs = (meta.data.sheets || []).map((s) => s.properties?.title);
  console.log("Connected. Existing tabs:", existingTabs.join(", "));

  const sourcesTabExists = existingTabs.includes(TAB);
  if (!sourcesTabExists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: TAB } } }] },
    });
    console.log(`Created "${TAB}" tab.`);
  } else {
    console.log(`"${TAB}" tab already exists.`);
  }

  // Read whatever's already there so re-runs don't duplicate rows.
  const existingRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${TAB}!A:A`,
  });
  const existingNames = new Set(
    (existingRes.data.values || []).slice(1).map((r) => r[0])
  );
  const hasHeader = (existingRes.data.values || []).length > 0;

  const rowsToWrite = [];
  if (!hasHeader) rowsToWrite.push(HEADERS);
  for (const row of SEED_ROWS) {
    if (!existingNames.has(row[0])) rowsToWrite.push(row);
  }

  if (rowsToWrite.length === 0) {
    console.log("Nothing new to write — all seed rows already present.");
    return;
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${TAB}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: rowsToWrite },
  });
  console.log(`Wrote ${rowsToWrite.length} row(s) to "${TAB}" (including header if new).`);

  // Read back to confirm.
  const finalRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${TAB}!A:E`,
  });
  const finalRows = finalRes.data.values || [];
  console.log(`\n"${TAB}" tab now has ${finalRows.length - 1} data row(s):`);
  for (const r of finalRows.slice(1)) {
    console.log(` - ${r[0]}  [${r[2]}]  -> ${r[1] || "(no location)"}`);
  }
}

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
