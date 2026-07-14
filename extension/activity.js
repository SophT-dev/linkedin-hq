// Comment tracking (Option 2) — read-only, low-volume, DOM-based.
// Runs ONLY on your own "recent activity › comments" page:
//   linkedin.com/in/<you>/recent-activity/comments/
// It reads the posts you've commented on straight from the page you loaded
// (no extra API calls, so zero rate-limit exposure) and sends them to
// linkedin-hq, which records them in the MyComments tab. That powers the
// commenting-activity heatmap + drops those posts out of the engagement feed.
//
// Nothing is written to LinkedIn. Debug: filter the console for "[BleedCmts]".
(function () {
  "use strict";
  if (!/\/recent-activity\/comments/i.test(location.pathname)) return;

  const log = (...a) => console.log("[BleedCmts]", ...a);
  const seen = new Set();

  function relToMinutes(txt) {
    const m = (txt || "").match(/(\d+)\s*(mo|min|m|h|hr|hour|d|day|w|week|yr|y)/i);
    if (!m) return 0;
    const n = +m[1];
    const u = m[2].toLowerCase();
    if (u === "mo") return n * 43200;
    if (u.startsWith("y")) return n * 525600;
    if (u.startsWith("w")) return n * 10080;
    if (u.startsWith("d")) return n * 1440;
    if (u.startsWith("h")) return n * 60;
    return n; // minutes
  }

  function harvest() {
    const items = [];
    document.querySelectorAll('[data-urn*="urn:li:activity"]').forEach((el) => {
      const urn = el.getAttribute("data-urn");
      if (!urn || !urn.includes("activity")) return;
      const url = `https://www.linkedin.com/feed/update/${urn}`;
      if (seen.has(url)) return;
      const container = el.closest('[role="listitem"]') || el;
      const author = (container.querySelector(".update-components-actor__title, .update-components-actor__name")?.innerText || "").split("\n")[0].trim().slice(0, 80);
      const sub = container.querySelector(".update-components-actor__sub-description")?.innerText || "";
      seen.add(url);
      items.push({ url, author, minutesAgo: relToMinutes(sub) });
    });
    if (!items.length) return;
    log(`found ${items.length} commented post(s), sending…`);
    chrome.runtime.sendMessage({ type: "BLEED_CMTS", items }, (resp) => {
      if (chrome.runtime.lastError) log("send failed:", chrome.runtime.lastError.message);
      else log("recorded:", resp);
    });
  }

  // Harvest after the SPA renders, then again as you scroll (server dedupes).
  setTimeout(harvest, 3000);
  let t = null;
  window.addEventListener("scroll", () => {
    if (t) return;
    t = setTimeout(() => { t = null; harvest(); }, 2000);
  }, { passive: true });
})();
