// Live profile sync (Phase 1) — runs on linkedin.com. Because this script runs
// in the linkedin.com origin, fetch() to LinkedIn's own Voyager API auto-sends
// your logged-in session cookies (we never read or exfiltrate the auth cookie).
// It reads ONLY your follower + connection counts and hands them to the
// background worker, which POSTs them to linkedin-hq. Read-only, throttled to
// once every few hours. Nothing is written to LinkedIn.
//
// See docs/LIVE-LINKEDIN-DATA-RESEARCH.md for how/why this works + the risks.
(function () {
  "use strict";

  const THROTTLE_MS = 6 * 60 * 60 * 1000; // at most once every 6h
  const V = "https://www.linkedin.com/voyager/api";

  function csrfHeaders() {
    const m = document.cookie.match(/JSESSIONID="?([^;"]+)"?/);
    if (!m) return null;
    return {
      "csrf-token": m[1],
      "x-restli-protocol-version": "2.0.0",
      "accept": "application/vnd.linkedin.normalized+json+2.1",
    };
  }

  async function voyager(path, headers) {
    const res = await fetch(V + path, { credentials: "include", headers });
    if (!res.ok) throw new Error(`voyager ${path} -> ${res.status}`);
    return res.json();
  }

  // /me returns a normalized object; the publicIdentifier is on the miniProfile,
  // which may be inline or in the `included` array. Check both.
  function extractPublicId(me) {
    if (me?.data?.miniProfile?.publicIdentifier) return me.data.miniProfile.publicIdentifier;
    if (me?.data?.publicIdentifier) return me.data.publicIdentifier;
    for (const x of me?.included || []) {
      if (x && x.publicIdentifier) return x.publicIdentifier;
    }
    return null;
  }

  function pick(obj, ...keys) {
    for (const k of keys) {
      if (obj && typeof obj[k] === "number") return obj[k];
    }
    return null;
  }

  async function run() {
    const headers = csrfHeaders();
    if (!headers) return; // not logged in / no session cookie

    const me = await voyager("/me", headers);
    const publicId = extractPublicId(me);
    if (!publicId) return;

    const ni = await voyager(`/identity/profiles/${encodeURIComponent(publicId)}/networkinfo`, headers);
    // followers/connections live on data, or on the first `included` entry.
    const src = ni?.data && (ni.data.followersCount != null || ni.data.connectionsCount != null)
      ? ni.data
      : (ni?.included || []).find((x) => x && (x.followersCount != null || x.connectionsCount != null)) || ni?.data || {};

    const followers = pick(src, "followersCount", "followerCount");
    const connections = pick(src, "connectionsCount", "connections");
    if (followers == null && connections == null) return;

    chrome.runtime.sendMessage(
      { type: "BLEED_SYNC", payload: { followers, connections, publicId } },
      () => void chrome.runtime.lastError // swallow "no receiver" noise
    );
  }

  (async function main() {
    try {
      const KEY = "bleed_last_profile_sync";
      const store = await chrome.storage.local.get(KEY);
      if (Date.now() - (store[KEY] || 0) < THROTTLE_MS) return;
      await run();
      await chrome.storage.local.set({ [KEY]: Date.now() });
    } catch (_e) {
      // Silent — a failed sync should never disrupt the LinkedIn page.
    }
  })();
})();
