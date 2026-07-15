// Live stats sync — runs on EVERY linkedin.com page and opportunistically reads
// whatever of your own numbers are visible on the page you're already looking at,
// then hands them to the background worker, which POSTs them to linkedin-hq.
//
//   • Home feed left card  → Profile viewers + Post impressions   (you see these daily)
//   • Your own profile page → Followers + Connections
//
// This is the "auto-update" layer: you don't visit a special page — as you use
// LinkedIn normally, the webapp stays fresh. Read-only DOM scraping only: it adds
// ZERO new LinkedIn network calls (it just reads pages you loaded anyway), and it
// only POSTs to linkedin-hq when a number actually CHANGED or is >6h stale.
//
// Debug: DevTools (F12) on linkedin.com → filter the console for "[BleedSync]".
// See docs/LIVE-LINKEDIN-DATA-RESEARCH.md for the how/why + risk notes.
(function () {
  "use strict";

  const STALE_MS = 6 * 60 * 60 * 1000; // resend an unchanged metric at most once / 6h
  const V = "https://www.linkedin.com/voyager/api";
  const CACHE = "bleed_stats_cache";   // { values:{metric:val}, sentAt:{metric:ts} }
  const SLUG_KEY = "bleed_own_slug";   // cached once so we don't re-hit Voyager /me
  const log = (...a) => console.log("[BleedSync]", ...a);
  const warn = (...a) => console.warn("[BleedSync]", ...a);

  function csrfHeaders() {
    const m = document.cookie.match(/JSESSIONID="?([^;"]+)"?/);
    if (!m) return null;
    return { "csrf-token": m[1], "x-restli-protocol-version": "2.0.0", "accept": "application/vnd.linkedin.normalized+json+2.1" };
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

  // -- one-time: your own profile slug, so we never read someone else's profile --
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

  async function ownSlug() {
    const s = await chrome.storage.local.get(SLUG_KEY);
    if (s[SLUG_KEY]) return s[SLUG_KEY];
    const headers = csrfHeaders();
    if (!headers) return null;
    const slug = await meProfileId(headers); // at most ONE Voyager call, ever
    if (slug) await chrome.storage.local.set({ [SLUG_KEY]: slug });
    return slug;
  }

  // Bonus: exact connection count via the still-live relationships dash endpoint
  // (only called to upgrade a capped "500+" — rare, profile-page only).
  async function exactConnections(headers) {
    try {
      const res = await fetch(V + "/relationships/dash/connections?q=search&start=0&count=0", { credentials: "include", headers });
      if (!res.ok) return null;
      const j = await res.json();
      const total = j?.data?.paging?.total ?? j?.paging?.total;
      return typeof total === "number" ? total : null;
    } catch { return null; }
  }

  // -- DOM readers (no network) -----------------------------------------------

  // Leaf elements whose whole text is "<n> followers" / "<n> connections".
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

  // A number sitting next to a label ("Profile viewers 324"), scoped to the
  // left sidebar so we don't grab an unrelated count elsewhere on the page.
  function labeledNumber(labelRe) {
    const scope = document.querySelector(".scaffold-layout__sidebar")
      || document.querySelector("aside")
      || document.body;
    const els = scope.querySelectorAll("a,li,div,span");
    for (const el of els) {
      if (el.children.length > 4) continue;
      const t = (el.innerText || "").replace(/\s+/g, " ").trim();
      if (t.length > 40 || !labelRe.test(t)) continue;
      const nums = t.match(/\d[\d,]*/g);
      if (nums && nums.length) {
        const n = parseInt(nums[nums.length - 1].replace(/,/g, ""), 10);
        if (Number.isFinite(n)) return n;
      }
    }
    return null;
  }

  // Home-feed left card: profile viewers (90d) + post impressions (7d).
  function readFeedCard() {
    const out = {};
    const pv = labeledNumber(/profile viewers?/i);
    const pi = labeledNumber(/post impressions?/i);
    if (pv != null) out.profile_views_90d = pv;
    if (pi != null) out.post_impressions_7d = pi;
    return out;
  }

  // Your own profile page: followers + connections.
  async function readProfile() {
    if (!/\/in\//.test(location.pathname)) return {};
    const cur = (location.pathname.split("/in/")[1] || "").replace(/\/.*/, "");
    if (!cur) return {};
    const mine = await ownSlug();
    if (mine && cur !== mine) { log(`on someone else's profile (${cur}) — skipping.`); return {}; }

    const fRaw = leafMatches(/^([\d.,]+[KMB]?)\s*followers?$/i).map(parseHuman).filter((n) => n != null);
    const cRaw = leafMatches(/^([\d,]+\+?)\s*connections?$/i);
    // Prefer the EXACT follower count (never a round hundred) over the rounded header.
    const followers = fRaw.find((n) => n % 100 !== 0) ?? fRaw[0] ?? null;
    const cExact = cRaw.find((s) => !s.includes("+"));
    const connections = ((cExact || cRaw[0] || "").replace(/,/g, "")) || null; // may stay "500+"

    const out = {};
    if (followers != null) out.followers = followers;
    if (connections != null) out.connections = connections;
    return out;
  }

  // -- harvest + throttle + post ----------------------------------------------

  const LABELS = { followers: "followers", connections: "connections", profile_views_90d: "profile viewers", post_impressions_7d: "post impressions" };
  const prettyFields = (o) => Object.keys(o).map((k) => LABELS[k] || k).join(", ");

  function sendSync(payload) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "BLEED_SYNC", payload }, (resp) => {
        if (chrome.runtime.lastError) return resolve({ ok: false, error: chrome.runtime.lastError.message });
        resolve(resp || { ok: false });
      });
    });
  }

  // reason: where the harvest came from ("load"/"nav"/"interval"/"click").
  // force: true (from the toolbar-icon click) posts even if unchanged, so a
  // manual "sync now" always refreshes the timestamp. Returns a summary the
  // background worker turns into an icon badge.
  async function harvest(reason, force) {
    let found = {};
    try {
      Object.assign(found, readFeedCard());
      Object.assign(found, await readProfile());
    } catch (e) { warn("read errored:", e && e.message ? e.message : e); }

    const clean = {};
    for (const k in found) if (found[k] != null && found[k] !== "") clean[k] = found[k];
    const fieldCount = Object.keys(clean).length;
    if (!fieldCount) { log(`nothing readable on this page (${reason}).`); return { found: 0, posted: false }; }

    const store = await chrome.storage.local.get(CACHE);
    const cache = store[CACHE] || { values: {}, sentAt: {} };
    const now = Date.now();
    let should = force === true;
    for (const k in clean) {
      const changed = String(cache.values[k]) !== String(clean[k]);
      const stale = !cache.sentAt[k] || now - cache.sentAt[k] > STALE_MS;
      if (changed || stale) should = true;
    }
    if (!should) { log(`nothing new (${reason}) —`, clean); return { found: fieldCount, posted: false, fields: prettyFields(clean) }; }

    // Upgrade a capped "500+" to the exact number if we can (profile page only).
    if (typeof clean.connections === "string" && clean.connections.includes("+")) {
      const headers = csrfHeaders();
      if (headers) { const ex = await exactConnections(headers); if (ex != null) clean.connections = ex; }
    }

    log(`posting (${reason}):`, clean);
    const resp = await sendSync(clean);
    if (resp && resp.ok !== false) {
      for (const k in clean) { cache.values[k] = clean[k]; cache.sentAt[k] = now; }
      await chrome.storage.local.set({ [CACHE]: cache });
      log("synced to linkedin-hq:", resp);
      return { found: fieldCount, posted: true, fields: prettyFields(clean) };
    }
    warn("sync failed:", resp);
    return { found: fieldCount, posted: false, error: (resp && resp.error) || "post failed", fields: prettyFields(clean) };
  }

  // On-demand sync — the toolbar icon click (routed here by background.js).
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg && msg.type === "BLEED_FORCE_SYNC") {
      harvest("click", true)
        .then((r) => sendResponse(r))
        .catch((e) => sendResponse({ found: 0, posted: false, error: String((e && e.message) || e) }));
      return true; // async response
    }
  });

  // Keep it fresh with no effort from you: harvest shortly after load, on every
  // in-app navigation (LinkedIn is a SPA — we watch location), and every ~3 min
  // while the tab is visible. All DOM-only; a POST fires only when data changes.
  function schedule() {
    setTimeout(() => harvest("load"), 3500);
    let lastHref = location.href;
    let tick = 0;
    setInterval(() => {
      if (document.visibilityState !== "visible") return;
      tick++;
      if (location.href !== lastHref) {
        lastHref = location.href;
        setTimeout(() => harvest("nav"), 3000); // let the new view render
      } else if (tick % 90 === 0) {
        harvest("interval"); // ~every 3 min (90 × 2s)
      }
    }, 2000);
  }

  schedule();
})();
