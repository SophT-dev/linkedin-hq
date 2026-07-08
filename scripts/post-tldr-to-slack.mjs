// Posts the Daily TLDR digest to the "TLDR" Slack channel. Reuses the
// canonical shared Slack helper (campaign-master/scripts/lib/slack-notify.cjs
// -- extended 2026-07-08 to accept Block Kit `blocks`), cross-repo, same
// pattern already used by scripts/pull-booked-call-proof.mjs calling into
// lm-sales-agent. Per the house rule in campaign-master's Slack wiring
// reference: extend the shared helper, never fork a second one.
//
// Builds one Block Kit "section" per category, bold linked headline + plain
// summary, a divider between categories -- matching the real TLDR
// newsletter's plain, skimmable style Sophiya referenced. No heavy emoji.
//
// Requires SLACK_BOT_TOKEN (Doppler, bleedai/prd) and the "TLDR" channel's
// ID passed via --channel (or TLDR_SLACK_CHANNEL_ID env var) -- the bot must
// be invited to that channel once (`/invite @<bot-name>` in Slack).
//
// Usage:
//   node scripts/post-tldr-to-slack.mjs --date 2026-07-08 --items-file <path to JSON array> --channel C0XXXXXXX
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import path from "node:path";

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
const get = (flag, def = "") => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : def;
};
const date = get("--date");
const itemsFile = get("--items-file");
const channelId = get("--channel", process.env.TLDR_SLACK_CHANNEL_ID);
if (!date || !itemsFile) {
  console.error("Usage: --date YYYY-MM-DD --items-file <path> [--channel C0XXXXXXX]");
  process.exit(1);
}
if (!channelId) {
  console.error("No Slack channel ID for TLDR. Pass --channel C0XXXXXXX or set TLDR_SLACK_CHANNEL_ID.");
  process.exit(1);
}
const items = JSON.parse(readFileSync(itemsFile, "utf8"));

// Cross-repo require, same pattern as pull-booked-call-proof.mjs -> lm-sales-agent.
// createRequire (not dynamic import()) because Windows absolute paths passed
// to import() need a file:// URL -- require() handles a plain path directly.
const require = createRequire(import.meta.url);
const { postSlack } = require(
  path.resolve(repoRoot, "..", "campaign-master", "scripts", "lib", "slack-notify.cjs")
);

function chunkSection(header, lines) {
  const chunks = [];
  let cur = header;
  for (const ln of lines) {
    if ((cur + "\n" + ln).length > 2800) {
      chunks.push(cur);
      cur = ln;
    } else {
      cur += "\n" + ln;
    }
  }
  chunks.push(cur);
  return chunks;
}

function buildBlocks(items, dateLabel) {
  const byCategory = new Map();
  for (const it of items) {
    if (!byCategory.has(it.category)) byCategory.set(it.category, []);
    byCategory.get(it.category).push(it);
  }

  const blocks = [{ type: "section", text: { type: "mrkdwn", text: `*Daily TLDR — ${dateLabel}*` } }];
  for (const [category, catItems] of byCategory) {
    const lines = catItems.map((it) => {
      const headline = it.url ? `<${it.url}|${it.headline}>` : it.headline;
      return `*${headline}*\n${it.summary}`;
    });
    const chunks = chunkSection(`*${category}*`, lines);
    for (const c of chunks) blocks.push({ type: "section", text: { type: "mrkdwn", text: c } });
    blocks.push({ type: "divider" });
  }
  blocks.pop(); // drop trailing divider
  return blocks;
}

async function main() {
  if (!items.length) {
    console.log("No items to post -- skipping (nothing new today).");
    return;
  }
  const dateLabel = new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const blocks = buildBlocks(items, dateLabel);
  const text = `Daily TLDR — ${dateLabel} (${items.length} items)`;

  const result = await postSlack(text, { channelId, blocks });
  if (result.skipped) {
    console.error(`FAILED to post: ${result.reason}`);
    process.exit(1);
  }
  console.log(`Posted Daily TLDR (${items.length} items) to Slack via ${result.mode}.`);
}

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
