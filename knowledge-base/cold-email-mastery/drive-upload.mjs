#!/usr/bin/env node
/**
 * drive-upload.mjs
 * Uploads cold-email-mastery.pdf to the company Drive folder "BleedAI (Internal)/research/
 * Cold Email Mastery (Study Guide)" (id below), updating in place on re-runs so the same
 * shareable link stays valid. Re-run after build-pdf.mjs whenever the PDF changes.
 *
 * Auth: reuses the bleedai-bot service account credentials already used by lm-sales-agent
 * (read-only reference to a sibling repo's key file — no secret is duplicated here).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PDF_PATH = path.join(__dirname, 'cold-email-mastery.pdf');
const CREDENTIALS_PATH = path.join(__dirname, '..', '..', '..', 'lm-sales-agent', 'credentials.json');
const FOLDER_ID = '1fa1FEMTdJ0DUWaoh5qW0mDCYVYzAKbZE'; // BleedAI (Internal)/research/Cold Email Mastery (Study Guide)
const STATE_PATH = path.join(__dirname, '.drive-file-id.json');

async function main() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.error(`ERROR: service account credentials not found at ${CREDENTIALS_PATH}`);
    process.exit(1);
  }
  const auth = new google.auth.GoogleAuth({ keyFile: CREDENTIALS_PATH, scopes: ['https://www.googleapis.com/auth/drive'] });
  const drive = google.drive({ version: 'v3', auth });

  let fileId = null;
  if (fs.existsSync(STATE_PATH)) {
    try { fileId = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')).file_id || null; } catch {}
  }

  const media = { mimeType: 'application/pdf', body: fs.createReadStream(PDF_PATH) };

  if (fileId) {
    await drive.files.update({ fileId, media, supportsAllDrives: true });
    console.log(`Updated existing Drive file ${fileId}`);
  } else {
    const res = await drive.files.create({
      requestBody: { name: 'Cold Email Mastery — Study Guide.pdf', parents: [FOLDER_ID] },
      media,
      fields: 'id',
      supportsAllDrives: true,
    });
    fileId = res.data.id;
    await drive.permissions.create({
      fileId,
      requestBody: { role: 'reader', type: 'domain', domain: 'bleedai.com' },
      supportsAllDrives: true,
    });
    fs.writeFileSync(STATE_PATH, JSON.stringify({ file_id: fileId }, null, 2));
    console.log(`Created new Drive file ${fileId}`);
  }

  console.log(`View: https://drive.google.com/file/d/${fileId}/view`);
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
