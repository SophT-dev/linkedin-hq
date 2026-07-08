// Stage 5 standing capture mechanism: Sophiya finds a visual worth stealing
// on LinkedIn, right-clicks it -> "Copy image address" (LinkedIn's media CDN
// links are signed URLs, fetchable without her login once copied -- LinkedIn
// only login-walls the PAGE, not the media link itself), and gives me that
// URL + a bit of context. This script does the rest: download -> upload to
// the "Visual Swipe" Drive folder (LinkedIn's dedicated inspo subfolder,
// separate from Post Renders/Lead Magnets/Proof Screenshots) -> log the row
// in the Visual Swipe Sheet tab.
//
// Usage:
//   node scripts/capture-visual-swipe.mjs \
//     --url "<media.licdn.com CDN link>" \
//     --source "Richard Illingworth" \
//     --post-url "<the LinkedIn post URL, for reference>" \
//     --type "carousel/GIF" \
//     --notes "what it is / why it's worth stealing" \
//     --adaptation "our version / how we'd adapt it"
import { readFileSync, existsSync, mkdtempSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";
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

const args = process.argv.slice(2);
const get = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : "";
};
const mediaUrl = get("--url");
const source = get("--source");
const postUrl = get("--post-url");
const visualType = get("--type") || "unspecified";
const notes = get("--notes");
const adaptation = get("--adaptation");

if (!mediaUrl || !source) {
  console.error("Usage: node scripts/capture-visual-swipe.mjs --url <media CDN link> --source <person> [--post-url ...] [--type ...] [--notes ...] [--adaptation ...]");
  process.exit(1);
}

function extFromContentType(ct) {
  if (ct.includes("gif")) return ".gif";
  if (ct.includes("png")) return ".png";
  if (ct.includes("jpeg") || ct.includes("jpg")) return ".jpg";
  if (ct.includes("mp4")) return ".mp4";
  return ".bin";
}

async function main() {
  const res = await fetch(mediaUrl);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  const contentType = res.headers.get("content-type") || "";
  const buffer = Buffer.from(await res.arrayBuffer());

  const tmpDir = mkdtempSync(path.join(os.tmpdir(), "visual-swipe-"));
  const date = new Date().toISOString().slice(0, 10);
  const slug = source.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const localPath = path.join(tmpDir, `${date}_${slug}${extFromContentType(contentType)}`);
  await (await import("node:fs/promises")).writeFile(localPath, buffer);

  const upload = await uploadWithOptionalProofDualSave(localPath, "Visual Swipe", { dualSaveToProof: false });
  console.log(`Uploaded to Drive: ${upload.primary.url}`);

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const row = [date, visualType, source, postUrl, notes, adaptation, upload.primary.url, "captured"];
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: "Visual Swipe!A1",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });
  console.log("Logged to Visual Swipe tab.");
}

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
