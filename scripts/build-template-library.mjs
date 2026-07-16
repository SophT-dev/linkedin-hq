// Stage 2 of the content-system plan: reads the tagged 6,642-post corpus in
// campaign-master, joins in real likes/comments/shares + full post content
// from each expert's raw posts.json (the _tagged.jsonl only carries likes),
// ranks by likes and separately by comments, extracts a hook + a best-effort
// F1-F9 format hint (matched against linkedin-hq/playbook/FORMAT-LIBRARY.md's
// real taxonomy), and writes a curated top slice into the "Template Library"
// tab. Leaves format blank rather than guess when there's no confident match.
//
// Preserves manual additions: rows added by add-template-library-entry.mjs
// (tagged engagement_tier="manual-add") are pulled out before the clear,
// then re-appended after the corpus rewrite with their comment_to_like_ratio
// formula re-pointed at the new row -- a corpus rebuild no longer wipes a
// hook Sophiya found and added by hand.
//
// Usage: node scripts/build-template-library.mjs [--top=100]

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { google } from "googleapis";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const corpusRoot = path.resolve(repoRoot, "..", "campaign-master", "knowledge-base", "learning-center");

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

const TOP_N = Number((process.argv.find((a) => a.startsWith("--top=")) || "--top=100").split("=")[1]);
const SHEET_ID = process.env.GOOGLE_SHEETS_ID;
const TAB = "Template Library";
// No impressions/views column: LinkedIn doesn't expose view counts for
// posts you don't own, and Apify scrapers can't get them either -- only
// likes/comments/shares are public. Our OWN posts' views (once we publish)
// are already wired into the Posts tab (Stage 12), a genuinely different
// data source. comment_to_like_ratio is a real Sheets formula (recalculates
// if a row is hand-edited) -- Sophiya's ask, 2026-07-08: distinguish real
// engagement (people compelled to respond) from vanity likes.
const HEADERS = ["hook", "suggested_format", "expert", "domain", "likes", "comments", "shares", "comment_to_like_ratio", "engagement_tier", "url", "date_added", "starred"];

function extractHook(content) {
  if (!content) return "";
  const lines = content.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const hook = lines.slice(0, 2).join(" ");
  return hook.length > 220 ? hook.slice(0, 217) + "..." : hook;
}

// Best-effort match against the real F1-F9 taxonomy in FORMAT-LIBRARY.md.
// Leaves "" when nothing lines up confidently rather than force a guess.
function suggestFormat(contentTypeTags, keywords, firstLine) {
  const tags = new Set(contentTypeTags || []);
  const kw = (keywords || []).join(" ").toLowerCase();
  const first = (firstLine || "").toLowerCase();
  const hasNumberOpener = /\d/.test(first.slice(0, 40));

  if (kw.includes("stack") || kw.includes("tool")) return "F2 - Tool Stack";
  if (kw.includes("giveaway") || kw.includes("free") || kw.includes("giving away")) return "F3 - Free Giveaway";
  if (hasNumberOpener && (kw.includes("how") || first.includes("how"))) return "F1 - Big Number + How";
  if (/^\d+[\.\)]/m.test(first) || kw.includes("playbook") || kw.includes("numbered")) return "F4 - Numbered Playbook";
  if (tags.has("story") && tags.has("contrarian-take")) return "F5 - Case-Study Reversal";
  if (tags.has("personal") && !tags.has("contrarian-take") && !hasNumberOpener) return "F6 - Emotional Personal Story";
  if ((kw.includes("built") || kw.includes("agent") || kw.includes("automation")) && (tags.has("story") || tags.has("personal"))) return "F7 - Build-in-Public";
  if (tags.has("contrarian-take")) return "F8 - Hard-Truth Contrarian";
  if (kw.includes("swipe file") || kw.includes("resource") || kw.includes("collected")) return "F9 - Swipe-File Drop";
  return "";
}

function loadTaggedCorpus() {
  const file = path.join(corpusRoot, "_tagged.jsonl");
  const lines = readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean);
  return lines.map((l) => JSON.parse(l));
}

function loadRawPostsByExpert(experts) {
  const map = new Map(); // expert -> Map(id -> rawPost)
  for (const expert of experts) {
    const file = path.join(corpusRoot, expert, "linkedin", "posts.json");
    if (!existsSync(file)) continue;
    const raw = JSON.parse(readFileSync(file, "utf8"));
    const byId = new Map(raw.map((p) => [String(p.id), p]));
    map.set(expert, byId);
  }
  return map;
}

async function main() {
  const tagged = loadTaggedCorpus();
  console.log(`Loaded ${tagged.length} tagged posts from _tagged.jsonl.`);

  const experts = [...new Set(tagged.map((t) => t.expert))];
  const rawByExpert = loadRawPostsByExpert(experts);

  const joined = [];
  let missedJoins = 0;
  for (const t of tagged) {
    const rawMap = rawByExpert.get(t.expert);
    const raw = rawMap?.get(String(t.post_id));
    if (!raw) {
      missedJoins++;
      continue;
    }
    const engagement = raw.engagement || {};
    joined.push({
      post_id: t.post_id,
      expert: t.expert,
      url: t.url,
      date: t.date,
      domain: t.domain_primary || "",
      content_type: t.content_type || [],
      keywords: t.keywords || [],
      signal: t.signal || "",
      likes: Number(engagement.likes ?? t.likes ?? 0),
      comments: Number(engagement.comments ?? 0),
      shares: Number(engagement.shares ?? 0),
      content: raw.content || "",
    });
  }
  console.log(`Joined ${joined.length} posts to their raw engagement data (${missedJoins} unmatched, skipped).`);

  const byLikes = [...joined].sort((a, b) => b.likes - a.likes).slice(0, TOP_N);
  const byComments = [...joined].sort((a, b) => b.comments - a.comments).slice(0, TOP_N);

  const tierById = new Map();
  for (const p of byLikes) tierById.set(p.post_id, "top-likes");
  for (const p of byComments) {
    tierById.set(p.post_id, tierById.has(p.post_id) ? "top-likes+comments" : "top-comments");
  }
  const curated = [...new Map([...byLikes, ...byComments].map((p) => [p.post_id, p])).values()];
  console.log(`Curated top slice: ${curated.length} unique posts (top ${TOP_N} by likes + top ${TOP_N} by comments, deduped).`);

  const today = new Date().toISOString().slice(0, 10);
  const rows = curated
    .sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments))
    .map((p, i) => {
      const hook = extractHook(p.content);
      const rowNum = i + 2; // header is row 1
      return [
        hook,
        suggestFormat(p.content_type, p.keywords, hook),
        p.expert,
        p.domain,
        p.likes,
        p.comments,
        p.shares,
        `=IF(E${rowNum}=0,0,F${rowNum}/E${rowNum})`, // comment_to_like_ratio — real Sheets formula, recalculates on edit
        tierById.get(p.post_id),
        p.url,
        today,
        "FALSE", // starred — corpus-built rows default unstarred; hand-star in the Sheet
      ];
    });

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
  // engagement_tier (column I, index 8) marks rows added by
  // add-template-library-entry.mjs as "manual-add" -- those are hooks
  // Sophiya found by hand outside the tagged corpus (e.g. flagged from a
  // LinkedIn post directly) and must survive a corpus rebuild, not just the
  // clear+rewrite every other row gets.
  let preservedManualRows = [];
  if (!existingTabs.includes(TAB)) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: TAB } } }] },
    });
    console.log(`Created "${TAB}" tab.`);
  } else {
    // Idempotent re-run: pull out manual-add rows before clearing, so they
    // can be re-appended after the corpus rewrite instead of being wiped.
    const existingRes = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${TAB}!A2:L` });
    const existingRows = existingRes.data.values || [];
    preservedManualRows = existingRows.filter((r) => r[8] === "manual-add");
    const existingRowCount = existingRows.length + 1; // +1 for header row
    if (existingRowCount > 1) {
      await sheets.spreadsheets.values.clear({ spreadsheetId: SHEET_ID, range: `${TAB}!A2:Z${existingRowCount}` });
    }
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${TAB}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [HEADERS] },
  });
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${TAB}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: rows },
  });
  console.log(`Wrote ${rows.length} rows to "${TAB}".`);

  if (preservedManualRows.length > 0) {
    // Re-append preserved manual rows below the corpus rows, rewriting each
    // one's comment_to_like_ratio formula to point at its new row number --
    // the old formula (e.g. "=IF(E184=0,0,F184/E184)") would otherwise
    // silently reference the wrong row after the corpus rewrite shifted
    // everything.
    const startRow = 2 + rows.length; // header is row 1
    const reattached = preservedManualRows.map((r, i) => {
      const rowNum = startRow + i;
      const row = [...r];
      row[7] = `=IF(E${rowNum}=0,0,F${rowNum}/E${rowNum})`;
      return row;
    });
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${TAB}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: reattached },
    });
    console.log(`Re-attached ${preservedManualRows.length} manually-added row(s) that would otherwise have been wiped by this rebuild.`);
  }

  const formatCounts = {};
  for (const r of rows) formatCounts[r[1] || "(unmatched)"] = (formatCounts[r[1] || "(unmatched)"] || 0) + 1;
  console.log("\nFormat hint distribution:");
  for (const [fmt, count] of Object.entries(formatCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${fmt}: ${count}`);
  }
}

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
