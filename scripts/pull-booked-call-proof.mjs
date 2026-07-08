// Stage 9: pulls a real booked-call count directly from the Calendly API --
// no screenshot needed for this proof source. Reuses the same org/event-type
// scoping as lm-sales-agent/scripts/calendly/sync-bookings.mjs (the
// vip-invite-only event linked in every lead-magnet reply), read-only here
// (no Instantly writes -- this is just for proof/content, not pipeline sync).
//
// Requires CALENDLY_API_TOKEN in the environment -- run via the lm-sales-agent
// Doppler wrapper since that's where this secret lives:
//   cd lm-sales-agent && bin/dev node ../linkedin-hq/scripts/pull-booked-call-proof.mjs [--days 30]
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

const T = process.env.CALENDLY_API_TOKEN;
if (!T) {
  console.error("CALENDLY_API_TOKEN not set. Run via: cd lm-sales-agent && bin/dev node ../linkedin-hq/scripts/pull-booked-call-proof.mjs");
  process.exit(1);
}

const ORG = "https://api.calendly.com/organizations/CEGHTXCT7POLEMME";
const EVENT_TYPE = "https://api.calendly.com/event_types/a5760e5e-b132-4014-8962-5ceb0d43ac83";

const args = process.argv.slice(2);
const daysFlag = args.indexOf("--days");
const days = daysFlag !== -1 ? parseInt(args[daysFlag + 1], 10) : 30;

const cal = async (p) => {
  const r = await fetch("https://api.calendly.com" + p, { headers: { Authorization: "Bearer " + T } });
  if (!r.ok) throw new Error(`Calendly ${p} -> ${r.status}`);
  return r.json();
};

async function main() {
  const base = `/scheduled_events?organization=${encodeURIComponent(ORG)}&event_type=${encodeURIComponent(EVENT_TYPE)}&count=100&sort=start_time:desc`;
  let url = base;
  const events = [];
  for (let i = 0; i < 10; i++) {
    const r = await cal(url);
    (r.collection || []).forEach((e) => { if (e.event_type === EVENT_TYPE) events.push(e); });
    const np = r.pagination?.next_page_token;
    if (!np) break;
    url = `${base}&page_token=${np}`;
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const recent = events.filter((e) => new Date(e.start_time) >= cutoff);
  const active = recent.filter((e) => e.status === "active");
  const canceled = recent.filter((e) => e.status === "canceled");

  console.log(`Real Calendly pull -- last ${days} days:`);
  console.log(`  ${active.length} active booked call(s), ${canceled.length} canceled, ${recent.length} total in the window.`);

  if (active.length > 0) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const sheets = google.sheets({ version: "v4", auth });
    const row = [
      `we booked ${active.length} real calls in the last ${days} days from the lead-magnet funnel`,
      "F1",
      "BOFU",
      "proof, booked-calls",
      "",
      `Calendly API (live pull, ${new Date().toISOString().slice(0, 10)})`,
      "unused",
      "",
    ];
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: "Post Ideas!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [row] },
    });
    console.log("Logged to Post Ideas tab (tags=proof,booked-calls, status=unused).");
  } else {
    console.log("No active bookings in this window -- nothing logged (not inventing a number).");
  }
}

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
