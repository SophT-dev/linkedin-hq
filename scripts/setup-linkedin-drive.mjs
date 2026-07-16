// Stage 4: builds the "LinkedIn" folder structure on the company Shared Drive
// (same bleedai-bot service account + Shared Drive already used by
// lm-sales-agent, NOT a personal Drive), and fixes a real misconfiguration:
// the shared PROOF folder was nested inside a random client's folder
// ("Valentijn van Wynsberghe (Qate AI)") instead of the Shared Drive root,
// because lm-sales-agent's .env sets GOOGLE_DRIVE_FOLDER_ID while
// upload-proof-images.js reads ALL_CLIENTS_FOLDER_ID — the env var name
// never matched, so it silently fell back to a wrong hardcoded default
// (see lm-sales-agent/CLAUDE.md's explicit warning about that exact ID).
//
// Usage: node scripts/setup-linkedin-drive.mjs
import { google } from "googleapis";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const credPath = path.resolve(__dirname, "..", "..", "lm-sales-agent", "credentials.json");

const SHARED_DRIVE_ID = "0ACf8aoOLNHcZUk9PVA"; // "All Clients" Shared Drive
const WRONG_PROOF_PARENT = "1_LZCnd0OBVat-su5Cl09I0XwIJol_IP2"; // single client folder (bug)
const PROOF_FOLDER_ID = "1urTdWEPstE3xkEk4AiQFqnEoAe8Zkoyb";

const auth = new google.auth.GoogleAuth({
  keyFile: credPath,
  scopes: ["https://www.googleapis.com/auth/drive"],
});
const drive = google.drive({ version: "v3", auth });

async function findOrCreateFolder(name, parentId) {
  const res = await drive.files.list({
    q: `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
    fields: "files(id, name)",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  if (res.data.files.length > 0) return res.data.files[0].id;
  const created = await drive.files.create({
    requestBody: { name, mimeType: "application/vnd.google-apps.folder", parents: [parentId] },
    fields: "id",
    supportsAllDrives: true,
  });
  console.log(`+ created folder "${name}"`);
  return created.data.id;
}

async function main() {
  // 1. Fix the misplaced PROOF folder — move it to the Shared Drive root,
  // as a sibling of "All Clients" (it's a cross-project asset, not tied to
  // one client — same reasoning as why the new LinkedIn folder below is
  // also a sibling of "All Clients", not nested inside it).
  const current = await drive.files.get({ fileId: PROOF_FOLDER_ID, fields: "parents", supportsAllDrives: true });
  if (current.data.parents?.includes(WRONG_PROOF_PARENT)) {
    await drive.files.update({
      fileId: PROOF_FOLDER_ID,
      addParents: SHARED_DRIVE_ID,
      removeParents: WRONG_PROOF_PARENT,
      supportsAllDrives: true,
      fields: "id, parents",
    });
    console.log(`Fixed: moved PROOF folder from the wrong client folder to the Shared Drive root.`);
  } else {
    console.log("PROOF folder parent already correct — no fix needed.");
  }

  // 2. Build the LinkedIn folder structure, sibling to "All Clients".
  const linkedinId = await findOrCreateFolder("LinkedIn", SHARED_DRIVE_ID);
  const postRendersId = await findOrCreateFolder("Post Renders", linkedinId);
  const tahaId = await findOrCreateFolder("Taha", postRendersId);
  const sophiyaId = await findOrCreateFolder("Sophiya", postRendersId);
  const leadMagnetsOursId = await findOrCreateFolder("Lead Magnets (Ours)", linkedinId);
  const visualSwipeId = await findOrCreateFolder("Visual Swipe", linkedinId);
  const proofScreenshotsId = await findOrCreateFolder("Proof Screenshots", linkedinId);
  // Lead Magnet Vault MVP (2026-07-16): where large files for RECEIVED lead
  // magnets overflow to once they're too big to commit to the repo (see
  // content/lead-magnets/received/TEMPLATE.md's drive_link field) -- separate
  // from "Lead Magnets (Ours)" above, which is only for magnets we built.
  const leadMagnetVaultId = await findOrCreateFolder("Lead Magnet Vault", linkedinId);

  console.log("\nLinkedIn Drive folder structure:");
  console.log(`  LinkedIn/                    https://drive.google.com/drive/folders/${linkedinId}`);
  console.log(`    Post Renders/Taha/          https://drive.google.com/drive/folders/${tahaId}`);
  console.log(`    Post Renders/Sophiya/       https://drive.google.com/drive/folders/${sophiyaId}`);
  console.log(`    Lead Magnets (Ours)/        https://drive.google.com/drive/folders/${leadMagnetsOursId}`);
  console.log(`    Visual Swipe/               https://drive.google.com/drive/folders/${visualSwipeId}`);
  console.log(`    Proof Screenshots/          https://drive.google.com/drive/folders/${proofScreenshotsId}`);
  console.log(`    Lead Magnet Vault/          https://drive.google.com/drive/folders/${leadMagnetVaultId}`);
  console.log(`\nPROOF (canonical, general company proof): https://drive.google.com/drive/folders/${PROOF_FOLDER_ID}`);
}

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
