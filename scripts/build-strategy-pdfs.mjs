#!/usr/bin/env node
/**
 * build-strategy-pdfs.mjs
 * Renders the LinkedIn strategy docs to branded PDFs (puppeteer, same CSS family as
 * cold-email-mastery/build-pdf.mjs) and uploads them to the COMPANY Google Drive
 * (bleedai-bot service account), shared domain-wide (bleedai.com), updating in place
 * on re-runs so the shareable links stay stable. Re-run any time a doc changes.
 *
 * Docs: playbook/STRATEGY-PROPOSAL.md + playbook/LINKEDIN-GROWTH-MASTERCLASS.md
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import { google } from 'googleapis';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CREDENTIALS_PATH = path.join(ROOT, '..', 'lm-sales-agent', 'credentials.json');
const CEM_FOLDER = '1fa1FEMTdJ0DUWaoh5qW0mDCYVYzAKbZE'; // known folder, used to find the parent
const FOLDER_STATE = path.join(__dirname, '.drive-linkedin-growth.json');

// ── markdown → HTML (subset + h1 + fenced code + inline italic) ──
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function inline(s) {
  let o = esc(s);
  o = o.replace(/`([^`]+)`/g, '<code>$1</code>');
  o = o.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  o = o.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  o = o.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return o;
}
function mdToHtml(body) {
  const lines = body.split('\n');
  let html = '', i = 0, para = [];
  const flush = () => { if (para.length) { html += `<p>${inline(para.join(' '))}</p>\n`; para = []; } };
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) { flush(); const buf = []; i++; while (i < lines.length && !/^```/.test(lines[i])) { buf.push(esc(lines[i])); i++; } i++; html += `<pre><code>${buf.join('\n')}</code></pre>\n`; continue; }
    if (/^\s*$/.test(line)) { flush(); i++; continue; }
    if (/^#\s+/.test(line)) { flush(); html += `<h1 class="doc-h1">${inline(line.replace(/^#\s+/, ''))}</h1>\n`; i++; continue; }
    if (/^###\s+/.test(line)) { flush(); html += `<h3>${inline(line.replace(/^###\s+/, ''))}</h3>\n`; i++; continue; }
    if (/^##\s+/.test(line)) { flush(); html += `<h2>${inline(line.replace(/^##\s+/, ''))}</h2>\n`; i++; continue; }
    if (/^---\s*$/.test(line)) { flush(); html += '<hr>\n'; i++; continue; }
    if (/^>\s?/.test(line)) { flush(); const buf = []; while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(inline(lines[i].replace(/^>\s?/, ''))); i++; } html += `<blockquote>${buf.join('<br>')}</blockquote>\n`; continue; }
    if (/^\|/.test(line)) { flush(); const rows = []; while (i < lines.length && /^\|/.test(lines[i])) { rows.push(lines[i]); i++; } const cells = rows.map(r => r.split('|').slice(1, -1).map(c => c.trim())); const head = cells[0], bodyR = cells.slice(2); html += '<table><thead><tr>' + head.map(h => `<th>${inline(h)}</th>`).join('') + '</tr></thead><tbody>'; for (const r of bodyR) html += '<tr>' + r.map(c => `<td>${inline(c)}</td>`).join('') + '</tr>'; html += '</tbody></table>\n'; continue; }
    if (/^[-*]\s+/.test(line)) { flush(); const it = []; while (i < lines.length && /^[-*]\s+/.test(lines[i])) { it.push(lines[i].replace(/^[-*]\s+/, '')); i++; } html += '<ul>' + it.map(x => `<li>${inline(x)}</li>`).join('') + '</ul>\n'; continue; }
    if (/^\d+\.\s+/.test(line)) { flush(); const it = []; while (i < lines.length && /^\d+\.\s+/.test(lines[i])) { it.push(lines[i].replace(/^\d+\.\s+/, '')); i++; } html += '<ol>' + it.map(x => `<li>${inline(x)}</li>`).join('') + '</ol>\n'; continue; }
    para.push(line.trim()); i++;
  }
  flush();
  return html;
}

const CSS = `
  @page { size: Letter; margin: 0; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, Arial, sans-serif; color: #27272a; background: #fff; margin: 0; font-size: 12.5px; line-height: 1.55; }
  .page { padding: 0.7in 0.8in; }
  .cover { display: flex; flex-direction: column; justify-content: center; min-height: 100vh; border-top: 12px solid #dc2626; page-break-after: always; padding: 0.9in 0.85in; }
  .cover .kicker { color: #dc2626; letter-spacing: 0.18em; text-transform: uppercase; font-size: 11px; font-weight: 700; margin-bottom: 18px; }
  .cover h1 { font-family: Georgia, serif; font-size: 44px; line-height: 1.1; color: #18181b; margin: 0 0 18px; max-width: 8in; }
  .cover .sub { font-size: 15px; color: #52525b; max-width: 6.4in; margin-bottom: 40px; }
  .cover .meta { font-family: Consolas, monospace; font-size: 10.5px; color: #71717a; border-top: 1px solid #e4e4e7; padding-top: 16px; }
  h1.doc-h1 { font-family: Georgia, serif; font-size: 24px; color: #18181b; border-bottom: 3px solid #dc2626; padding-bottom: 8px; margin: 8px 0 16px; page-break-before: always; page-break-after: avoid; }
  h1.doc-h1:first-of-type { page-break-before: avoid; }
  h2 { font-family: Georgia, serif; font-size: 18px; color: #b91c1c; margin: 24px 0 9px; page-break-after: avoid; }
  h3 { font-size: 13.5px; color: #dc2626; margin: 16px 0 7px; page-break-after: avoid; }
  p { margin: 0 0 10px; color: #3f3f46; }
  strong { color: #18181b; }
  em { color: #52525b; }
  code { font-family: Consolas, monospace; background: #f4f4f5; color: #b45309; padding: 1px 5px; border-radius: 3px; font-size: 11.5px; }
  pre { background: #18181b; color: #e4e4e7; padding: 12px 14px; border-radius: 6px; overflow-x: auto; font-size: 10.5px; margin: 12px 0; }
  pre code { background: none; color: #e4e4e7; padding: 0; }
  a { color: #1d4ed8; text-decoration: none; }
  blockquote { border-left: 4px solid #dc2626; margin: 14px 0; padding: 10px 16px; background: #fef2f2; color: #27272a; font-size: 12.5px; page-break-inside: avoid; }
  hr { border: none; border-top: 1px solid #e4e4e7; margin: 20px 0; }
  ul, ol { margin: 0 0 11px; padding-left: 20px; color: #3f3f46; }
  li { margin-bottom: 5px; }
  table { width: 100%; border-collapse: collapse; margin: 13px 0; font-size: 11px; page-break-inside: avoid; }
  th { text-align: left; background: #fef2f2; color: #b91c1c; padding: 6px 8px; border: 1px solid #e4e4e7; }
  td { padding: 6px 8px; border: 1px solid #e4e4e7; color: #3f3f46; vertical-align: top; }
`;

function doc(html, { title, subtitle, kicker, meta }) {
  const cover = `<section class="cover"><div class="kicker">${esc(kicker)}</div><h1>${esc(title)}</h1><div class="sub">${esc(subtitle)}</div><div class="meta">${meta}</div></section>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${cover}<div class="page">${html}</div></body></html>`;
}

async function renderPdf(html, outFile, footer) {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 816, height: 1056, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  await page.evaluateHandle('document.fonts.ready');
  await page.pdf({
    path: outFile, format: 'Letter', printBackground: true, displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: `<div style="width:100%;font-size:8px;color:#6b7280;font-family:Arial,sans-serif;padding:0 0.8in;display:flex;justify-content:space-between;"><span>${footer}</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`,
    margin: { top: '0.35in', right: '0', bottom: '0.5in', left: '0' },
  });
  await browser.close();
}

async function ensureFolder(drive) {
  if (fs.existsSync(FOLDER_STATE)) { try { return JSON.parse(fs.readFileSync(FOLDER_STATE, 'utf8')).folder_id; } catch {} }
  const parent = (await drive.files.get({ fileId: CEM_FOLDER, fields: 'parents', supportsAllDrives: true })).data.parents[0];
  const res = await drive.files.create({ requestBody: { name: 'LinkedIn Growth (Strategy + Masterclass)', mimeType: 'application/vnd.google-apps.folder', parents: [parent] }, fields: 'id', supportsAllDrives: true });
  fs.writeFileSync(FOLDER_STATE, JSON.stringify({ folder_id: res.data.id }, null, 2));
  return res.data.id;
}

async function upload(drive, folderId, pdfPath, driveName, stateFile) {
  let fileId = null;
  if (fs.existsSync(stateFile)) { try { fileId = JSON.parse(fs.readFileSync(stateFile, 'utf8')).file_id; } catch {} }
  const media = { mimeType: 'application/pdf', body: fs.createReadStream(pdfPath) };
  if (fileId) {
    await drive.files.update({ fileId, media, supportsAllDrives: true });
  } else {
    const res = await drive.files.create({ requestBody: { name: driveName, parents: [folderId] }, media, fields: 'id', supportsAllDrives: true });
    fileId = res.data.id;
    await drive.permissions.create({ fileId, requestBody: { role: 'reader', type: 'domain', domain: 'bleedai.com' }, supportsAllDrives: true });
    fs.writeFileSync(stateFile, JSON.stringify({ file_id: fileId }, null, 2));
  }
  return `https://drive.google.com/file/d/${fileId}/view`;
}

const DOCS = [
  {
    md: path.join(ROOT, 'playbook', 'STRATEGY-PROPOSAL.md'),
    out: path.join(ROOT, 'playbook', 'Taha-LinkedIn-Strategy-Proposal.pdf'),
    driveName: 'Taha LinkedIn Growth Strategy — Proposal.pdf',
    state: path.join(__dirname, '.drive-strategy-proposal.json'),
    cover: { title: 'Taha LinkedIn Growth Strategy', subtitle: 'A 14-day Phase-1 sprint to turn a built-but-dormant LinkedIn engine into a pipeline machine — decided, data-backed, and referenced to the top operators in the space + LinkedIn’s own 2025 algorithm research.', kicker: 'Bleed AI · Strategy Proposal · July 2026', meta: 'Prepared for Taha Anwar, Founder @ Bleed AI. Baseline: 6,795 followers · 0.2% engagement · commenting dormant.<br>Living document — regenerated from playbook/STRATEGY-PROPOSAL.md; the same Drive link updates in place.' },
    footer: 'Taha LinkedIn Growth Strategy — Bleed AI',
  },
  {
    md: path.join(ROOT, 'playbook', 'LINKEDIN-GROWTH-MASTERCLASS.md'),
    out: path.join(ROOT, 'playbook', 'LinkedIn-Growth-Masterclass.pdf'),
    driveName: 'LinkedIn Growth Masterclass.pdf',
    state: path.join(__dirname, '.drive-masterclass.json'),
    cover: { title: 'The LinkedIn Growth Masterclass', subtitle: 'From zero to expert — a lesson-by-lesson curriculum built from deep research on Lara Acosta, Pierre Herubel, Adam Robinson, Justin Welsh, Jasmin Alić, Ruben Hassid, Matt Gray, the 2025/26 algorithm science (360Brew, van der Blom, AuthoredUp), and a 6,642-post corpus.', kicker: 'Bleed AI · Growth Playbook', meta: 'Living document — regenerated from playbook/LINKEDIN-GROWTH-MASTERCLASS.md; the same Drive link updates in place.' },
    footer: 'LinkedIn Growth Masterclass — Bleed AI',
  },
  {
    md: path.join(ROOT, 'playbook', 'COMPETITORS-STRATEGY.md'),
    out: path.join(ROOT, 'playbook', 'Competitor-Strategy-Teardown.pdf'),
    driveName: 'Competitor Strategy — 12-Creator Teardown.pdf',
    state: path.join(__dirname, '.drive-competitors.json'),
    cover: { title: 'Competitor Strategy — the 12-Creator Teardown', subtitle: 'Full reverse-engineering of every top cold-email / outbound creator we scraped: end-to-end strategy, top-10 AND worst-10 posts (with links + the why of each), content pillars, contrarian takes, what works, what flops, and what to steal for Taha.', kicker: 'Bleed AI · Competitor Intelligence', meta: 'Built from a 6,642-post corpus via 12 research agents. Living document — regenerated from playbook/COMPETITORS-STRATEGY.md; the same Drive link updates in place.' },
    footer: 'Competitor Strategy Teardown — Bleed AI',
  },
];

async function main() {
  if (!fs.existsSync(CREDENTIALS_PATH)) { console.error(`ERROR: credentials not found at ${CREDENTIALS_PATH}`); process.exit(1); }
  const auth = new google.auth.GoogleAuth({ keyFile: CREDENTIALS_PATH, scopes: ['https://www.googleapis.com/auth/drive'] });
  const drive = google.drive({ version: 'v3', auth });
  const folderId = await ensureFolder(drive);
  for (const d of DOCS) {
    const raw = fs.readFileSync(d.md, 'utf8').replace(/^---\n[\s\S]*?\n---\n/, ''); // strip frontmatter if any
    const html = doc(mdToHtml(raw), d.cover);
    await renderPdf(html, d.out, d.footer);
    const link = await upload(drive, folderId, d.out, d.driveName, d.state);
    console.log(`${d.driveName}\n  -> ${link}`);
  }
}
main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
