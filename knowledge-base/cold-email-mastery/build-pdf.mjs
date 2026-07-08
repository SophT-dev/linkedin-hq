#!/usr/bin/env node
/**
 * build-pdf.mjs
 * Assembles every lesson markdown file in lessons/ into one PDF study guide
 * with a cover page + table of contents (exact page numbers via a two-pass
 * probe render, same technique as lm-sales-agent/scripts/create-pdf.js).
 *
 * Usage: node build-pdf.mjs
 * Re-run after adding/editing any lesson file — fully regenerates the PDF
 * and the assembled HTML (kept alongside for a quick browser preview).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import { PDFParse } from 'pdf-parse';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LESSONS_DIR = path.join(__dirname, 'lessons');
const OUT_PDF = path.join(__dirname, 'cold-email-mastery.pdf');
const OUT_HTML = path.join(__dirname, 'cold-email-mastery.html');

// ── tiny markdown → HTML (subset: frontmatter, h2/h3, blockquote, table, hr, ul/ol, bold/code/link) ──
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inline(s) {
  let out = escapeHtml(s);
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return out;
}

function parseFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { meta: {}, body: raw };
  const meta = {};
  for (const line of m[1].split('\n')) {
    const mm = line.match(/^(\w+):\s*(.*)$/);
    if (mm) meta[mm[1]] = mm[2].trim();
  }
  return { meta, body: m[2] };
}

function mdToHtml(body) {
  const lines = body.split('\n');
  let html = '';
  let i = 0;
  let para = [];

  const flushPara = () => {
    if (para.length) {
      html += `<p>${inline(para.join(' '))}</p>\n`;
      para = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    if (/^\s*$/.test(line)) { flushPara(); i++; continue; }

    if (/^###\s+/.test(line)) { flushPara(); html += `<h3>${inline(line.replace(/^###\s+/, ''))}</h3>\n`; i++; continue; }
    if (/^##\s+/.test(line)) { flushPara(); html += `<h2>${inline(line.replace(/^##\s+/, ''))}</h2>\n`; i++; continue; }

    if (/^---\s*$/.test(line)) { flushPara(); html += '<hr>\n'; i++; continue; }

    if (/^>\s?/.test(line)) {
      flushPara();
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, '')); i++; }
      html += `<blockquote>${buf.map(l => inline(l)).join('<br>')}</blockquote>\n`;
      continue;
    }

    if (/^\|/.test(line)) {
      flushPara();
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) { rows.push(lines[i]); i++; }
      const cells = rows.map(r => r.split('|').slice(1, -1).map(c => c.trim()));
      const header = cells[0];
      const body_ = cells.slice(2); // skip separator row
      html += '<table><thead><tr>' + header.map(h => `<th>${inline(h)}</th>`).join('') + '</tr></thead><tbody>';
      for (const row of body_) html += '<tr>' + row.map(c => `<td>${inline(c)}</td>`).join('') + '</tr>';
      html += '</tbody></table>\n';
      continue;
    }

    if (/^-\s+/.test(line)) {
      flushPara();
      const items = [];
      while (i < lines.length && /^-\s+/.test(lines[i])) { items.push(lines[i].replace(/^-\s+/, '')); i++; }
      html += '<ul>' + items.map(it => `<li>${inline(it)}</li>`).join('') + '</ul>\n';
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      flushPara();
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) { items.push(lines[i].replace(/^\d+\.\s+/, '')); i++; }
      html += '<ol>' + items.map(it => `<li>${inline(it)}</li>`).join('') + '</ol>\n';
      continue;
    }

    if (/^\*[^*].*\*$/.test(line.trim())) {
      flushPara();
      html += `<p class="fine">${inline(line.trim().slice(1, -1))}</p>\n`;
      i++; continue;
    }

    para.push(line.trim());
    i++;
  }
  flushPara();
  return html;
}

// ── load lessons ──────────────────────────────────────────────────────────
function loadLessons() {
  const files = fs.readdirSync(LESSONS_DIR).filter(f => f.endsWith('.md')).sort();
  return files.map(f => {
    const raw = fs.readFileSync(path.join(LESSONS_DIR, f), 'utf8');
    const { meta, body } = parseFrontmatter(raw);
    return {
      file: f,
      number: meta.number || '?',
      title: meta.title || f,
      subtitle: meta.subtitle || '',
      html: mdToHtml(body),
    };
  }).sort((a, b) => Number(a.number) - Number(b.number));
}

// ── page template ────────────────────────────────────────────────────────
const CSS = `
  @page { size: Letter; margin: 0; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', system-ui, Arial, sans-serif;
    color: #27272a;
    background: #ffffff;
    margin: 0;
    font-size: 13px;
    line-height: 1.55;
  }
  .page { padding: 0.75in 0.85in; min-height: 100vh; page-break-after: always; }
  .page:last-child { page-break-after: auto; }

  .cover { display: flex; flex-direction: column; justify-content: center; align-items: flex-start; min-height: 100vh; background: #ffffff; border-top: 10px solid #dc2626; }
  .cover .kicker { color: #dc2626; letter-spacing: 0.18em; text-transform: uppercase; font-size: 11px; font-weight: 600; margin-bottom: 18px; }
  .cover h1 { font-family: Georgia, Cambria, 'Times New Roman', serif; font-size: 46px; line-height: 1.12; color: #18181b; margin: 0 0 18px 0; max-width: 8in; }
  .cover .sub { font-size: 15px; color: #52525b; max-width: 6.2in; margin-bottom: 40px; }
  .cover .meta { font-family: Consolas, 'JetBrains Mono', monospace; font-size: 10.5px; color: #71717a; border-top: 1px solid #e4e4e7; padding-top: 16px; width: 100%; }

  .toc h2 { font-family: Georgia, serif; font-size: 22px; color: #18181b; border-bottom: 2px solid #dc2626; padding-bottom: 10px; margin-bottom: 24px; }
  .toc-list { list-style: none; padding: 0; margin: 0; }
  .toc-list li { display: flex; align-items: baseline; padding: 9px 0; border-bottom: 1px dotted #d4d4d8; font-size: 13.5px; }
  .toc-num { color: #dc2626; font-family: Consolas, monospace; width: 28px; flex-shrink: 0; }
  .toc-title { flex: 1; color: #27272a; }
  .toc-dots { flex: 1; }
  .toc-page { color: #71717a; font-family: Consolas, monospace; font-size: 12px; }

  .lesson-header { border-bottom: 2px solid #dc2626; padding-bottom: 14px; margin-bottom: 22px; }
  .lesson-header .kicker { color: #dc2626; font-family: Consolas, monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; }
  .lesson-header h1 { font-family: Georgia, serif; font-size: 26px; color: #18181b; margin: 6px 0 4px 0; }
  .lesson-header .sub { color: #52525b; font-size: 13px; }

  h2 { font-family: Georgia, serif; font-size: 17px; color: #b91c1c; margin: 26px 0 10px 0; }
  h3 { font-size: 14px; color: #dc2626; margin: 18px 0 8px 0; }
  p { margin: 0 0 11px 0; color: #3f3f46; }
  p.fine { color: #71717a; font-size: 11.5px; font-style: italic; }
  strong { color: #18181b; }
  code { font-family: Consolas, monospace; background: #f4f4f5; color: #b45309; padding: 1px 5px; border-radius: 3px; font-size: 12px; }
  a { color: #1d4ed8; text-decoration: none; }
  blockquote { border-left: 3px solid #dc2626; margin: 14px 0; padding: 8px 16px; background: #fef2f2; color: #27272a; font-size: 13px; }
  hr { border: none; border-top: 1px solid #e4e4e7; margin: 22px 0; }
  ul, ol { margin: 0 0 12px 0; padding-left: 22px; color: #3f3f46; }
  li { margin-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 11.5px; }
  th { text-align: left; background: #fef2f2; color: #b91c1c; padding: 6px 8px; border: 1px solid #e4e4e7; }
  td { padding: 6px 8px; border: 1px solid #e4e4e7; color: #3f3f46; }
`;

function renderDocument(lessons, tocPages) {
  const cover = `
    <section class="page cover">
      <div class="kicker">Bleed AI · Sophiya's Study Guide</div>
      <h1>Cold Email Mastery</h1>
      <div class="sub">Built lesson-by-lesson from 6,642 scraped LinkedIn posts across 11 top cold-email &amp; outbound operators (Josh Braun, Richard Illingworth, Nick Abraham, OutboundPhD, Michel Lieben, Charles Tenot, Atishay/Hyperke, Kenny Damian, Nikita/Maildoso, Sacha Martinot, Aidan Collins) — the <code>campaign-master</code> learning-center corpus — plus supplemental 2026 context beyond the corpus.</div>
      <div class="meta">Every quote below is dated and sourced back to the original post.<br>Regenerated automatically as each lesson is added — this is a living document.</div>
    </section>`;

  const tocItems = lessons.map((l, idx) => `
    <li>
      <span class="toc-num">${String(l.number).padStart(2, '0')}</span>
      <span class="toc-title">${l.title}</span>
      <span class="toc-dots"></span>
      <span class="toc-page">${tocPages[idx] || ''}</span>
    </li>`).join('');

  const toc = `
    <section class="page toc">
      <h2>Table of Contents</h2>
      <ul class="toc-list">${tocItems}</ul>
    </section>`;

  const body = lessons.map(l => `
    <section class="page lesson" data-lesson="${l.number}">
      <div class="lesson-header">
        <div class="kicker">Lesson ${String(l.number).padStart(2, '0')}</div>
        <h1>${l.title}</h1>
        <div class="sub">${l.subtitle}</div>
      </div>
      ${l.html}
    </section>`).join('\n');

  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${cover}${toc}${body}</body></html>`;
}

// ── puppeteer render (two-pass: probe for TOC page numbers, then final) ──
async function renderPdf(html, outFile) {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 816, height: 1056, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  await page.evaluateHandle('document.fonts.ready');

  const pdfOpts = {
    format: 'Letter',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: `<div style="width:100%;font-size:8px;color:#6b7280;font-family:Arial,sans-serif;padding:0 0.85in;display:flex;justify-content:space-between;"><span>Cold Email Mastery — Bleed AI</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`,
    margin: { top: '0.4in', right: '0', bottom: '0.5in', left: '0' },
  };

  // pass 1: tag each lesson section, probe-render, read real page numbers
  await page.evaluate(() => {
    document.querySelectorAll('section.lesson').forEach((sec, i) => {
      const a = document.createElement('span');
      a.textContent = `ZZTOC${i}ZZ`;
      a.style.cssText = 'font-size:1px;color:#0b0d12;';
      sec.insertBefore(a, sec.firstChild);
    });
  });
  const probePath = outFile.replace(/\.pdf$/, '.__probe.pdf');
  await page.pdf({ path: probePath, ...pdfOpts });

  let nums = [];
  try {
    const buf = fs.readFileSync(probePath);
    const parsed = await new PDFParse({ data: buf }).getText();
    const pages = parsed.pages.map(p => String(p.text || '').replace(/\s+/g, ''));
    const lessonCount = await page.evaluate(() => document.querySelectorAll('section.lesson').length);
    for (let i = 0; i < lessonCount; i++) {
      const tok = `ZZTOC${i}ZZ`;
      let pg = '';
      for (let p = 0; p < pages.length; p++) { if (pages[p].includes(tok)) { pg = p + 1; break; } }
      nums.push(pg);
    }
  } catch (e) {
    console.warn(`TOC page-number probe failed (${e.message}) — rendering without page numbers`);
  }
  try { fs.unlinkSync(probePath); } catch {}

  await browser.close();
  return nums;
}

async function main() {
  const lessons = loadLessons();
  if (!lessons.length) { console.error('No lessons found in lessons/'); process.exit(1); }

  // render once with blank TOC to get real page numbers, then render final with them filled in
  const draftHtml = renderDocument(lessons, lessons.map(() => ''));
  const tocPages = await renderPdf(draftHtml, OUT_PDF);

  const finalHtml = renderDocument(lessons, tocPages);
  fs.writeFileSync(OUT_HTML, finalHtml, 'utf8');

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 816, height: 1056, deviceScaleFactor: 1 });
  await page.setContent(finalHtml, { waitUntil: 'domcontentloaded' });
  await page.evaluateHandle('document.fonts.ready');
  await page.pdf({
    path: OUT_PDF,
    format: 'Letter',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: `<div style="width:100%;font-size:8px;color:#6b7280;font-family:Arial,sans-serif;padding:0 0.85in;display:flex;justify-content:space-between;"><span>Cold Email Mastery — Bleed AI</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`,
    margin: { top: '0.4in', right: '0', bottom: '0.5in', left: '0' },
  });
  await browser.close();

  console.log(`Built ${lessons.length} lesson(s) → ${OUT_PDF}`);
  console.log(`HTML preview → ${OUT_HTML}`);
}

main().catch(e => { console.error(e); process.exit(1); });
