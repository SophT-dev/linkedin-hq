/**
 * LinkedIn HQ — Google Sheets Setup Script
 *
 * HOW TO USE:
 * 1. Create a new Google Sheet
 * 2. Extensions → Apps Script → paste this entire file → Run setupLinkedInHQ
 * 3. Copy the Sheet ID from the URL (the long string between /d/ and /edit)
 * 4. Paste it into .env.local as GOOGLE_SHEETS_ID
 */

function setupLinkedInHQ() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setName("LinkedIn HQ — Taha Anwar");

  const tabs = [
    {
      name: "DailyLog",
      headers: ["date", "check_competitors", "commented", "connected", "posted", "logged_analytics", "checked_reddit", "pct_complete"],
      color: "#4f46e5"
    },
    {
      name: "QuickCaptures",
      headers: ["timestamp", "content", "tag", "source", "processed"],
      color: "#7c3aed"
    },
    {
      name: "SwipeFile",
      headers: ["post_text", "url", "creator", "format", "tags", "notes", "date", "starred"],
      color: "#0891b2"
    },
    {
      name: "ContentCalendar",
      headers: ["date", "title", "format", "funnel_stage", "lead_magnet", "status", "post_url", "notes"],
      color: "#059669"
    },
    {
      name: "Creators",
      headers: ["name", "linkedin_url", "niche", "last_post_date", "post_frequency", "primary_format", "notes"],
      color: "#dc2626"
    },
    {
      name: "Sources",
      headers: ["title", "url", "type", "key_insight", "date"],
      color: "#d97706"
    },
    {
      name: "Analytics",
      headers: ["post_title", "date", "impressions", "likes", "comments", "shares", "profile_views", "format", "funnel_stage"],
      color: "#0284c7"
    },
    {
      name: "IdeasBank",
      headers: ["idea", "type", "funnel_stage", "lead_magnet", "status", "hook_score", "date"],
      color: "#7c3aed"
    },
    {
      name: "RedditFlagged",
      headers: ["thread_title", "url", "subreddit", "date", "replied", "notes"],
      color: "#ea580c"
    },
    {
      name: "LeadMagnets",
      headers: ["name", "landing_page_url", "source_post", "clicks", "conversions", "date", "notes"],
      color: "#16a34a"
    },
    {
      name: "Config",
      headers: ["key", "value"],
      color: "#374151"
    },
  ];

  // Remove default Sheet1 if it exists and we'll create all tabs fresh
  const existing = ss.getSheets();

  tabs.forEach((tab, index) => {
    let sheet = ss.getSheetByName(tab.name);
    if (!sheet) {
      if (index === 0 && existing.length === 1 && existing[0].getName() === "Sheet1") {
        sheet = existing[0];
        sheet.setName(tab.name);
      } else {
        sheet = ss.insertSheet(tab.name);
      }
    }

    // Set headers in row 1
    const headerRange = sheet.getRange(1, 1, 1, tab.headers.length);
    headerRange.setValues([tab.headers]);
    headerRange.setFontWeight("bold");
    headerRange.setBackground(tab.color);
    headerRange.setFontColor("#ffffff");

    // Freeze header row
    sheet.setFrozenRows(1);

    // Auto-resize columns
    sheet.autoResizeColumns(1, tab.headers.length);

    // Set tab color
    sheet.setTabColor(tab.color);
  });

  // Add default Config values
  const configSheet = ss.getSheetByName("Config");
  const configData = [
    ["daily_focus", "Build authority, engage with 3 posts, check competitor content"],
    ["strategy_context", "Currently focusing on cold email + AI outreach for B2B founders"],
    ["target_posting_frequency", "5x per week"],
    ["funnel_target_tofu", "50"],
    ["funnel_target_mofu", "35"],
    ["funnel_target_bofu", "15"],
    ["knowledge_doc_url", "https://docs.google.com"],
    ["n8n_webhook_url", ""],
  ];
  configSheet.getRange(2, 1, configData.length, 2).setValues(configData);

  SpreadsheetApp.getUi().alert(
    "Setup Complete!",
    "LinkedIn HQ Google Sheet is ready.\n\n" +
    "Next steps:\n" +
    "1. Copy this Sheet's ID from the URL\n" +
    "2. Create a Google Cloud service account\n" +
    "3. Share this sheet with the service account email\n" +
    "4. Add credentials to .env.local\n\n" +
    "Tabs created: " + tabs.map(t => t.name).join(", "),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}
