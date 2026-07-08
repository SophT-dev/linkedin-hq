// Shared upload utility for the "LinkedIn" Drive folder structure (Stage 4).
// Used by Visual Swipe (Stage 5), the proof-screenshot dual-save (Stage 9),
// and post-render syncing going forward — one place that knows how to talk
// to the company Shared Drive via the bleedai-bot service account.
import { google } from "googleapis";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CRED_PATH = path.resolve(__dirname, "..", "..", "..", "lm-sales-agent", "credentials.json");
const SHARED_DRIVE_ID = "0ACf8aoOLNHcZUk9PVA";
export const PROOF_FOLDER_ID = "1urTdWEPstE3xkEk4AiQFqnEoAe8Zkoyb"; // general company proof, canonical

let _drive;
function getDrive() {
  if (_drive) return _drive;
  const auth = new google.auth.GoogleAuth({
    keyFile: CRED_PATH,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  _drive = google.drive({ version: "v3", auth });
  return _drive;
}

async function findOrCreateFolder(drive, name, parentId) {
  const res = await drive.files.list({
    q: `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
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
  return created.data.id;
}

// Resolves "Post Renders/Taha" (relative to the LinkedIn root) to a folder id,
// creating any missing segment. Pass "" for the LinkedIn root itself.
export async function resolveLinkedInSubfolder(subfolderPath) {
  const drive = getDrive();
  let parentId = await findOrCreateFolder(drive, "LinkedIn", SHARED_DRIVE_ID);
  if (!subfolderPath) return parentId;
  for (const segment of subfolderPath.split("/").filter(Boolean)) {
    parentId = await findOrCreateFolder(drive, segment, parentId);
  }
  return parentId;
}

const mimeFor = (f) => {
  const ext = path.extname(f).toLowerCase();
  return (
    { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".mp4": "video/mp4", ".mov": "video/quicktime", ".pdf": "application/pdf" }[ext] ||
    "application/octet-stream"
  );
};

// Uploads localFilePath into the given folderId. Skips if a file with the
// same name already exists there (idempotent, matches upload-proof-images.js).
// Sets public read so any teammate can open the link without requesting access.
export async function uploadFileToFolder(localFilePath, folderId) {
  const drive = getDrive();
  const name = path.basename(localFilePath);

  const exists = await drive.files.list({
    q: `name='${name.replace(/'/g, "\\'")}' and '${folderId}' in parents and trashed=false`,
    fields: "files(id)",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  if (exists.data.files.length > 0) {
    return { fileId: exists.data.files[0].id, skipped: true };
  }

  const res = await drive.files.create({
    requestBody: { name, parents: [folderId] },
    media: { mimeType: mimeFor(name), body: fs.createReadStream(localFilePath) },
    fields: "id",
    supportsAllDrives: true,
  });
  await drive.permissions.create({
    fileId: res.data.id,
    requestBody: { role: "reader", type: "anyone" },
    supportsAllDrives: true,
  });
  return { fileId: res.data.id, skipped: false };
}

export function driveLink(fileId) {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

// Uploads to a LinkedIn subfolder AND, if dualSaveToProof is true, also to
// the general company PROOF folder — the dual-save Sophiya asked for so
// proof/case-study screenshots aren't only findable outside the LinkedIn
// folder structure.
export async function uploadWithOptionalProofDualSave(localFilePath, subfolderPath, { dualSaveToProof = false } = {}) {
  const folderId = await resolveLinkedInSubfolder(subfolderPath);
  const primary = await uploadFileToFolder(localFilePath, folderId);
  const result = { primary: { ...primary, url: driveLink(primary.fileId), folder: `LinkedIn/${subfolderPath}` } };
  if (dualSaveToProof) {
    const proofCopy = await uploadFileToFolder(localFilePath, PROOF_FOLDER_ID);
    result.proofCopy = { ...proofCopy, url: driveLink(proofCopy.fileId), folder: "PROOF" };
  }
  return result;
}
