// Stage 8: the universal capture mechanism -- Sophiya gives me a lead magnet
// link, a quick idea, or a webinar/lecture note, and this routes it into the
// right existing tab instead of a bespoke one per type (see Sophiya's call,
// 2026-07-08: fold into LeadMagnets + Post Ideas rather than 3 new tabs).
//
// Everyday chat shorthand this backs:
//   "log this lead magnet: <link>"  -> --type lead_magnet
//   "log this idea: <note>"          -> --type idea
//   webinar/lecture note or recording link -> --type webinar
//
// Usage:
//   node scripts/capture-item.mjs --type lead_magnet --title "<real title>" --source "<person>" \
//     --post-url "<their post url>" --link "<the lead magnet link>" \
//     --takeaway "<key takeaway>" [--lm-type "PDF|Notion doc|..."]
//
//   node scripts/capture-item.mjs --type idea --text "<the idea>" \
//     [--context "<why/where it came from>"]
//
//   node scripts/capture-item.mjs --type webinar --source "<attendee/speaker>" \
//     --points "<key extracted points>" [--link "<recording link>"]
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
const args = process.argv.slice(2);
const get = (flag, def = "") => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : def;
};
const type = get("--type");
const today = new Date().toISOString().slice(0, 10);

async function main() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  if (type === "lead_magnet") {
    const source = get("--source");
    const postUrl = get("--post-url");
    const link = get("--link");
    const lmType = get("--lm-type", "unspecified");
    const takeaway = get("--takeaway");
    // --title used to be silently dropped (lmType was written into the
    // title column instead) and --link was read but never persisted to any
    // column -- fixed 2026-07-09 while building the received-lead-magnets
    // batch import. Falls back to lmType if --title isn't passed, so older
    // invocations still behave the same as before.
    const title = get("--title", lmType);
    if (!source || !link) {
      console.error("Usage: --type lead_magnet --title <real title> --source <person> --link <lead magnet link> [--post-url ...] [--lm-type ...] [--takeaway ...]");
      process.exit(1);
    }
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
    // Columns A-P are the own-built pipeline (blank here); Q-U are the
    // received-magnet fields this row actually uses. landing_url (L) holds
    // the actual resource link -- previously read as --link but never
    // written anywhere.
    const row = [
      "", "", slug, "unreviewed", title, lmType, "", "", "", "", "", link, "", today, "", "",
      "received", source, postUrl, takeaway, "",
    ];
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "LeadMagnets!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [row] },
    });
    console.log(`Logged received lead magnet from ${source} to LeadMagnets tab (kind=received, status=unreviewed).`);
  } else if (type === "idea") {
    const text = get("--text");
    const context = get("--context");
    if (!text) {
      console.error("Usage: --type idea --text <the idea> [--context ...]");
      process.exit(1);
    }
    // Post Ideas columns: idea_angle|suggested_format|funnel_stage|tags|lead_magnet_ideas|source|status|scheduled_slot
    const row = [text, "", "", "", "", context || "quick capture", "raw", ""];
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "Post Ideas!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [row] },
    });
    console.log(`Logged idea to Post Ideas tab (status=raw, to be triaged later).`);
  } else if (type === "webinar") {
    const source = get("--source");
    const points = get("--points");
    const link = get("--link", "not recorded");
    if (!source || !points) {
      console.error("Usage: --type webinar --source <attendee/speaker> --points <key extracted points> [--link <recording link>]");
      process.exit(1);
    }
    const row = [
      `webinar/lecture: ${source} -- ${points}`,
      "", "", "webinar",
      "", `link: ${link}`, "raw", "",
    ];
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "Post Ideas!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [row] },
    });
    console.log(`Logged webinar/lecture note to Post Ideas tab (tags=webinar, status=raw).`);
  } else {
    console.error('Usage: --type lead_magnet|idea|webinar ...');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
