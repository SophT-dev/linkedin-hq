// Stage 6 helper (one-off, not part of the standing pipeline): pulls the
// high-signal posts for one corpus domain, joins the tagged Pass-1 fields to
// each expert's raw posts.json for full content + real engagement numbers,
// ranks by likes, and dumps the top N to a plain text file so the matching
// `playbook/knowledge/<domain>.md` Knowledge Base doc (renamed from "Domain
// Synthesis" 2026-07-10 — see linkedin-hq/CLAUDE.md) can be written by
// reading real posts, not just abstracts. Script name/CLI flags unchanged.
//
// Usage: node scripts/extract-domain-synthesis-source.mjs --domain deliverability-infra --top 50 --out <path>
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const get = (flag, def) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : def;
};
const domain = get("--domain", "deliverability-infra");
const top = parseInt(get("--top", "50"), 10);
const outPath = path.resolve(get("--out", path.join(__dirname, `../../.scratch-synthesis/domain-${domain}.txt`)));

const corpusRoot = path.resolve(__dirname, "..", "..", "campaign-master", "knowledge-base", "learning-center");
const tagged = readFileSync(path.join(corpusRoot, "_tagged.jsonl"), "utf8")
  .trim()
  .split("\n")
  .map((l) => JSON.parse(l));

const rows = tagged.filter((r) => r.domain_primary === domain && r.signal === "high");
console.log(`${rows.length} high-signal rows tagged "${domain}"`);

const postsCache = {};
function loadExpertPosts(expert) {
  if (postsCache[expert]) return postsCache[expert];
  const p = path.join(corpusRoot, expert, "linkedin", "posts.json");
  const arr = JSON.parse(readFileSync(p, "utf8"));
  const byId = new Map(arr.map((post) => [post.id, post]));
  postsCache[expert] = byId;
  return byId;
}

const joined = [];
for (const r of rows) {
  const byId = loadExpertPosts(r.expert);
  const raw = byId.get(r.post_id);
  if (!raw) continue;
  joined.push({
    expert: r.expert,
    url: r.url,
    date: r.date,
    likes: raw.engagement?.likes ?? r.likes ?? 0,
    comments: raw.engagement?.comments ?? 0,
    abstract: r.abstract,
    intuition: r.intuition,
    keywords: r.keywords,
    content_type: r.content_type,
    content: raw.content,
  });
}

joined.sort((a, b) => b.likes - a.likes);
const topN = joined.slice(0, top);

let out = `DOMAIN SYNTHESIS SOURCE DUMP — domain: ${domain}\n`;
out += `${joined.length} high-signal posts joined to full content, showing top ${topN.length} by likes.\n`;
out += `${"=".repeat(80)}\n\n`;
for (const p of topN) {
  out += `--- ${p.expert} | ${p.date} | ${p.likes} likes, ${p.comments} comments ---\n`;
  out += `URL: ${p.url}\n`;
  out += `Abstract: ${p.abstract}\n`;
  if (p.intuition) out += `Why it matters: ${p.intuition}\n`;
  out += `Keywords: ${(p.keywords || []).join(", ")}\n`;
  out += `\nFULL POST:\n${p.content}\n`;
  out += `\n${"-".repeat(80)}\n\n`;
}

writeFileSync(outPath, out, "utf8");
console.log(`Wrote ${topN.length} full posts to ${outPath}`);
