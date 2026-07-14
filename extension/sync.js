// Live profile sync (Phase 1) — runs on linkedin.com. Reads ONLY your own
// follower + connection counts and hands them to the background worker, which
// POSTs them to linkedin-hq. Read-only; nothing is written to LinkedIn.
//
// LinkedIn deprecated the clean Voyager `/networkinfo` REST endpoint (returns
// 410 as of 2025). So the reliable method now is AuthoredUp-style: read the
// numbers off your own profile page's DOM. We still try a modern API call first
// as a bonus (it gives the EXACT connection count, which the DOM caps at 500+).
//
// Debug: open DevTools (F12) on linkedin.com and filter the console for
// "[BleedSync]". See docs/LIVE-LINKEDIN-DATA-RESEARCH.md for how/why + risks.
(function () {
  "use strict";

  const THROTTLE_MS = 6 * 60 * 60 * 1000; // at most once every 6h (low-volume, LinkedIn-safe)
  const V = "https://www.linkedin.com/voyager/api";
  const log = (...a) => console.log("[BleedSync]", ...a);
  const warn = (...a) => console.warn("[BleedSync]", ...a);

  function csrfHeaders() {
    const m = document.cookie.match(/JSESSIONID="?([^;"]+)"?/);
    if (!m) return null;
    return { "csrf-token": m[1], "x-restli-protocol-version": "2.0.0", "accept": "application/vnd.linkedin.normalized+json+2.1" };
  }

  async function meProfileId(headers) {
    try {
      const res = await fetch(V + "/me", { credentials: "include", headers });
      if (!res.ok) throw new Error(`/me -> ${res.status}`);
      const me = await res.json();
      if (me?.data?.miniProfile?.publicIdentifier) return me.data.miniProfile.publicIdentifier;
      if (me?.data?.publicIdentifier) return me.data.publicIdentifier;
      for (const x of me?.included || []) if (x && x.publicIdentifier) return x.publicIdentifier;
    } catch (e) { warn("/me failed:", e.message); }
    return null;
  }

  function parseHuman(s) {
    if (s == null) return null;
    const t = ("" + s).replace(/,/g, "").trim();
    const m = t.match(/^([\d.]+)\s*([KMB]?)/i);
    if (!m) return null;
    let v = parseFloat(m[1]);
    const u = (m[2] || "").toUpperCase();
    if (u === "K") v *= 1e3; else if (u === "M") v *= 1e6; else if (u === "B") v *= 1e9;
    return Math.round(v);
  }

  // Bonus: exact connection count via the still-live relationships dash endpoint.
  async function exactConnections(headers) {
    try {
      const res = await fetch(V + "/relationships/dash/connections?q=search&start=0&count=0", { credentials: "include", headers });
      if (!res.ok) return null;
      const j = await res.json();
      const total = j?.data?.paging?.total ?? j?.paging?.total;
      return typeof total === "number" ? total : null;
    } catch { return null; }
  }

  // Collect the text of leaf elements whose whole text is "<n> followers" /
  // "<n> connections" — far more precise than scanning all of main's innerText
  // (which would also match "People also viewed" cards further down the page).
  function leafMatches(re) {
    const main = document.querySelector("main") || document.body;
    const out = [];
    main.querySelectorAll("span,div,li,a,strong,p,h2").forEach((el) => {
      if (el.children.length > 0) return; // leaf nodes only
      const t = (el.textContent || "").replace(/\s+/g, " ").trim();
      const m = t.match(re);
      if (m) out.push(m[1]);
    });
    return out;
  }

  // Read follower + connection counts from your OWN profile page's DOM.
  function domCounts(profileId) {
    const slug = (location.pathname.split("/in/")[1] || "").replace(/\/.*/, "");
    if (!slug) { log("not on a profile page — open linkedin.com/in/" + (profileId || "you") + " to sync via the page."); return null; }
    if (profileId && slug !== profileId) { log("on someone else's profile (" + slug + "), skipping."); return null; }

    const fRaw = leafMatches(/^([\d.,]+[KMB]?)\s*followers?$/i).map(parseHuman).filter((n) => n != null);
    const cRaw = leafMatches(/^([\d,]+\+?)\s*connections?$/i);
    log("follower candidates:", fRaw, "| connection candidates:", cRaw);

    // Prefer the EXACT follower count (never a round hundred) over LinkedIn's
    // rounded header number (e.g. 6795 over 6800).
    const followers = fRaw.find((n) => n % 100 !== 0) ?? fRaw[0] ?? null;
    // Prefer an exact connection number over the capped "500+".
    const cExact = cRaw.find((s) => !s.includes("+"));
    const connections = ((cExact || cRaw[0] || "").replace(/,/g, "")) || null; // may stay "500+"

    if (followers == null && connections == null) return null;
    return { followers, connections };
  }

  async function run() {
    const headers = csrfHeaders();
    if (!headers) { warn("no JSESSIONID cookie — log in to LinkedIn in this browser."); return false; }

    const profileId = await meProfileId(headers);
    log("profileId:", profileId);

    const dom = domCounts(profileId);
    if (!dom) { log("no counts read this page. (Sync happens on your own profile page.)"); return false; }

    // Upgrade the capped "500+" DOM connections to the exact number if we can.
    let connections = dom.connections;
    if (typeof connections === "string" && connections.includes("+")) {
      const exact = await exactConnections(headers);
      if (exact != null) connections = exact;
    }

    log("sending followers:", dom.followers, "connections:", connections);
    chrome.runtime.sendMessage(
      { type: "BLEED_SYNC", payload: { followers: dom.followers, connections, profileId } },
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
      if (since < THROTTLE_MS) { log(`throttled — last sync ${Math.round(since / 60000)}m ago. Skipping.`); return; }
      const sent = await run();
      if (sent) await chrome.storage.local.set({ [KEY]: Date.now() });
    } catch (e) {
      warn("sync errored:", e && e.message ? e.message : e);
    }
    // Re-scan once after the SPA finishes rendering the profile (LinkedIn loads
    // the follower count a beat after navigation).
    setTimeout(() => { domCounts.__done || run().then((s) => { if (s) chrome.storage.local.set({ bleed_last_profile_sync: Date.now() }); }); }, 4000);
  })();
})();
