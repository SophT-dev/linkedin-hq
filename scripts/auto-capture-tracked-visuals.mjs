// Stage 15 (the "zero Sophiya involvement" behavior change): for tracked
// creators only, automatically captures a post's image/GIF into Visual
// Swipe once it's landed in Intel via the 4-hourly n8n scrape -- no click
// from Sophiya, ever, for anything from the tracked-creator list.
//
// Deliberately a standalone script, NOT inline in the Vercel /api/intel/ingest
// route: the Drive upload logic (scripts/lib/linkedin-drive.mjs) reads a local
// credentials.json file path, which doesn't exist in Vercel's serverless
// runtime. Keeping this local (same pattern as every other capture script
// tonight) avoids rearchitecting the app's credential model for a pipeline
// that isn't even live yet (Apify key needs rotation, n8n workflow needs
// import + activation -- both explicitly left for Sophiya, not done here).
//
// Intended to run right after each n8n ingest cycle (or on its own schedule
// once the pipeline is live) -- not wired into any cron yet, this is the
// mechanism, not the trigger.
//
// Usage: node scripts/auto-capture-tracked-visuals.mjs [--threshold 50] [--hours 24]
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
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

const SHEET_ID = process.env.GOOGLE_SHEETS_ID;
const args = process.argv.slice(2);
const get = (flag, def) => {
  const i = args.indexOf(flag);
  return i !== -1 ? Number(args[i + 1]) : def;
};
const threshold = get("--threshold", 50);
const hours = get("--hours", 24);

function extFromContentType(ct) {
  if (ct.includes("gif")) return ".gif";
  if (ct.includes("png")) return ".png";
  if (ct.includes("jpeg") || ct.includes("jpg")) return ".jpg";
  if (ct.includes("mp4")) return ".mp4";
  return ".bin";
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

  const [intelRes, swipeRes] = await Promise.all([
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: "Intel!A1:N2000" }),
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: "Visual Swipe!A1:H1000" }),
  ]);

  const intelRows = intelRes.data.values || [];
  const alreadyCaptured = new Set((swipeRes.data.values || []).slice(1).map((r) => r[3]).filter(Boolean)); // source_url col D

  const cutoff = Date.now() - hours * 3600 * 1000;
  const candidates = intelRows.slice(1).filter((r) => {
    const [pulledAt, , type, source, , url, , score, , , , , , imageUrl] = r;
    if (type !== "linkedin") return false;
    if (!imageUrl) return false;
    if (alreadyCaptured.has(url)) return false;
    if (Number(score) < threshold) return false;
    if (pulledAt && Date.parse(pulledAt) < cutoff) return false;
    return true;
  });

  console.log(`${candidates.length} tracked-creator post(s) above score ${threshold} in the last ${hours}h with an uncaptured image/GIF.`);

  for (const r of candidates) {
    const [, , , source, , url, , score, , , , , , imageUrl] = r;
    try {
      const res = await fetch(imageUrl);
      if (!res.ok) { console.error(`  ✗ download failed (${res.status}): ${url}`); continue; }
      const contentType = res.headers.get("content-type") || "";
      const buffer = Buffer.from(await res.arrayBuffer());
      const tmpDir = mkdtempSync(path.join(os.tmpdir(), "auto-visual-swipe-"));
      const date = new Date().toISOString().slice(0, 10);
      const slug = (source || "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      const localPath = path.join(tmpDir, `${date}_${slug}${extFromContentType(contentType)}`);
      writeFileSync(localPath, buffer);

      const upload = await uploadWithOptionalProofDualSave(localPath, "Visual Swipe", { dualSaveToProof: false });
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: "Visual Swipe!A1",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[date, "auto-captured", source, url, `score ${score}, auto-captured above threshold ${threshold}`, "", upload.primary.url, "captured"]],
        },
      });
      console.log(`  ✓ captured ${source} (score ${score}) -> ${upload.primary.url}`);
    } catch (e) {
      console.error(`  ✗ ${url}: ${e.message}`);
    }
  }
}

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
