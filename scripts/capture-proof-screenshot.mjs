// Stage 9: for a proof screenshot (from COOKED/proof/, already synced to the
// general Drive PROOF folder by lm-sales-agent/scripts/upload-proof-images.js)
// that's ALSO flagged "content-worthy" in SLACK-SCREENSHOT-CHECKLIST.md --
// dual-saves it into LinkedIn/Proof Screenshots (Stage 4's Drive structure)
// and logs it as a real, sourced idea in the Post Ideas backlog (Stage 7),
// so a strong client quote doesn't just sit in the sales-proof archive --
// it becomes a pitchable LinkedIn post (F1 Big Number / F5 Case-Study
// Reversal are the natural formats for a proof screenshot).
//
// Usage:
//   node scripts/capture-proof-screenshot.mjs --file "<path to the screenshot>" \
//     --client "<client name>" --quote "<the short quote>" \
//     [--format "F1"] [--funnel "BOFU"]
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { google } from "googleapis";
import { uploadWithOptionalProofDualSave } from "./lib/linkedin-drive.mjs";

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
const file = get("--file");
const client = get("--client");
const quote = get("--quote");
const format = get("--format", "F1");
const funnel = get("--funnel", "BOFU");

if (!file || !client || !quote) {
  console.error("Usage: --file <path to screenshot> --client <name> --quote <short quote> [--format F1] [--funnel BOFU]");
  process.exit(1);
}

async function main() {
  const upload = await uploadWithOptionalProofDualSave(file, "Proof Screenshots", { dualSaveToProof: false });
  console.log(`Synced to LinkedIn/Proof Screenshots: ${upload.primary.url}`);

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  const row = [
    `real client proof: ${client} -- "${quote}"`,
    format,
    funnel,
    "proof, case-study",
    "",
    `COOKED/proof/PROOF-LIBRARY.md + ${upload.primary.url}`,
    "unused",
    "",
  ];
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "Post Ideas!A1",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });
  console.log(`Logged to Post Ideas tab (tags=proof,case-study, status=unused).`);
}

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
