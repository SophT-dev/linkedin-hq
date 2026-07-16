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
//     [--likes <n>] [--comments <n>] [--cta-keyword "<word>"] \
//     [--contents "<bullet 1 • bullet 2 • ...>"] [--content-style "personal|expert|contrarian|story|listicle"] \
//     [--format-tag "F1-F13"] [--visual-type "ai-image|video|gif|screenshot|infographic|personal-photo|carousel|none"] \
//     [--lm-form "notion|youtube|pdf|git-repo|other"] [--lm-kind "educational-doc|claude-skills|commands|prompts|free-tool|n8n-flows|claude-system-folders|other"] \
//     [--vault-path "content/lead-magnets/received/<slug>"] [--starred TRUE|FALSE] [--source-url "<author's profile url>"]
//   NOTE: --lm-type here is the ORIGINAL flag and stays mapped to the hero_text
//   column for back-compat (2026-07-09 behavior, untouched). The NEW lm_type
//   column (educational-doc/claude-skills/etc.) is written by --lm-kind instead
//   -- don't confuse the two.
//
//   node scripts/capture-item.mjs --type idea --text "<the idea>" \
//     [--context "<why/where it came from>"]
//
//   node scripts/capture-item.mjs --type webinar --source "<attendee/speaker>" \
//     --points "<key extracted points>" [--link "<recording link>"]
//
//   Update-in-place (drains status=queued rows instead of appending a new one):
//   node scripts/capture-item.mjs --type lead_magnet --update-row <1-based sheet row> \
//     [any of the flags above -- only the ones passed are overwritten, existing
//     cells for flags you don't pass are left untouched]
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

// A1-style column letter for a 1-based column index -- LeadMagnets is past
// column Z once the 12 new columns land, so simple A-Z indexing isn't enough.
function colLetter(n) {
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
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

  if (type === "lead_magnet") {
    const updateRow = get("--update-row", "");
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
    const title = get("--title", updateRow ? "" : lmType);
    // New optional fields (2026-07-16), each mapping to one of the 12 new
    // LeadMagnets columns another agent is adding concurrently -- written by
    // HEADER NAME below, same as everything else here, so it works whichever
    // order those columns land in.
    const likes = get("--likes");
    const comments = get("--comments");
    const ctaKeyword = get("--cta-keyword");
    const contents = get("--contents");
    const contentStyle = get("--content-style");
    const formatTag = get("--format-tag");
    const visualType = get("--visual-type");
    const lmForm = get("--lm-form");
    const lmKind = get("--lm-kind");
    const vaultPath = get("--vault-path");
    const starred = get("--starred", "");
    const sourceUrl = get("--source-url");

    // Build the row by HEADER NAME, not fixed position, so the LeadMagnets
    // columns can be reordered in the Sheet without breaking this script
    // (2026-07-11). landing_url holds the actual resource link.
    const hdrRes = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: "LeadMagnets!1:1" });
    const headers = (hdrRes.data.values?.[0] || []).map((h) => String(h || "").trim());
    const idx = {};
    headers.forEach((h, i) => { if (h && idx[h] === undefined) idx[h] = i; });
    const lastCol = colLetter(headers.length);

    if (updateRow) {
      // Update-in-place mode: drains a status=queued row (built by another
      // agent) instead of appending a new one. Only overwrites cells for
      // flags that were actually passed -- reads the existing row first and
      // merges on top of it, so untouched columns survive.
      const rowNum = parseInt(updateRow, 10);
      if (!rowNum || rowNum < 2) {
        console.error("--update-row must be a 1-based sheet row number (>= 2, row 1 is the header row)");
        process.exit(1);
      }
      const rowRes = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `LeadMagnets!A${rowNum}:${lastCol}${rowNum}`,
      });
      const row = rowRes.data.values?.[0] || [];
      while (row.length < headers.length) row.push("");
      const set = (k, v) => { const i = idx[k]; if (i !== undefined && v) row[i] = v; };
      set("title", get("--title", ""));
      set("hero_text", get("--lm-type", ""));
      set("source_person", source);
      set("source_post_url", postUrl);
      set("landing_url", link);
      set("key_takeaway", takeaway);
      set("post_likes", likes);
      set("post_comments", comments);
      set("cta_keyword", ctaKeyword);
      set("contents_desc", contents);
      set("content_style", contentStyle);
      set("format_tag", formatTag);
      set("visual_type", visualType);
      set("lm_form", lmForm);
      set("lm_type", lmKind);
      set("vault_path", vaultPath);
      set("starred", starred);
      set("source_person_url", sourceUrl);
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `LeadMagnets!A${rowNum}:${lastCol}${rowNum}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [row] },
      });
      console.log(`Updated LeadMagnets row ${rowNum} in place (merged provided fields only).`);
      return;
    }

    if (!source || !link) {
      console.error("Usage: --type lead_magnet --title <real title> --source <person> --link <lead magnet link> [--post-url ...] [--lm-type ...] [--takeaway ...] [--likes ...] [--comments ...] [--cta-keyword ...] [--contents ...] [--content-style ...] [--format-tag ...] [--visual-type ...] [--lm-form ...] [--lm-kind ...] [--vault-path ...] [--starred TRUE|FALSE] [--source-url ...]");
      process.exit(1);
    }
    const finalTitle = title || lmType;
    const slug = finalTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
    const row = new Array(headers.length).fill("");
    const set = (k, v) => { const i = idx[k]; if (i !== undefined) row[i] = v; };
    set("slug", slug);
    set("status", "unreviewed");
    set("title", finalTitle);
    set("hero_text", lmType);
    set("landing_url", link);
    set("created_at", today);
    set("kind", "received");
    set("source_person", source);
    set("source_post_url", postUrl);
    set("key_takeaway", takeaway);
    if (likes) set("post_likes", likes);
    if (comments) set("post_comments", comments);
    if (ctaKeyword) set("cta_keyword", ctaKeyword);
    if (contents) set("contents_desc", contents);
    if (contentStyle) set("content_style", contentStyle);
    if (formatTag) set("format_tag", formatTag);
    if (visualType) set("visual_type", visualType);
    if (lmForm) set("lm_form", lmForm);
    if (lmKind) set("lm_type", lmKind);
    if (vaultPath) set("vault_path", vaultPath);
    set("starred", starred || "FALSE");
    if (sourceUrl) set("source_person_url", sourceUrl);
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
