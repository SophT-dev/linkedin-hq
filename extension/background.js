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

// ── Hands-free auto-sync (MV3 chrome.alarms) ───────────────────────────────
// Every 6h, and on demand from the dashboard, we open your OWN LinkedIn profile
// in a background tab, let the content scripts (sync.js) scrape your followers/
// connections, FORCE a POST past the 6h throttle, then close the tab. No manual
// "sync" step ever again. MV3 service workers can't hold long-lived state, so the
// schedule lives in chrome.alarms (survives worker sleep) and the routine below
// is fully self-contained per run.
const AUTO_SYNC_ALARM = "bleed-auto-sync";
const AUTO_SYNC_PERIOD_MIN = 360;          // 6h — matches sync.js's own staleness window
const SYNC_TAB_URL = "https://www.linkedin.com/in/me/"; // resolves to YOUR profile
const SYNC_TAB_TIMEOUT_MS = 15000;         // always close the tab within ~15s
const SYNC_RENDER_DELAY_MS = 3500;         // let the SPA paint the profile card
const SYNC_FORCE_RETRIES = 6;              // content script may not be injected yet
const SYNC_FORCE_RETRY_MS = 1500;

// Open profile → force-sync → close. Resolves once the sync reports back (or the
// hard timeout fires). force:true tells sync.js to POST even if nothing changed,
// so an on-demand "Sync live" always lands a fresh timestamp.
function runBackgroundSync() {
  return new Promise((resolve) => {
    let settled = false;
    const done = (result) => { if (!settled) { settled = true; resolve(result); } };

    chrome.tabs.create({ url: SYNC_TAB_URL, active: false }, (tab) => {
      if (chrome.runtime.lastError || !tab || tab.id == null) {
        return done({ ok: false, error: (chrome.runtime.lastError && chrome.runtime.lastError.message) || "could not open sync tab" });
      }
      const tabId = tab.id;
      let closed = false;
      let started = false;
      let kickTimer = null;

      const finish = (result) => {
        if (closed) return;
        closed = true;
        chrome.tabs.onUpdated.removeListener(onUpdated);
        if (kickTimer) clearTimeout(kickTimer);
        clearTimeout(hardTimer);
        try { chrome.tabs.remove(tabId, () => void chrome.runtime.lastError); } catch (e) { /* tab already gone */ }
        done(result);
      };

      // Safety net: close the tab no matter what within the timeout.
      const hardTimer = setTimeout(() => finish({ ok: false, error: "timeout waiting for LinkedIn" }), SYNC_TAB_TIMEOUT_MS);

      let attempts = 0;
      const tryForce = () => {
        attempts++;
        chrome.tabs.sendMessage(tabId, { type: "BLEED_FORCE_SYNC" }, (resp) => {
          if (chrome.runtime.lastError) {
            // Content script not ready yet (or mid-redirect) — retry a few times.
            if (attempts < SYNC_FORCE_RETRIES) return setTimeout(tryForce, SYNC_FORCE_RETRY_MS);
            return finish({ ok: false, error: "content script never answered" });
          }
          // Any answer means sync.js ran; posted:true is the happy path.
          finish({ ok: resp && resp.posted !== false, resp });
        });
      };

      // /in/me/ 302-redirects to /in/<slug>/, so "complete" can fire more than
      // once; (re)arm a single delayed force each time and only start once.
      const onUpdated = (id, info) => {
        if (id !== tabId || info.status !== "complete") return;
        if (kickTimer) clearTimeout(kickTimer);
        kickTimer = setTimeout(() => { if (!started) { started = true; tryForce(); } }, SYNC_RENDER_DELAY_MS);
      };
      chrome.tabs.onUpdated.addListener(onUpdated);
    });
  });
}

// Register/refresh the 6h alarm on install and on browser startup. Creating an
// alarm with an existing name just replaces it, so this never stacks duplicates.
function ensureAutoSyncAlarm() {
  chrome.alarms.create(AUTO_SYNC_ALARM, { periodInMinutes: AUTO_SYNC_PERIOD_MIN });
}
chrome.runtime.onInstalled.addListener(ensureAutoSyncAlarm);
chrome.runtime.onStartup.addListener(ensureAutoSyncAlarm);
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm && alarm.name === AUTO_SYNC_ALARM) runBackgroundSync();
});

// On-demand sync from the dashboard (relayed by bridge.js). Runs the same
// open-force-close routine and reports completion back so the page can poll.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "BLEED_SYNC_NOW") {
    runBackgroundSync().then((r) => sendResponse(r || { ok: false }));
    return true; // async response
  }
});

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
