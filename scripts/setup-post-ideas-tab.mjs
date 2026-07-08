// Stage 7: creates the "Post Ideas" tab -- a browsable, date-decoupled
// backlog of concrete, fully-tagged post concepts (the direct answer to
// "so I never have to sit and think of a new idea"). The Content Calendar
// assigns specific ideas to specific slots; this tab is the larger
// unscheduled pool they get pulled from -- deliberately holds MORE ideas
// than are currently calendared. Every idea traces to something real: the
// deliverability-infra Domain Synthesis doc (Stage 6), a real Template
// Library entry (Stage 2), or a real WinsLog row -- nothing invented.
//
// Idempotent: seeds only if the tab has no data rows yet.
//
// Usage: node scripts/setup-post-ideas-tab.mjs
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
const TAB = "Post Ideas";
const HEADERS = ["idea_angle", "suggested_format", "funnel_stage", "tags", "lead_magnet_ideas", "source", "status", "scheduled_slot"];

const SYN_DOC = "playbook/DOMAIN-SYNTHESIS-deliverability-infra.md";

const ROWS = [
  ["the deliverability consensus stack, condensed from 8 experts we track", "F12", "TOFU", "deliverability, infra, synthesis", "Cold Email Infra Audit Checklist PDF; 30-Day Warmup Schedule template; Domain Rotation Tracker", `${SYN_DOC} §1`, "scheduled", "2026-07-14 (Taha)"],
  ["positive reply rate is the only metric that matters, stop tracking opens", "F4", "MOFU", "metrics, deliverability", "Cold Email Metrics Dashboard template; Weekly KPI Review template", `${SYN_DOC} §1 + WinsLog`, "scheduled", "2026-07-15 (Taha)"],
  ["$106K pipeline from a small, tightly-targeted TAM", "F1", "BOFU", "case-study, small-TAM", "TAM Sizing Worksheet; ICP Definition Template", "WinsLog: IT Services client", "scheduled", "2026-07-16 (Taha)"],
  ["cold email in 2026 is an AI-filtering problem, not a copywriting problem", "F11", "TOFU", "deliverability, AI, 2026-trends", "AI Spam-Filter Diagnostic Checklist", `${SYN_DOC} §2`, "scheduled", "2026-07-21 (Taha)"],
  ["stop blaming your copy, it's your infrastructure", "F8", "TOFU", "contrarian, infra", "Infra Setup Checklist", `${SYN_DOC} §1 + Template Library`, "scheduled", "2026-07-22 (Taha)"],
  ["our cold-email pre-launch QA checklist, free", "F9", "MOFU", "checklist, lead-magnet", "Pre-Launch QA Checklist PDF (starred); Deliverability Scorecard; Domain Health Tracker", `${SYN_DOC} §3`, "scheduled", "2026-07-23 (Taha)"],
  ["the exact tool stack behind a $3.6M-$4M ARR cold email agency", "F2", "TOFU", "tools, stack", "Tool Stack Comparison Sheet", `${SYN_DOC} §4`, "scheduled", "2026-07-28 (Taha)"],
  ["building our own LinkedIn content system so we never start from a blank page again", "F7", "TOFU", "build-in-public, meta", "none, process post", "this build itself (Stages 1-6)", "scheduled", "2026-07-13 (Sophiya)"],
  ["how we built a swipe file from 6,642 scraped posts instead of guessing what to post", "F4", "MOFU", "build-in-public, content-system", "Swipe File Template", "Template Library + Visual Swipe (Stages 2, 5)", "scheduled", "2026-07-20 (Sophiya)"],
  ["a lead magnet built straight from a real WinsLog case study", "F3", "TOFU", "lead-magnet, ops", "TBD once win is picked", "WinsLog", "scheduled", "2026-07-27 (Sophiya)"],
  ["why we send from secondary domains, never our primary", "F4", "TOFU", "infra, deliverability", "Domain Setup Guide", `${SYN_DOC} §1`, "unused", ""],
  ["the one-word deliverability fix: 'free' to 'complimentary' turned a 0% reply campaign around", "F6", "TOFU", "copywriting, deliverability", "Spam-Word Swap List", `${SYN_DOC} §1 (Nick Abraham)`, "unused", ""],
  ["reply rate benchmarks: industry vs. good vs. great, so you know if your campaign is actually working", "F4", "MOFU", "benchmarks, metrics", "Benchmark Cheat Sheet", `${SYN_DOC} §1`, "unused", ""],
  ["241 opportunities from one coaching client's cold email funnel", "F1", "BOFU", "case-study, coaching", "Funnel Teardown doc", "WinsLog: Coaching client", "unused", ""],
  ["55%+ positive reply rate targeting technical buyers, here's the ICP work behind it", "F1", "BOFU", "case-study, technical-buyers", "ICP Framework for Technical Buyers", "WinsLog: Tech startup client", "unused", ""],
  ["private SMTP vs. Google mailboxes, the myth outbound agencies still believe", "F8", "TOFU", "contrarian, infra", "Infra Decision Matrix", `${SYN_DOC} §2 (Nikita Maildoso)`, "unused", ""],
  ["scaling from 10K to 100K sends/month breaks everything you think you know about deliverability", "F5", "MOFU", "scale, infra", "Scale Readiness Checklist", `${SYN_DOC} §2 (Atishay/Hyperke)`, "unused", ""],
  ["what Anthropic's Claude Design release actually means for our own content ops", "F11", "TOFU", "AI, news-reaction, tooling", "AI Tool Eval Doc", "Template Library: michel-lieben post", "unused", ""],
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
