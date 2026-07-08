// Stage 7: creates the "Content Calendar" tab -- a rough, editable draft
// calendar for Taha's and Sophiya's personal profiles (Bleed AI's company
// page is explicitly Phase 2). Cadence is informed by real posting-rhythm
// research on tracked experts (see scripts/analyze-posting-cadence.mjs
// output), not a guess: Taha's cadence models the ~3x/week Tue/Wed/Thu
// pattern seen from Michel Lieben and OutboundPhD (both real cold-email
// authority accounts); Sophiya's cadence models the lighter ~2x/week
// Mon-anchored pattern seen from Kenny Damian (a builder/ops-style account).
// Every slot's source traces to something we've actually built: the
// deliverability-infra Domain Synthesis doc (Stage 6), real Template
// Library entries (Stage 2), or real WinsLog rows -- nothing invented.
//
// Idempotent: seeds only if the tab has no data rows yet. Re-running after
// slots are hand-edited will NOT overwrite them.
//
// Usage: node scripts/setup-content-calendar-tab.mjs
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
const TAB = "Content Calendar";
const HEADERS = ["date", "day", "profile", "post_type", "visual_type", "angle_theme", "source", "status"];

const SYN_DOC = "playbook/DOMAIN-SYNTHESIS-deliverability-infra.md";

const ROWS = [
  // -- Taha (authority voice, ~3x/week Tue/Wed/Thu, cold-email/deliverability expertise) --
  ["2026-07-14", "Tue", "Taha", "F12 Synthesis Playbook", "carousel/PDF preview", "the deliverability consensus stack, condensed from 8 experts we track", `${SYN_DOC} §1`, "planned"],
  ["2026-07-15", "Wed", "Taha", "F4 Numbered Playbook", "screen recording of a real client dashboard", "positive reply rate is the only metric that matters, stop tracking opens", `${SYN_DOC} §1 (metrics) + WinsLog`, "planned"],
  ["2026-07-16", "Thu", "Taha", "F1 Big Number + How", "screenshot of the real result", "$106K pipeline from a small, tightly-targeted TAM", "WinsLog: IT Services client", "planned"],
  ["2026-07-21", "Tue", "Taha", "F11 News Reaction + Insider Verdict", "none / text", "cold email in 2026 is an AI-filtering problem, not a copywriting problem", `${SYN_DOC} §2`, "planned"],
  ["2026-07-22", "Wed", "Taha", "F8 Hard-Truth Contrarian", "none / text", "stop blaming your copy, it's your infrastructure", `${SYN_DOC} §1 + Template Library`, "planned"],
  ["2026-07-23", "Thu", "Taha", "F9 Swipe-File / Resource Drop", "PDF cover image", "our cold-email pre-launch QA checklist, free", `${SYN_DOC} §3 (lead magnet build)`, "planned"],
  ["2026-07-28", "Tue", "Taha", "F2 Tool Stack of $X Company", "diagram/infographic", "the exact tool stack behind a $3.6M-$4M ARR cold email agency", `${SYN_DOC} §4`, "planned"],
  // -- Sophiya (builder/ops voice, ~2x/week Mon+Fri, F7/F10 lane per FORMAT-LIBRARY.md) --
  ["2026-07-13", "Mon", "Sophiya", "F7 Build-in-Public", "screen recording", "building our own LinkedIn content system so we never start from a blank page again", "this build itself (Stages 1-6)", "planned"],
  ["2026-07-17", "Fri", "Sophiya", "F5 Case-Study Reversal", "none / text", "an ops workflow we ditched once we saw what campaign-master actually needed", "Sources tab: Campaign Workflows row", "planned"],
  ["2026-07-20", "Mon", "Sophiya", "F4 Numbered Playbook", "screenshot of the Template Library tab", "how we built a swipe file from 6,642 scraped posts instead of guessing what to post", "Template Library + Visual Swipe (Stages 2, 5)", "planned"],
  ["2026-07-24", "Fri", "Sophiya", "F6 Emotional Personal Story", "none / text (use sparingly)", "an ops/growth lesson from actually running Bleed AI day to day", "personal", "planned"],
  ["2026-07-27", "Mon", "Sophiya", "F3 Free Giveaway", "PDF preview", "a lead magnet built straight from a real WinsLog case study", "WinsLog + LeadMagnets pipeline", "planned"],
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

  const existingRes = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${TAB}!A1:A2` });
  const existingRows = existingRes.data.values || [];
  if (existingRows.length <= 1) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${TAB}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [HEADERS, ...ROWS] },
    });
    console.log(`Wrote header + ${ROWS.length} seeded rows.`);
  } else {
    console.log("Tab already has data rows -- not overwriting. Delete rows manually first if you want to reseed.");
  }
}

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
