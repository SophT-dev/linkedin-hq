// Comment tracking (Option 2) — read-only, DOM-based (no API calls → zero
// rate-limit exposure). Runs ONLY on your own "recent activity › comments" page:
//   linkedin.com/in/<you>/recent-activity/comments/
// It reads the posts you've commented on AND what you wrote, from the page you
// loaded, and sends them to linkedin-hq (MyComments tab). It gently auto-scrolls
// to load your recent ~100 comments. Nothing is written to LinkedIn.
//
// Debug: filter the console for "[BleedCmts]".
(function () {
  "use strict";
  if (!/\/recent-activity\/comments/i.test(location.pathname)) return;

  const TARGET = 100;
  const log = (...a) => console.log("[BleedCmts]", ...a);
  const seen = new Set();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Your own profile slug (from the URL) + display name — used to SKIP your own
  // posts, so comments/replies on your own content aren't counted as outreach.
  const OWN_SLUG = (location.pathname.match(/\/in\/([^/]+)/) || [])[1] || "";
  const OWN_NAME = (document.querySelector("h1")?.innerText || "").trim().toLowerCase();

  function isOwnPost(container, author) {
    // 1) the post author's profile link points at your own profile
    const link = container.querySelector(
      '.update-components-actor__meta a[href*="/in/"], .update-components-actor__container a[href*="/in/"], a.update-components-actor__meta-link[href*="/in/"]'
    );
    const href = link?.getAttribute("href") || "";
    if (OWN_SLUG && href.includes("/in/" + OWN_SLUG)) return true;
    // 2) fallback: post author's display name matches the profile owner
    if (OWN_NAME && author && author.toLowerCase() === OWN_NAME) return true;
    return false;
  }

  function relToMinutes(txt) {
    const m = (txt || "").match(/(\d+)\s*(mo|min|m|h|hr|hour|d|day|w|week|yr|y)/i);
    if (!m) return 0;
    const n = +m[1], u = m[2].toLowerCase();
    if (u === "mo") return n * 43200;
    if (u.startsWith("y")) return n * 525600;
    if (u.startsWith("w")) return n * 10080;
    if (u.startsWith("d")) return n * 1440;
    if (u.startsWith("h")) return n * 60;
    return n;
  }

  // Your comment text on this activity item.
  function myCommentText(container) {
    const sels = [
      ".comments-comment-item__main-content",
      ".comments-comment-entity__main-content",
      ".feed-shared-comment-item__main-content",
      '[class*="comment-item__main-content"]',
      '[class*="comments-comment"][class*="content"]',
      ".update-components-comment__comment-text",
    ];
    for (const s of sels) {
      const t = (container.querySelector(s)?.innerText || "").trim();
      if (t.length > 1) return t.slice(0, 2000);
    }
    return "";
  }

  function harvest() {
    const items = [];
    let ownSkipped = 0;
    document.querySelectorAll('[data-urn*="urn:li:activity"]').forEach((el) => {
      const urn = el.getAttribute("data-urn");
      if (!urn || !urn.includes("activity")) return;
      const url = `https://www.linkedin.com/feed/update/${urn}`;
      if (seen.has(url)) return;
      const container = el.closest('[role="listitem"]') || el;
      const author = (container.querySelector(".update-components-actor__title, .update-components-actor__name")?.innerText || "").split("\n")[0].trim().slice(0, 80);
      if (isOwnPost(container, author)) { seen.add(url); ownSkipped++; return; } // your own post — not outreach
      const sub = container.querySelector(".update-components-actor__sub-description")?.innerText || "";
      const text = myCommentText(container);
      seen.add(url);
      items.push({ url, author, minutesAgo: relToMinutes(sub), text });
    });
    if (ownSkipped) log(`skipped ${ownSkipped} of your own post(s)`);
    if (!items.length) return;
    log(`found ${items.length} new (total ${seen.size}). sample text:`, items[0].text ? `"${items[0].text.slice(0, 60)}…"` : "(no text found — selectors may need tuning)");
    chrome.runtime.sendMessage({ type: "BLEED_CMTS", items }, (resp) => {
      if (chrome.runtime.lastError) log("send failed:", chrome.runtime.lastError.message);
      else log("recorded:", resp && resp.body);
    });
  }

  // Gently auto-scroll to lazy-load your recent comments (human-paced).
  async function autoLoad() {
    await sleep(2500);
    harvest();
    let lastH = 0, stagnant = 0;
    for (let i = 0; i < 60 && seen.size < TARGET; i++) {
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(1300);
      harvest();
      const h = document.body.scrollHeight;
      if (h === lastH) { if (++stagnant >= 3) break; } else stagnant = 0;
      lastH = h;
    }
    log(`auto-load done — ${seen.size} comment(s) captured. Scroll up to read normally.`);
  }

  autoLoad();
})();
