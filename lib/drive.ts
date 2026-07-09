// Server-side Drive helper for the webapp itself (list + upload into the
// "LinkedIn/" Shared Drive tree). Deliberately separate from
// scripts/lib/linkedin-drive.mjs -- that script authenticates via a keyFile
// path into the sibling lm-sales-agent repo, which doesn't exist in this
// repo's Vercel deployment. This uses the same GOOGLE_SERVICE_ACCOUNT_EMAIL /
// GOOGLE_PRIVATE_KEY env vars lib/sheets.ts already relies on (same
// bleedai-bot service account, just loaded as env vars instead of a keyfile)
// so it works both locally and once deployed.
import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/drive"];
const SHARED_DRIVE_ID = "0ACf8aoOLNHcZUk9PVA";
export const PROOF_FOLDER_ID = "1urTdWEPstE3xkEk4AiQFqnEoAe8Zkoyb";

function getDrive() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: SCOPES,
  });
  return google.drive({ version: "v3", auth });
}

async function findOrCreateFolder(drive: ReturnType<typeof getDrive>, name: string, parentId: string) {
  const res = await drive.files.list({
    q: `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
    fields: "files(id, name)",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  if (res.data.files && res.data.files.length > 0) return res.data.files[0].id as string;
  const created = await drive.files.create({
    requestBody: { name, mimeType: "application/vnd.google-apps.folder", parents: [parentId] },
    fields: "id",
    supportsAllDrives: true,
  });
  return created.data.id as string;
}

export async function resolveLinkedInSubfolder(subfolderPath: string) {
  const drive = getDrive();
  let parentId = await findOrCreateFolder(drive, "LinkedIn", SHARED_DRIVE_ID);
  if (!subfolderPath) return parentId;
  for (const segment of subfolderPath.split("/").filter(Boolean)) {
    parentId = await findOrCreateFolder(drive, segment, parentId);
  }
  return parentId;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  thumbnailLink?: string;
  webViewLink?: string;
  webContentLink?: string;
}

// Lists image/video files (newest first) inside a LinkedIn/<subfolderPath> folder.
export async function listFilesInSubfolder(subfolderPath: string): Promise<DriveFile[]> {
  const drive = getDrive();
  const folderId = await resolveLinkedInSubfolder(subfolderPath);
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false and (mimeType contains 'image/' or mimeType contains 'video/')`,
    fields: "files(id, name, mimeType, createdTime, thumbnailLink, webViewLink, webContentLink)",
    orderBy: "createdTime desc",
    pageSize: 200,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  return (res.data.files || []) as DriveFile[];
}

const mimeFor = (name: string) => {
  const ext = name.toLowerCase().split(".").pop() || "";
  return (
    ({ png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", mp4: "video/mp4", mov: "video/quicktime" } as Record<string, string>)[ext] ||
    "application/octet-stream"
  );
};

// Uploads a base64 data URL (as produced by a browser file input) into
// LinkedIn/<subfolderPath>, creating the folder if needed. Public read so
// thumbnailLink/webContentLink work in an <img> tag with no auth.
export async function uploadDataUrlToSubfolder(subfolderPath: string, filename: string, dataUrl: string) {
  const drive = getDrive();
  const folderId = await resolveLinkedInSubfolder(subfolderPath);
  const base64 = dataUrl.split(",").pop() || "";
  const buffer = Buffer.from(base64, "base64");
  const { Readable } = await import("node:stream");
  const res = await drive.files.create({
    requestBody: { name: filename, parents: [folderId] },
    media: { mimeType: mimeFor(filename), body: Readable.from(buffer) },
    fields: "id, name, mimeType, createdTime, thumbnailLink, webViewLink, webContentLink",
    supportsAllDrives: true,
  });
  await drive.permissions.create({
    fileId: res.data.id!,
    requestBody: { role: "reader", type: "anyone" },
    supportsAllDrives: true,
  });
  return res.data as DriveFile;
}
