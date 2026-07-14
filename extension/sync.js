// Live profile sync (Phase 1) — runs on linkedin.com. Because this script runs
// in the linkedin.com origin, fetch() to LinkedIn's own Voyager API auto-sends
// your logged-in session cookies (we never read or exfiltrate the auth cookie).
// It reads ONLY your follower + connection counts and hands them to the
// background worker, which POSTs them to linkedin-hq. Read-only, throttled to
// once every few hours. Nothing is written to LinkedIn.
//
// Debug: open DevTools (F12) on any linkedin.com tab and filter the console for
// "[BleedSync]" to see exactly what happens each run.
//
// See docs/LIVE-LINKEDIN-DATA-RESEARCH.md for how/why this works + the risks.
(function () {
  "use strict";

  const THROTTLE_MS = 6 * 60 * 60 * 1000; // at most once every 6h
  const V = "https://www.linkedin.com/voyager/api";
  const log = (...a) => console.log("[BleedSync]", ...a);
  const warn = (...a) => console.warn("[BleedSync]", ...a);

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

  // The publicIdentifier / profile urn can live in a few places depending on
  // the decoration. Check them all.
  function extractProfileId(me) {
    if (me?.data?.miniProfile?.publicIdentifier) return me.data.miniProfile.publicIdentifier;
    if (me?.data?.publicIdentifier) return me.data.publicIdentifier;
    for (const x of me?.included || []) {
      if (x && x.publicIdentifier) return x.publicIdentifier;
    }
    // Fall back to the entity urn id (works with networkinfo too).
    const urn = me?.data?.miniProfile?.entityUrn || me?.data?.["*miniProfile"] || me?.data?.entityUrn;
    if (typeof urn === "string") {
      const m = urn.match(/urn:li:fs?_?miniProfile:([^,)]+)/) || urn.match(/([A-Za-z0-9_-]{10,})$/);
      if (m) return m[1];
    }
    return null;
  }

  function firstNum(obj, ...keys) {
    for (const k of keys) if (obj && typeof obj[k] === "number") return obj[k];
    return null;
  }

  // Returns true only if we actually sent numbers (so the throttle isn't set
  // on an empty/failed run — that was silently blocking retries for 6h).
  async function run() {
    const headers = csrfHeaders();
    if (!headers) { warn("no JSESSIONID cookie — are you logged in to LinkedIn in this browser?"); return false; }
    log("session cookie found, calling /me…");

    const me = await voyager("/me", headers);
    const profileId = extractProfileId(me);
    log("profileId:", profileId);
    if (!profileId) { warn("could not extract profileId from /me response:", me); return false; }

    const ni = await voyager(`/identity/profiles/${encodeURIComponent(profileId)}/networkinfo`, headers);
    const src =
      ni?.data && (ni.data.followersCount != null || ni.data.connectionsCount != null)
        ? ni.data
        : (ni?.included || []).find((x) => x && (x.followersCount != null || x.connectionsCount != null)) || ni?.data || {};

    const followers = firstNum(src, "followersCount", "followerCount");
    const connections = firstNum(src, "connectionsCount", "connections");
    log("parsed followers:", followers, "connections:", connections);
    if (followers == null && connections == null) { warn("networkinfo had no counts:", ni); return false; }

    chrome.runtime.sendMessage(
      { type: "BLEED_SYNC", payload: { followers, connections, profileId } },
      (resp) => {
        if (chrome.runtime.lastError) warn("send failed:", chrome.runtime.lastError.message);
        else log("posted to linkedin-hq:", resp);
      }
    );
    return true;
  }

  (async function main() {
    try {
      const KEY = "bleed_last_profile_sync";
      const store = await chrome.storage.local.get(KEY);
      const since = Date.now() - (store[KEY] || 0);
      if (since < THROTTLE_MS) { log(`throttled — last sync ${Math.round(since / 60000)}m ago (<6h). Skipping.`); return; }
      const sent = await run();
      if (sent) await chrome.storage.local.set({ [KEY]: Date.now() });
    } catch (e) {
      warn("sync errored:", e && e.message ? e.message : e);
    }
  })();
})();
