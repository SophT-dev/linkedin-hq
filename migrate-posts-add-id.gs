/**
 * One-time migration — add `id` column to the Posts tab.
 *
 * Run this ONCE on your LinkedIn HQ Google Sheet before re-running
 * setup-v2.gs for v2 lead-magnet-builder compatibility.
 *
 * What it does:
 *   1. Inserts a new column at position A in the Posts tab.
 *   2. Sets the header cell A1 to "id".
 *   3. Backfills every existing row with a random 10-char alphanumeric id.
 *
 * After this migration the Posts schema becomes:
 *   id | batch_date | hook | body | format | funnel_stage | visual_brief |
 *   lead_magnet | sources_used | authenticity_tag | status
 *
 * Safe to re-run: if the Posts tab already has an "id" column at position A,
 * it skips the insert and only backfills any rows that still have an empty id.
 *
 * HOW TO USE:
 *   1. Open the LinkedIn HQ Google Sheet.
 *   2. Extensions → Apps Script.
 *   3. Paste this entire file (in its own script file, or alongside setup-v2).
 *   4. Save, then run `migratePostsAddId` from the toolbar.
 *   5. Authorize when prompted.
 */

function migratePostsAddId() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  var sheet = ss.getSheetByName("Posts");

  if (!sheet) {
    ui.alert("No Posts tab found. Nothing to migrate.");
    return;
  }

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  // Case 1: empty tab. Just write headers and return.
  if (lastRow === 0) {
    sheet.getRange(1, 1, 1, 11).setValues([[
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
    ]]);
    sheet.setFrozenRows(1);
    ui.alert("Posts tab was empty. Wrote v2 headers with id column.");
    return;
  }

  // Case 2: the existing header row already starts with "id".
  // Just backfill any rows that have an empty id cell.
  var firstHeaderCell = String(sheet.getRange(1, 1).getValue()).trim().toLowerCase();
  if (firstHeaderCell === "id") {
    var backfilled = backfillEmptyIds(sheet, lastRow);
    ui.alert("Posts tab already has `id` column. Backfilled " + backfilled + " row(s) with missing ids.");
    return;
  }

  // Case 3: the real migration. Existing v1 schema is
  //   batch_date | hook | body | ...
  // Insert a new column at position A, write the header, backfill ids.
  var confirmed = ui.alert(
    "Add `id` column to Posts?",
    "This will insert a new column at position A in the Posts tab and " +
      "generate a unique id for each of the " + (lastRow - 1) + " existing row(s). " +
      "Safe to run — existing data is NOT deleted.\n\nProceed?",
    ui.ButtonSet.OK_CANCEL
  );
  if (confirmed !== ui.Button.OK) {
    ui.alert("Cancelled. No changes made.");
    return;
  }

  sheet.insertColumnBefore(1);
  sheet.getRange(1, 1).setValue("id").setFontWeight("bold").setBackground("#0d0608").setFontColor("#ffffff");

  var dataRows = lastRow - 1;
  if (dataRows > 0) {
    var ids = [];
    for (var i = 0; i < dataRows; i++) {
      ids.push([genId()]);
    }
    sheet.getRange(2, 1, dataRows, 1).setValues(ids);
  }

  sheet.setFrozenRows(1);
  ui.alert(
    "Migration complete.\n\n" +
      "Inserted `id` column at position A.\n" +
      "Backfilled " + dataRows + " existing row(s) with unique ids.\n\n" +
      "You can now re-run setupV2 to confirm the LeadMagnets tab is in place."
  );
}

// Backfills any empty id cells in rows 2..lastRow. Used when the migration
// is re-run and the id column already exists.
function backfillEmptyIds(sheet, lastRow) {
  if (lastRow <= 1) return 0;
  var range = sheet.getRange(2, 1, lastRow - 1, 1);
  var values = range.getValues();
  var count = 0;
  for (var i = 0; i < values.length; i++) {
    if (!values[i][0]) {
      values[i][0] = genId();
      count++;
    }
  }
  if (count > 0) range.setValues(values);
  return count;
}

// 10-char alphanumeric id. Not a real nanoid (GAS has no nanoid package)
// but the same collision space for our row counts (billions of combos).
function genId() {
  var chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  var out = "";
  for (var i = 0; i < 10; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}
