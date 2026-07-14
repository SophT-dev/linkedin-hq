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
