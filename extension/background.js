// Background service worker. It does the actual network call to the suggest
// endpoint. Doing the fetch HERE (not in the content script) is the correct
// MV3 pattern — the service worker has host_permissions and bypasses CORS, so
// no CORS headers are needed on the Next.js route.
//
// CONFIG — the only thing you ever edit:
//   API_BASE      where linkedin-hq is deployed. Use localhost for testing.
//   SUGGEST_TOKEN must match SUGGEST_TOKEN in the linkedin-hq Vercel env.
//                 Leave "" only if the server has no SUGGEST_TOKEN set.
const CONFIG = {
  API_BASE: "https://linkedin-hq.vercel.app",
  SUGGEST_TOKEN: "3088768ac5a002b7e72a6955a52fa07c1d5704addc143516",
  // Must match LINKEDIN_SYNC_TOKEN in the linkedin-hq Vercel env (Phase 1
  // live profile sync). Only guards a write of your own follower/connection
  // counts into the Sheet.
  SYNC_TOKEN: "00f67e0bca88b956d2e661a8925803281822ad3ddcca02cc",
};

// Live profile sync — receives {followers, connections} read by sync.js from
// LinkedIn's Voyager API (in the linkedin.com tab) and forwards them to
// linkedin-hq. Doing the cross-origin POST here (not in the content script) is
// the correct MV3 pattern: the worker has host_permissions and bypasses CORS.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "BLEED_SYNC") {
    const headers = { "Content-Type": "application/json" };
    if (CONFIG.SYNC_TOKEN) headers["x-sync-token"] = CONFIG.SYNC_TOKEN;
    fetch(`${CONFIG.API_BASE}/api/linkedin/sync`, {
      method: "POST",
      headers,
      body: JSON.stringify(msg.payload || {}),
    })
      .then(async (r) => sendResponse({ ok: r.ok, status: r.status }))
      .catch((e) => sendResponse({ ok: false, error: String((e && e.message) || e) }));
    return true; // async response
  }

  // Prime the skip-list: activity.js asks for the post URLs already saved so it
  // doesn't re-scrape/re-send them (server also dedups on write — belt & braces).
  if (msg && msg.type === "BLEED_CMTS_KNOWN") {
    fetch(`${CONFIG.API_BASE}/api/linkedin/comments-activity`, { method: "GET" })
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        sendResponse({ ok: r.ok, urls: (data && data.urls) || [] });
      })
      .catch((e) => sendResponse({ ok: false, urls: [], error: String((e && e.message) || e) }));
    return true;
  }

  // Your own comments harvested by activity.js → MyComments tab.
  if (msg && msg.type === "BLEED_CMTS") {
    const headers = { "Content-Type": "application/json" };
    if (CONFIG.SYNC_TOKEN) headers["x-sync-token"] = CONFIG.SYNC_TOKEN;
    fetch(`${CONFIG.API_BASE}/api/linkedin/comments-activity`, {
      method: "POST",
      headers,
      body: JSON.stringify({ items: msg.items || [] }),
    })
      .then(async (r) => sendResponse({ ok: r.ok, status: r.status, body: await r.json().catch(() => null) }))
      .catch((e) => sendResponse({ ok: false, error: String((e && e.message) || e) }));
    return true;
  }
});

// -- Toolbar icon click = "sync THIS page now" ------------------------------
// Clicking the extension icon force-reads whatever stats are on the current
// LinkedIn tab (bypassing the 6h throttle) and flashes a badge as feedback.
function flashBadge(text, color, title) {
  chrome.action.setBadgeText({ text });
  if (color) chrome.action.setBadgeBackgroundColor({ color });
  if (title) chrome.action.setTitle({ title });
  if (text) setTimeout(() => chrome.action.setBadgeText({ text: "" }), 3500);
}

chrome.action.onClicked.addListener((tab) => {
  if (!tab || !tab.id || !/^https:\/\/www\.linkedin\.com\//.test(tab.url || "")) {
    flashBadge("!", "#d97706", "Bleed AI — open a LinkedIn tab, then click to sync.");
    return;
  }
  flashBadge("•", "#2f6fed", "Bleed AI — syncing this page…");
  chrome.tabs.sendMessage(tab.id, { type: "BLEED_FORCE_SYNC" }, (resp) => {
    if (chrome.runtime.lastError) {
      // Content script not injected yet (tab predates the extension load).
      flashBadge("↻", "#d97706", "Bleed AI — reload this LinkedIn tab, then click again.");
      return;
    }
    if (resp && resp.posted) {
      flashBadge("✓", "#16a34a", `Bleed AI — synced ${resp.fields || "stats"} just now.`);
    } else if (resp && resp.found === 0) {
      flashBadge("–", "#d97706", "Bleed AI — nothing to sync here. Open your feed or profile.");
    } else if (resp && resp.error) {
      flashBadge("!", "#dc2626", `Bleed AI — sync failed: ${resp.error}`);
    } else {
      flashBadge("✓", "#16a34a", "Bleed AI — synced.");
    }
  });
});

// ⭐ Favorite a feed post — content.js scrapes a LinkedIn post Sophiya starred
// and forwards it here; we POST it to linkedin-hq, which appends a starred
// Template Library row (token-guarded, same x-sync-token as the stats sync).
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "BLEED_FAVORITE") {
    const headers = { "Content-Type": "application/json" };
    if (CONFIG.SYNC_TOKEN) headers["x-sync-token"] = CONFIG.SYNC_TOKEN;
    fetch(`${CONFIG.API_BASE}/api/posts/favorite`, {
      method: "POST",
      headers,
      body: JSON.stringify(msg.payload || {}),
    })
      .then(async (r) => sendResponse({ ok: r.ok, status: r.status, body: await r.json().catch(() => null) }))
      .catch((e) => sendResponse({ ok: false, error: String((e && e.message) || e) }));
    return true; // async response
  }

  // Prime the skip-list: content.js asks for the post URLs already starred so
  // it renders those stars pre-filled (server also dedups on write).
  if (msg && msg.type === "BLEED_FAVS_KNOWN") {
    fetch(`${CONFIG.API_BASE}/api/posts/favorite`, { method: "GET" })
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        sendResponse({ ok: r.ok, urls: (data && data.urls) || [] });
      })
      .catch((e) => sendResponse({ ok: false, urls: [], error: String((e && e.message) || e) }));
    return true;
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "BLEED_SUGGEST") {
    const headers = { "Content-Type": "application/json" };
    if (CONFIG.SUGGEST_TOKEN) headers["x-suggest-token"] = CONFIG.SUGGEST_TOKEN;

    fetch(`${CONFIG.API_BASE}/api/comments/suggest`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        postText: msg.postText,
        creatorName: msg.creatorName || "",
      }),
    })
      .then(async (r) => {
        if (!r.ok) {
          const t = await r.text();
          sendResponse({ ok: false, error: `${r.status}: ${t.slice(0, 180)}` });
          return;
        }
        const data = await r.json();
        sendResponse({ ok: true, suggestions: data.suggestions || [] });
      })
      .catch((e) => sendResponse({ ok: false, error: String(e && e.message || e) }));

    return true; // keep the message channel open for the async sendResponse
  }
});
