// One-time (2026-07-10) migration: the 61 `kind=received` rows in the
// LeadMagnets tab were tagged yesterday with an ad-hoc 7-value topic
// (embedded in the hero_text column as "<topic> · <lm_type>") that doesn't
// line up with the corpus's real 13-value `domain_primary` taxonomy used by
// the new playbook/knowledge/ Knowledge Base docs. This adds a new `domain`
// column (V) and back-fills the real corpus-aligned domain for each row per
// the remapping table in the "Knowledge Base Restructure" plan:
//
//   ai-automation    -> ai-automation-tooling
//   sales/outbound   -> sales-calls-closing
//   linkedin-growth  -> linkedin-content
//   offer-creation   -> offers-lead-magnets
//   cold-email       -> deliverability-infra (default; re-checked individually --
//                       some are really list-building-data or sales-calls-closing)
//   tools/tech-stack -> ai-automation-tooling or deliverability-infra or
//                       list-building-data (judgment call per item, what the
//                       tool does, not that it's "a tool")
//   marketing-general / other -> no clean match, left unmapped (blank)
//
// Individual judgment calls (based on reading the actual
// content/lead-magnets/received/*.md swipe file where one exists, else the
// row's title) are hardcoded in DOMAIN_BY_SLUG below -- see the plan file /
// PR description for the reasoning behind each one.
//
// Idempotent: safe to re-run, always recomputes column V for every matched
// slug. Does NOT touch any other column.
//
// Usage: node scripts/remap-leadmagnet-domains.mjs [--dry-run]
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { google } from "googleapis";

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

const DRY_RUN = process.argv.includes("--dry-run");

// slug -> domain_primary (matches playbook/knowledge/<domain>.md filenames exactly)
const DOMAIN_BY_SLUG = {
  "premium-playbook": "deliverability-infra",
  "attention-hooks": "copywriting",
  "infrastructure-blueprint": "deliverability-infra",
  "all-enrichment-tools": "list-building-data",
  "50-openers": "copywriting",
  "sales-triggers": "sales-calls-closing",
  "inbox-breakthrough": "deliverability-infra",
  "cold-email-frameworks": "copywriting",
  "cold-outbound-front-end-offer-creation-by-litehouse": "offers-lead-magnets",
  "get-ai-to-write-emails-for-your-b2b-lead-list": "ai-automation-tooling",
  "linkedin-outbound-101": "linkedin-content",
  "the-no-agenda-linkedin-strategy-how-one-founder-hit-56-reply": "linkedin-content",
  "the-self-selling-linkedin-machine": "linkedin-content",
  "viral-linkedin-swipe-file": "linkedin-content",
  "linkedin-dm-gym": "linkedin-content",
  "automated-linkedin-content-creation-with-gpt-4-and-dall-e-fo": "ai-automation-tooling",
  "linkedin-dm-vault-2-0": "linkedin-content",
  "salesrobot-s-top-linkedin-dm-strategies": "linkedin-content",
  "guaranteed-40-reply-rate-on-linkedin-dms": "linkedin-content",
  "the-best-way-to-personalize-your-dms": "linkedin-content",
  "lead-magnet-library": "", // marketing-general, no clean match
  "instig8-gumroad-store": "", // other, no clean match (placeholder capture)
  "apollo-ai-ai-gtm-to-automate-your-lead-gen": "ai-automation-tooling",
  "sr-campaign-decoded": "sales-calls-closing",
  "untitled-google-doc": "", // other, no clean match (placeholder capture)
  "your-ai-copywriter-toolkit": "ai-automation-tooling",
  "the-competitive-intelligence-system": "", // marketing-general, no clean match
  "untitled-airtable-base": "", // other, no clean match (placeholder capture)
  "untitled-docsend-deck": "", // other, no clean match (placeholder capture)
  "4-signs-you-ve-found-a-great-market": "offers-lead-magnets",
  "price-based-on-value-not-cost": "offers-lead-magnets",
  "sell-based-on-value-not-volume": "offers-lead-magnets",
  "identify-the-real-problems": "offers-lead-magnets",
  "how-to-create-a-list-of-any-contacts-in-10-mins": "sales-calls-closing",
  "how-to-scrape-leads-that-you-know-will-be-interested": "sales-calls-closing",
  "how-we-drive-615-leads-per-lead-magnet": "", // marketing-general, no clean match
  "how-to-steal-other-high-performing-posts": "linkedin-content",
  "lead-magnet-templates-you-can-steal": "", // marketing-general, no clean match
  "build-a-1m-cold-emailing-system-in-7-mins": "sales-calls-closing",
  "deliverability-masterclass-smartservers-smartsenders-smartde": "deliverability-infra",
  "set-up-smartlead-ai-email-warm-up": "deliverability-infra",
  "secrets-to-64-reply-rates-in-2025": "deliverability-infra",
  "proven-cold-email-framework-vault": "copywriting",
  "how-to-actually-personalize-your-cold-emails": "ai-automation-tooling",
  "3-follow-up-emails-that-will-2x-your-conversion-rate": "sales-calls-closing",
  "7-ways-to-transform-your-cold-email-campaigns": "deliverability-infra",
  "b2b-linkedin-webinar-funnel": "linkedin-content",
  "founder-s-personal-branding-vault": "linkedin-content",
  "how-we-use-secret-signals-to-book-meetings": "sales-calls-closing",
  "how-to-leverage-linkedin-sales-nav-for-buying-signals": "sales-calls-closing",
  "sales-call-domination-using-glyphic": "sales-calls-closing",
  "13-high-response-linkedin-outreach-templates-we-ve-used-for-": "linkedin-content",
  "the-dual-approach-that-changed-everything": "linkedin-content",
  "the-magnet-post-framework-2-3-inbound-leads-daily": "linkedin-content",
  "the-120k-strategic-post-blueprint": "linkedin-content",
  "the-connection-to-client-conversion-sequence-35-close-rate": "sales-calls-closing",
  "my-secret-prompt-system-for-viral-linkedin-posts-in-10-mins": "ai-automation-tooling",
  "the-counterintuitive-dm-approach": "linkedin-content",
  "the-72-day-journey-0-to-24-4k-mrr": "sales-calls-closing",
  "7-figure-funnel-blueprint": "", // marketing-general, no clean match
  "amplify-personal-brand-gpt-guide": "ai-automation-tooling",
};

async function main() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "LeadMagnets!A1:V1000",
  });
  const rows = res.data.values || [];
  if (!rows.length) throw new Error("LeadMagnets tab is empty");
  const headers = rows[0];
  const slugCol = headers.indexOf("slug");
  const kindCol = headers.indexOf("kind");
  let domainCol = headers.indexOf("domain");

  const updates = [];
  if (domainCol === -1) {
    domainCol = headers.length; // append as a new column
    updates.push({
      range: `LeadMagnets!${colLetter(domainCol)}1`,
      values: [["domain"]],
    });
    console.log(`No "domain" column found -- will create it at column ${colLetter(domainCol)}.`);
  } else {
    console.log(`Existing "domain" column found at ${colLetter(domainCol)}.`);
  }

  let matched = 0;
  let unmapped = 0;
  let notFound = 0;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row.some((c) => c !== "" && c !== undefined)) continue;
    const kind = row[kindCol] || "";
    if (kind !== "received") continue;
    const slug = row[slugCol] || "";
    if (!(slug in DOMAIN_BY_SLUG)) {
      console.warn(`  no mapping entry for slug "${slug}" (row ${i + 1}) -- skipping`);
      notFound++;
      continue;
    }
    const domain = DOMAIN_BY_SLUG[slug];
    if (!domain) unmapped++;
    matched++;
    updates.push({
      range: `LeadMagnets!${colLetter(domainCol)}${i + 1}`,
      values: [[domain]],
    });
  }

  console.log(`${matched} received rows matched (${unmapped} left unmapped per the plan, ${notFound} slugs not found in the mapping table).`);

  if (DRY_RUN) {
    console.log("--dry-run set, not writing. Sample of planned updates:");
    console.log(JSON.stringify(updates.slice(0, 5), null, 2));
    return;
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: { valueInputOption: "USER_ENTERED", data: updates },
  });
  console.log(`Wrote ${updates.length} cells to LeadMagnets!${colLetter(domainCol)}.`);
}

function colLetter(index) {
  let letter = "";
  let n = index;
  while (n >= 0) {
    letter = String.fromCharCode((n % 26) + 65) + letter;
    n = Math.floor(n / 26) - 1;
  }
  return letter;
}

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
