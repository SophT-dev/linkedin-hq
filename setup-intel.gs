/**
 * LinkedIn HQ — Intel tab installer (idempotent + auto-migrate)
 *
 * Adds or migrates the `Intel` tab in your LinkedIn HQ Google Sheet.
 * Safe to re-run. If the existing schema is older it will prompt you
 * before clearing the rows so it can rewrite the headers.
 *
 * HOW TO USE:
 * 1. Open the existing LinkedIn HQ sheet (the one in GOOGLE_SHEETS_ID)
 * 2. Extensions → Apps Script
 * 3. Paste this entire file → Run setupIntelTab
 * 4. Authorize when prompted, accept the migration if it asks
 */

var INTEL_HEADERS = [
  "pulled_at",   // when WE fetched it (ISO)
  "posted_at",   // when the post was originally created (ISO, may be empty)
  "type",        // linkedin | reddit | news
  "source",      // subreddit / domain / publisher
  "title",
  "url",
  "summary",
  "score",       // upvotes for reddit, 0 for news
  "starred",     // TRUE / FALSE
];

function setupIntelTab() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  var tabName = "Intel";
  var sheet = ss.getSheetByName(tabName);

  if (!sheet) {
    sheet = ss.insertSheet(tabName);
    writeHeaders(sheet);
    ui.alert("Intel tab created with the new schema.");
    return;
  }

  // Tab exists — check whether the header matches the new schema.
  var headerRange = sheet.getRange(1, 1, 1, INTEL_HEADERS.length);
  var current = headerRange.getValues()[0];
  var matches = true;
  for (var i = 0; i < INTEL_HEADERS.length; i++) {
    if (current[i] !== INTEL_HEADERS[i]) {
      matches = false;
      break;
    }
  }

  if (matches) {
    ui.alert("Intel tab is already on the latest schema. Nothing to do.");
    return;
  }

  var lastRow = sheet.getLastRow();
  var dataRows = lastRow > 1 ? lastRow - 1 : 0;
  var msg =
    "The Intel tab has an older schema. To migrate it I will clear " +
    dataRows +
    " existing data row(s) and rewrite the headers. Continue?";
  var resp = ui.alert("Migrate Intel tab", msg, ui.ButtonSet.OK_CANCEL);
  if (resp !== ui.Button.OK) {
    ui.alert("Cancelled. No changes made.");
    return;
  }

  sheet.clear();
  writeHeaders(sheet);
  ui.alert("Intel tab migrated to the new schema. You can refresh /news now.");
}

function writeHeaders(sheet) {
  sheet
    .getRange(1, 1, 1, INTEL_HEADERS.length)
    .setValues([INTEL_HEADERS])
    .setFontWeight("bold")
    .setBackground("#0d0608")
    .setFontColor("#ffffff");
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 160); // pulled_at
  sheet.setColumnWidth(2, 160); // posted_at
  sheet.setColumnWidth(3, 90);  // type
  sheet.setColumnWidth(4, 160); // source
  sheet.setColumnWidth(5, 360); // title
  sheet.setColumnWidth(6, 320); // url
  sheet.setColumnWidth(7, 480); // summary
  sheet.setColumnWidth(8, 70);  // score
  sheet.setColumnWidth(9, 80);  // starred
}
