/**
 * LinkedIn HQ v2 — one-click sheet cleanup + setup
 *
 * What this does:
 *   1. Creates `WinsLog` tab with headers (if missing)
 *   2. Creates `Posts` tab with headers (if missing)
 *   3. Leaves `Intel` and `Config` alone (already set up)
 *   4. Deletes legacy tabs no longer used by /batch or /news:
 *      DailyLog, QuickCaptures, SwipeFile, ContentCalendar, Creators,
 *      Sources, Analytics, IdeasBank, RedditFlagged, LeadMagnets
 *
 * Safe to re-run. Will skip anything that's already correct.
 *
 * HOW TO USE:
 *   1. Open the LinkedIn HQ Google Sheet
 *   2. Extensions → Apps Script
 *   3. Paste this entire file
 *   4. Run setupV2 from the toolbar
 *   5. Authorize when prompted
 *   6. Confirm the destructive delete when the dialog appears
 *
 * If any of the legacy tabs has data you want to keep, EXPORT IT FIRST
 * before running this. There is no undo.
 */

var KEEP_TABS = ["Intel", "Config", "WinsLog", "Posts", "LeadMagnets"];

// Legacy v1 tabs to delete on first setup. LeadMagnets was in this list
// originally but is now a v2 tab for the lead magnet build pipeline, so
// it is no longer deleted.
var LEGACY_TABS_TO_DELETE = [
  "DailyLog",
  "QuickCaptures",
  "SwipeFile",
  "ContentCalendar",
  "Creators",
  "Sources",
  "Analytics",
  "IdeasBank",
  "RedditFlagged",
];

var WINSLOG_HEADERS = [
  "date",
  "client",
  "campaign",
  "what_we_did",
  "result",
  "lesson",
  "tags",
];

// Pre-seed wins pulled from upwork proposal/CLAUDE.md → "Campaign Results"
// section. These are Taha's real Bleed AI portfolio results. The seed only
// runs if WinsLog is empty (so re-running setupV2 won't duplicate rows).
var WINSLOG_SEED = [
  [
    "2026-01-15",
    "IT Services client",
    "cold outreach to a small TAM",
    "ran a tightly targeted cold email sequence into a niche IT services TAM with cleaned lists, 130+ warmed inboxes, and a deliverability-first setup",
    "$106K pipeline, 16 opportunities, 2.4% reply rate",
    "small TAMs still produce serious pipeline when deliverability and targeting are dialed in. reply rate looks low but the opps-per-send ratio is what matters",
    "deliverability, small TAM, IT services, pipeline, 2.4% reply rate"
  ],
  [
    "2026-01-20",
    "Coaching client",
    "cold email funnel for a coaching offer",
    "wrote and sent 14,000+ sequenced cold emails using clay enrichment and apollo-sourced lists, with reply handling and crm sync",
    "241 opportunities, 32% positive reply rate",
    "high positive reply rate comes from a clear ICP plus an offer that maps to a real pain. 14k sequences is a volume number, not a vanity metric",
    "coaching, positive reply rate, clay, apollo, sequences"
  ],
  [
    "2026-02-05",
    "SaaS Trial client",
    "trial sign-up campaign for a saas product",
    "ran a 10-day cold campaign focused on getting trial sign-ups, using personalized first lines tied to a specific buying signal",
    "$42K pipeline in 10 days, 12% reply rate, 39% positive reply rate",
    "you can compress a quarter of pipeline into 10 days when the offer is a free trial and the sequence asks for a tiny commitment",
    "saas, trial, fast pipeline, 12% reply rate"
  ],
  [
    "2026-02-15",
    "Tech startup client",
    "cold outbound for a technical buyer audience",
    "tightened the icp, rewrote the sequence to lead with a contrarian technical insight, and matched copy to the buyer's actual stack",
    "55%+ positive reply rate",
    "technical buyers reply at insane rates when you skip the fluff and lead with something that proves you understand their stack",
    "tech, technical buyers, positive reply rate, niche insight"
  ],
  [
    "2026-02-25",
    "EU client",
    "high-volume monthly cold email program",
    "stood up infrastructure for 50,000+ emails per month with 130+ warmed inboxes, eu-compliant sending domains, and continuous deliverability monitoring via mxtoolbox and google postmaster tools",
    "2%+ reply rate, 63%+ positive reply rate",
    "high-volume programs only survive if deliverability is the foundation, not an afterthought. positive reply rate at this scale comes from infrastructure not copy",
    "eu, high volume, deliverability, infrastructure, 50k emails"
  ],
  [
    "2025-12-15",
    "various clients",
    "december 2025 baseline (worst month historically)",
    "kept the cold email engine running through what is normally the worst month of the year for outbound, with conservative volume and tighter targeting",
    "90+ opportunities in december",
    "december is brutal for outbound but you can still pull 90+ opps if you don't pause and don't blast. seasonality is real, but so is consistency",
    "december, seasonality, baseline, consistency"
  ],
  [
    "2026-01-10",
    "Recruitment client",
    "cold outbound for a recruiting agency",
    "led with industry knowledge instead of numbers, built lists with apollo and clay, kept volume low and targeting tight",
    "consistent positive replies from hiring decision-makers",
    "recruitment buyers do not care about your reply rate stats. they care that you understand their candidate pipeline pain. lead with insight, not numbers",
    "recruitment, industry knowledge, hiring, insight-led"
  ],
];

// v2 Posts schema — `id` column (nanoid) added at position A on 2026-04-13
// so the lead magnet builder can target specific rows after publish. If
// you're running this on a sheet that already has the old 10-column Posts
// tab, run migrate-posts-add-id.gs FIRST to add the id column and
// backfill existing rows.
var POSTS_HEADERS = [
  "id",
  "batch_date",
  "hook",
  "body",
  "format",
  "funnel_stage",
  "visual_brief",
  "lead_magnet",
  "sources_used",
  "authenticity_tag",
  "status",
];

// v2 LeadMagnets tab — tracks each lead magnet build from research
// through publish. The linkedin-batch Claude skill writes rows here
// and the public /lead-magnet/<slug> landing page reads from here.
var LEAD_MAGNETS_HEADERS = [
  "id",
  "post_id",
  "slug",
  "status",       // researching | outline_ready | body_ready | published | error
  "title",
  "hero_text",
  "value_props",  // JSON array of strings
  "cta_text",
  "outline_md",
  "body_md",
  "notion_url",
  "landing_url",
  "gif_url",
  "created_at",
  "clicks",
  "conversions",
];

// v2 auto-comment feature — instead of a separate Comments tab, we add
// 4 columns to the existing Intel tab so each LinkedIn post row carries
// its own comment state. setup-v2 ensures these columns exist on the
// right side of the Intel tab without touching existing data.
var INTEL_COMMENT_COLUMNS = [
  "comment_text",
  "comment_status",       // draft | quality_failed | posted | post_failed | deleted
  "comment_posted_at",
  "comment_style",        // agree_add | contrarian | sharp_question | bts_story | tactical_tip
];

// Default Config rows for the auto-comment feature. Seeded only if the
// keys don't already exist in the Config tab.
var COMMENTS_CONFIG_DEFAULTS = [
  ["comments_daily_cap", "5"],
  ["comments_min_engagement", "0"],
];

function setupV2() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();

  // Step 1 — confirm destructive delete
  var existingLegacy = LEGACY_TABS_TO_DELETE.filter(function (name) {
    return ss.getSheetByName(name) !== null;
  });

  if (existingLegacy.length > 0) {
    var msg =
      "About to DELETE these tabs (any data inside is gone forever):\n\n  " +
      existingLegacy.join("\n  ") +
      "\n\nProceed?";
    var resp = ui.alert("Delete legacy tabs?", msg, ui.ButtonSet.OK_CANCEL);
    if (resp !== ui.Button.OK) {
      ui.alert("Cancelled. No tabs were deleted.");
      return;
    }
  }

  // Step 2 — make sure WinsLog, Posts, and LeadMagnets exist BEFORE
  // deleting anything, so the sheet always has at least one tab.
  ensureTab(ss, "WinsLog", WINSLOG_HEADERS);
  ensureTab(ss, "Posts", POSTS_HEADERS);
  ensureTab(ss, "LeadMagnets", LEAD_MAGNETS_HEADERS);

  // Extend the existing Intel tab with the 4 auto-comment columns
  // without touching existing rows. Old rows just have empty cells in
  // the new columns, which the auto-comment loop reads as "not yet
  // commented" and is free to comment on.
  ensureColumns(ss, "Intel", INTEL_COMMENT_COLUMNS);

  // Seed the auto-comment Config keys if not already present.
  ensureConfigKeys(ss, COMMENTS_CONFIG_DEFAULTS);

  // Pre-seed WinsLog with portfolio wins ONLY if it's currently empty
  // (only header row exists). Re-running setupV2 won't duplicate.
  var winsSheet = ss.getSheetByName("WinsLog");
  if (winsSheet && winsSheet.getLastRow() <= 1) {
    winsSheet
      .getRange(2, 1, WINSLOG_SEED.length, WINSLOG_HEADERS.length)
      .setValues(WINSLOG_SEED);
  }

  // Step 3 — delete legacy tabs
  var deleted = 0;
  for (var i = 0; i < existingLegacy.length; i++) {
    var sheet = ss.getSheetByName(existingLegacy[i]);
    if (sheet) {
      ss.deleteSheet(sheet);
      deleted++;
    }
  }

  ui.alert(
    "Setup complete.\n\n" +
      "Created (or kept): WinsLog, Posts, LeadMagnets\n" +
      "Extended: Intel tab now has 4 comment columns on the right\n" +
      "Kept as-is: Config (with comments_daily_cap + comments_min_engagement seeded)\n" +
      "Deleted: " +
      deleted +
      " legacy tab(s)\n\n" +
      "WinsLog seeded with " +
      WINSLOG_SEED.length +
      " portfolio wins.\n\n" +
      "Batch generation runs in the linkedin-batch Claude Code skill.\n" +
      "Auto-commenting on scraped LinkedIn posts runs in the n8n creator feed workflow."
  );
}

// Adds new columns to the right side of an existing tab if they don't
// already exist. Looks at the header row and appends any missing column
// names. Existing data rows are untouched — new columns just have empty
// cells until something writes to them.
function ensureColumns(ss, tabName, columnNames) {
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) return; // tab doesn't exist, nothing to extend

  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) {
    // Empty sheet — write headers starting at column A
    sheet
      .getRange(1, 1, 1, columnNames.length)
      .setValues([columnNames])
      .setFontWeight("bold")
      .setBackground("#0d0608")
      .setFontColor("#ffffff");
    sheet.setFrozenRows(1);
    return;
  }

  var existingHeaders = sheet
    .getRange(1, 1, 1, lastCol)
    .getValues()[0]
    .map(function (h) {
      return String(h || "").trim();
    });

  var missing = [];
  for (var i = 0; i < columnNames.length; i++) {
    if (existingHeaders.indexOf(columnNames[i]) === -1) {
      missing.push(columnNames[i]);
    }
  }

  if (missing.length === 0) return;

  var startCol = lastCol + 1;
  sheet
    .getRange(1, startCol, 1, missing.length)
    .setValues([missing])
    .setFontWeight("bold")
    .setBackground("#0d0608")
    .setFontColor("#ffffff");
}

// Seeds key/value rows in the Config tab without overwriting existing values.
// Used by setupV2 to add new feature config keys (e.g. comments_daily_cap)
// when the feature is first enabled.
function ensureConfigKeys(ss, keyValuePairs) {
  var sheet = ss.getSheetByName("Config");
  if (!sheet) return;

  var lastRow = sheet.getLastRow();
  var existingKeys = {};
  if (lastRow >= 2) {
    var existing = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < existing.length; i++) {
      if (existing[i][0]) existingKeys[existing[i][0]] = true;
    }
  }

  var rowsToAdd = [];
  for (var j = 0; j < keyValuePairs.length; j++) {
    var key = keyValuePairs[j][0];
    var val = keyValuePairs[j][1];
    if (!existingKeys[key]) {
      rowsToAdd.push([key, val]);
    }
  }

  if (rowsToAdd.length === 0) return;

  var startRow = lastRow + 1;
  sheet.getRange(startRow, 1, rowsToAdd.length, 2).setValues(rowsToAdd);
}

function ensureTab(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }

  // Check whether headers already match
  var firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  var matches = true;
  for (var i = 0; i < headers.length; i++) {
    if (firstRow[i] !== headers[i]) {
      matches = false;
      break;
    }
  }

  if (matches) return;

  // Write headers
  sheet
    .getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight("bold")
    .setBackground("#0d0608")
    .setFontColor("#ffffff");
  sheet.setFrozenRows(1);
}
