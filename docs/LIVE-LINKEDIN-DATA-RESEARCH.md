# Live LinkedIn Data for linkedin-hq — Technical Research

**Author:** research pass, 2026-07-14
**Question:** How do Taplio / Supergrow / AuthoredUp / Shield Chrome extensions show LIVE data for a user's OWN LinkedIn account (followers, connections, posts, likes/comments, impressions, profile views), and how do we build the same for `linkedin-hq` so our dashboard never needs manual entry into `lib/profile.ts`?

**TL;DR:** They run a Chrome extension whose content script executes *inside the linkedin.com origin*, so the browser auto-attaches the logged-in user's session cookies (`li_at` + `JSESSIONID`) to `fetch()` calls. They hit LinkedIn's private **Voyager API** (`https://www.linkedin.com/voyager/api/...`) with a `csrf-token` header (= the `JSESSIONID` value) and `x-restli-protocol-version: 2.0.0`, parse the JSON, and POST it to their own backend. Owner-only metrics (impressions, profile views, search appearances) ARE reachable this way — unlike our public Apify scraper, which can only see public likes/comments. This is a grey area: it violates LinkedIn User Agreement §8.2, and LinkedIn cracked down hard on exactly this pattern in mid-2025 (Shield and cookie-based Taplio/Kleo were forced to wind down). The safe-but-gated alternative is LinkedIn's official **Member Post Analytics API** (launched July 2025), which is OAuth-based but only open to *approved* partners.

---

## 1. The mechanism — how the extensions actually pull live data

### 1a. The core trick: run fetch() from the linkedin.com origin

Every one of these tools (Taplio X, Supergrow, AuthoredUp, the old Shield) ships a **Chrome extension with a content script matched to `https://www.linkedin.com/*`**. The single most important fact:

> A content script runs in the page's origin. When it calls `fetch(url, { credentials: "include" })` against a `linkedin.com` URL, Chrome automatically attaches the user's LinkedIn cookies — including the httpOnly `li_at` auth cookie the extension's JS can never read directly. The request is indistinguishable, at the cookie layer, from LinkedIn's own web app making the same call.

So the extension never needs the user's password and never needs to "read" the auth cookie. It just needs to be *running on the tab while the user is logged in*, and it borrows the live session. This is why "install the extension, then open LinkedIn" is the entire setup flow for all of them.

Two sub-styles exist:

- **API-calling (Voyager) style — Taplio, Supergrow, old Shield.** The content script calls LinkedIn's internal REST API (Voyager) directly and gets clean JSON, including owner-only analytics. Powerful, but this is the pattern LinkedIn actively fights. Shield's own post-mortem: its "Chrome extension model, which used your LinkedIn login cookie to pull data in the background, ran into ongoing problems with both the Chrome Web Store and LinkedIn's enforcement." ([cclarity.io](https://cclarity.io/shield-alternative), [meetsona.ai](https://meetsona.ai/blog/safe-shield-app-alternatives/))
- **DOM-reading style — AuthoredUp (post-2025).** The extension reads data *already rendered on screen* as the user browses their own analytics pages, declares **no cookie permission at all** in its manifest (independently verifiable in Chrome's permission inspector), and cannot act while the user is away. AuthoredUp explicitly markets this as why it survived the crackdown where Shield didn't. ([authoredup.com](https://authoredup.com/blog/shield-alternatives), [magicpost.in](https://magicpost.in/blog/shield-analytics-alternatives))

### 1b. Voyager API — auth and headers

Voyager is LinkedIn's own internal REST-li API that powers linkedin.com and the mobile apps. Base URL:

```
https://www.linkedin.com/voyager/api
```

Authentication is just the logged-in session, expressed as three things (confirmed from multiple reverse-engineering sources and the `linkedin-api` client source):

| Header / cookie | Value | Notes |
|---|---|---|
| `Cookie: li_at=...` | the auth session cookie | httpOnly; auto-attached by the browser, never read by JS |
| `Cookie: JSESSIONID="ajax:123..."` | the CSRF seed cookie | readable; note the literal double-quotes in the value |
| `csrf-token` header | the `JSESSIONID` value **with the surrounding double-quotes stripped** | e.g. `ajax:1234567890`. In the `linkedin-api` client this is literally `session.cookies["JSESSIONID"].strip('"')` |
| `x-restli-protocol-version` header | `2.0.0` | required by every Voyager call |
| `accept` header | `application/vnd.linkedin.normalized+json+2.1` | returns the normalized/deduped JSON shape |
| `x-li-lang` header | `en_US` | optional but expected |

Sources: [iron-mind.ai Voyager scraper guide](https://iron-mind.ai/blog/linkedin-profile-scraper-python-voyager-api), [nsandman/linkedin-api client.py](https://github.com/nsandman/linkedin-api), [Scofield Idehen's Voyager guide](https://dev.to/scofieldidehen/linkedin-voyager-api-the-ultimate-developers-guide-1a08).

From a content script the cookies are automatic, so the extension only has to set the three non-cookie headers. It reads `JSESSIONID` via `document.cookie` (that one is not httpOnly) to build the `csrf-token`.

### 1c. Voyager endpoints — the real paths

These are the concrete endpoint paths, verified against the `nsandman/linkedin-api` and `tomquirk/linkedin-api` client source (they call the same internal API the web app uses) plus the modern `dash` variants observed in live traffic. All are relative to `https://www.linkedin.com/voyager/api`.

**Follower + connection counts (the numbers currently manual in `lib/profile.ts`):**
```
GET /identity/profiles/{publicIdOrUrnId}/networkinfo
    accept: application/vnd.linkedin.normalized+json+2.1
```
Returns the member's network info object containing **`followersCount`** and **`connectionsCount`** (and "connections distance"). This is the single most valuable call for us — it replaces the manual follower/connection entry directly.

**Full profile (headline, name, current positions, etc.):**
```
GET /identity/profiles/{publicId}/profileView          # classic, still works
GET /identity/dash/profiles?q=memberIdentity&memberIdentity={publicId}
      &decorationId=com.linkedin.voyager.dash.deco.identity.profile.FullProfileWithEntities-93   # modern "dash" variant
```

**Who's-viewed-my-profile → profile views (OWNER-ONLY):**
```
GET /identity/wvmpCards
```
Returns cards typed `com.linkedin.voyager.identity.me.wvmpOverview.WvmpViewersCard` and `...WvmpSummaryInsightCard` — i.e. the "N profile views in the last 90 days" number and the recent-viewers list. This is data you can only get for *your own* account, exactly what the public scraper cannot see.

**Member's posts / activity feed:**
```
GET /feed/updates?q=...&moduleKey=...                    # classic
GET /feed/dash/updates?...                               # modern (voyagerFeedDashProfileUpdates)
```
The modern creator-analytics UI drives this off `feedDashProfileUpdatesByMemberShare` (profile → "activity" → shares). Each returned **update object embeds a `socialDetail` / `socialCounts` sub-object** with `numLikes`, `numComments`, `numShares`, and reaction breakdowns — so per-post engagement comes back *in the same response* as the post list; you don't need a separate call per post. (For an isolated post you can also hit `/feed/updates/{updateUrn}/likes` or the reactions endpoint, but reading the feed page is cheaper.)

**Owner analytics — impressions / reach / search appearances:** these are served by the `voyagerIdentityDash*` / analytics-entity cards behind the native pages `linkedin.com/analytics/creator/content/` and `linkedin.com/dashboard/`. LinkedIn changes these decoration IDs frequently and they are the most fragile to hit by raw URL. In practice the DOM-reading tools grab these numbers by parsing the rendered analytics page rather than guessing the decoration ID — see §1d. The **official** equivalent is the `memberCreatorPostAnalytics` API in §4b, which gives IMPRESSION / MEMBERS_REACHED / PROFILE_VIEW_FROM_CONTENT cleanly.

### 1d. DOM-scraping fallback (what AuthoredUp does now)

When the API is too fragile or too risky, the tool navigates (or waits for the user to navigate) to the native analytics pages and reads the numbers out of the DOM:

- `https://www.linkedin.com/analytics/creator/content/` — post impressions, engagement
- `https://www.linkedin.com/analytics/profile-views/` — profile views
- `https://www.linkedin.com/analytics/search-appearances/` — search appearances
- the profile header itself — follower/connection counts as rendered text

The trade-off: DOM scraping breaks whenever LinkedIn reshuffles its (hashed, CSS-module) class names — our own `extension/content.js` already documents fighting exactly this ("LinkedIn's 2026 feed rewrite uses hashed CSS-module class names… we anchor on the ARIA role instead"). But DOM-only reading declares no cookie permission and does no background work, which is why it's the lower-risk survivor. AuthoredUp: the extension "reads data already loaded in the browser as you browse LinkedIn normally… cannot access LinkedIn in your absence and cannot automate any action." ([authoredup.com](https://authoredup.com/blog/shield-alternatives))

### 1e. Getting data out to the backend

Standard MV3 flow, identical in shape to what our repo already does for comment suggestions:

```
content script (linkedin.com origin, has cookies)
   → reads Voyager JSON / DOM
   → chrome.runtime.sendMessage(...)  OR  fetch() directly
背景 service worker (background.js, has host_permissions, bypasses CORS)
   → fetch("https://our-backend/api/...", { method:"POST", headers:{token}, body })
our backend
   → validates shared token, writes to DB / Sheet
```

Doing the cross-origin POST from the **background service worker** (not the content script) is the correct MV3 pattern because the worker has `host_permissions` and bypasses CORS — our `extension/background.js` comment already spells this out. A daily cadence is driven by `chrome.alarms`.

---

## 2. Chrome extension architecture (Manifest V3)

The shape every one of these tools uses, and the shape our repo already half-implements:

```jsonc
{
  "manifest_version": 3,
  "name": "...",
  "host_permissions": [
    "https://www.linkedin.com/*",      // so fetch() to voyager is same-origin from content script
    "https://linkedin-hq.vercel.app/*" // so the service worker can POST our API
  ],
  "permissions": [
    "storage",                          // cache last-sync time / token
    "alarms"                            // periodic daily sync
    // NOTE: "cookies" is NOT needed — content-script fetch auto-attaches them.
    // Declaring "cookies" is a red flag reviewers/LinkedIn look for; avoid it.
  ],
  "background": { "service_worker": "background.js" },
  "content_scripts": [{
    "matches": ["https://www.linkedin.com/*"],
    "js": ["content.js"],
    "run_at": "document_idle"
  }]
}
```

Key mechanics:
- **`host_permissions` on `www.linkedin.com`** is what lets the content script's `fetch` be treated as first-party and carry cookies. Our current `extension/manifest.json` already lists `https://www.linkedin.com/*` and `https://linkedin-hq.vercel.app/*` — the exact two hosts we need.
- **Credentials:** from the content script, `fetch("/voyager/api/...", { credentials: "include", headers: {...} })`. Because the content script's document *is* linkedin.com, cookies attach automatically; `credentials:"include"` is belt-and-suspenders.
- **CSRF header:** `const jsid = document.cookie.match(/JSESSIONID="?([^;"]+)"?/)?.[1]; headers["csrf-token"] = jsid;`
- **Messaging:** `chrome.runtime.sendMessage` from content → worker; worker replies async (`return true` to keep the channel open — our `background.js` already does this).
- **Periodic sync:** `chrome.alarms.create("li-sync", { periodInMinutes: 1440 })` + `chrome.alarms.onAlarm` → open/ping a LinkedIn tab or, simpler, just sync opportunistically whenever the user has a LinkedIn tab open (a content script fires on every visit).

---

## 3. Auth / session

- **The user MUST be logged into LinkedIn in that browser.** There is no way around it — the whole mechanism is borrowing the live browser session. This is fine for us: it's Taha's (or Sophiya's) own account, on their own machine, fully authorized — same posture as the Taplio/Supergrow extensions already installed.
- **Cookie storage:** the reputable, lower-risk pattern is **browser-only** — never ship the `li_at` cookie to the backend. Only the *derived data* (follower count, impressions, etc.) leaves the browser. (The tools that got in the most legal trouble were the ones that harvested cookies server-side to make calls from datacenter IPs while the user was away — that's what looks like true automated scraping.)
- **Session longevity:** `li_at` lasts up to ~1 year (LinkedIn "keep me logged in"), `JSESSIONID` rotates per session. As long as the user occasionally uses LinkedIn in that browser, the session stays warm and no re-auth is needed. If logged out, the Voyager calls return 401 and the extension simply shows "open LinkedIn and log in."

---

## 4. ToS / risk / detection — be honest

### 4a. This is against LinkedIn's User Agreement

LinkedIn User Agreement **§8.2** explicitly prohibits: "Develop, support or use software, devices, scripts, robots, or any other means or processes (including crawlers, **browser plugins and add-ons**, or any other technology) to scrape the Services or otherwise copy profiles and other data," and "Use bots or other automated methods to access the Services." LinkedIn's Help page on "Prohibited software and extensions" names browser extensions that "scrape, modify the appearance of, or automate activity" directly. ([LinkedIn Help — Prohibited software](https://www.linkedin.com/help/linkedin/answer/a1341387/prohibited-software-and-extensions), [connectsafely.ai](https://connectsafely.ai/articles/is-linkedin-automation-safe-tos-scraping-guide-2026))

So even for your *own* account and your *own* data, calling Voyager from an extension is a §8.2 violation on paper. The realistic enforcement risk for **low-volume, read-only, own-account** use is low — but it is not zero, and the consequences ladder from a soft warning to a permanent account restriction.

### 4b. The crackdown is recent and real

In **mid-2025 LinkedIn actively shut down** the cookie-based extension model: Shield wound down, and Taplio/Kleo's unofficial creator-data access was cut off. Simultaneously (July 8 2025) LinkedIn launched the **official Member Post Analytics API** and onboarded 11 launch partners (Hootsuite, Buffer, Metricool, Later, Publer, etc.), steering everyone toward the sanctioned path. ([ppc.land](https://ppc.land/linkedin-enables-third-party-analytics-access-with-new-member-post-api/), [ppc.land crackdown/class-action](https://ppc.land/linkedin-hit-with-class-action-over-hidden-browser-scan-of-6-000-extensions/), [digiday](https://digiday.com/media/linkedin-makes-it-easier-for-creators-to-track-performance-across-platforms/))

### 4c. Detection surface & safety practices

Detection signals LinkedIn watches for: request volume/velocity per session, calling Voyager endpoints the UI wouldn't call in that order, datacenter IPs, and headless/automation fingerprints. Best-practice throttling if we proceed with the Voyager approach:

- **Read-only, never write** at scale (no auto-connect, auto-message, auto-post via the extension — those are what trigger the worst bans; our existing auto-comment loop is a separate, deliberately-gated system).
- **Low frequency:** one sync per day is plenty for a dashboard. Never poll in a tight loop.
- **Only call endpoints the UI already loaded** (or piggyback on the user actually visiting their analytics page — this is why DOM-reading is safest: the data was going to load anyway).
- **Human cadence:** jitter the daily sync; don't fire at a fixed second.
- **Never exfiltrate the cookie**; keep the session in the browser only.
- Accept that any raw-Voyager approach **can break without notice** if LinkedIn rotates decoration IDs or tightens checks.

**Bottom line for the report:** the Voyager approach is the powerful one and gets us impressions + profile views, but it is a genuine grey area that LinkedIn is currently policing. The DOM-read approach is meaningfully lower-risk. The official API is the only fully-safe path but is partner-gated.

### 4d. The sanctioned alternative — official Member Post Analytics API

`GET https://api.linkedin.com/rest/memberCreatorPostAnalytics` (OAuth 3-legged, scope **`r_member_postAnalytics`**, header `LinkedIn-Version: YYYYMM` + `X-Restli-Protocol-Version: 2.0.0` + `Authorization: Bearer`). Two finders:
- `q=me` → aggregated stats across all the member's posts
- `q=entity&entity=(share:urn%3Ali%3Ashare%3A...)` → single-post stats

Metrics (2026 version): `IMPRESSION`, `MEMBERS_REACHED`, `REACTION`, `COMMENT`, `RESHARE`, `POST_SAVE`, `POST_SEND`, `LINK_CLICKS`, `PREMIUM_CTA_CLICKS`, `FOLLOWER_GAINED_FROM_CONTENT`, `PROFILE_VIEW_FROM_CONTENT` — with `TOTAL` or `DAILY` aggregation and a `dateRange`. ([Microsoft Learn — Member Post Statistics](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/members/post-statistics)) The catch: access requires **LinkedIn partner approval** via their form; it's aimed at scheduling/analytics SaaS vendors, not a single-account internal dashboard. Worth an application, but don't block on it.

---

## 5. How WE build it for linkedin-hq

### 5a. What we already have (grounding)

- **`extension/manifest.json`** — MV3, `host_permissions` already includes `https://www.linkedin.com/*` + `https://linkedin-hq.vercel.app/*` + `http://localhost:3009/*`. Content script on `linkedin.com`, background service worker. **This is exactly the skeleton we need** — we extend it, we don't start over.
- **`extension/content.js`** — already runs on linkedin.com, already reads the DOM (post text, author), already survives the hashed-class-name problem by anchoring on ARIA roles. Reuse this hardening.
- **`extension/background.js`** — already does the correct MV3 pattern: content → `chrome.runtime.sendMessage` → worker `fetch()` to our Vercel API with an `x-suggest-token` shared-secret header. **Our sync route copies this exact auth shape.**
- **`app/api/intel/ingest/route.ts`** — the ingest template: reads a shared-secret header (`x-ingest-token` = `process.env.INTEL_INGEST_TOKEN`), 401s on mismatch, validates a JSON body, writes to the Google Sheet via `lib/sheets.ts` (`appendIntel`). **Our `/api/linkedin/sync` route is a near-copy of this.**
- The Sheet (`GOOGLE_SHEETS_ID`) is our DB; `lib/sheets.ts` is the write layer.

So the whole build is *additive* and follows patterns already proven in this repo.

### 5b. Proposed architecture

```
extension/ (extend the existing one — same MV3 bundle)
  content.js
    on load + on chrome.alarms tick, if on linkedin.com and logged in:
      csrf = JSESSIONID from document.cookie (strip quotes)
      GET /voyager/api/identity/profiles/{ownPublicId}/networkinfo   → followers, connections
      GET /voyager/api/identity/wvmpCards                            → profile views (90d)
      GET /voyager/api/feed/dash/updates?...(own shares)             → posts + socialCounts
      (optional) parse /analytics/creator/content DOM               → impressions/reach
      → chrome.runtime.sendMessage({ type:"LI_STATS", payload })
  background.js
    on "LI_STATS": fetch POST https://linkedin-hq.vercel.app/api/linkedin/sync
      headers: { "x-linkedin-sync-token": CONFIG.SYNC_TOKEN }
      body: the payload below

app/api/linkedin/sync/route.ts  (NEW — clone of intel/ingest/route.ts)
  - check header x-linkedin-sync-token === process.env.LINKEDIN_SYNC_TOKEN (401 else)
  - validate body
  - write ProfileStats row to Sheet (new tab) + upsert per-post rows into Posts/Account Posts
  - return { ok, written }
```

### 5c. Concrete endpoint list to call (own account)

| Data we want | Voyager call (base `https://www.linkedin.com/voyager/api`) | Owner-only? |
|---|---|---|
| Follower count | `GET /identity/profiles/{me}/networkinfo` → `followersCount` | public-ish, but exact live number |
| Connection count | same call → `connectionsCount` | yes (exact) |
| Profile views (90d) | `GET /identity/wvmpCards` | **yes** |
| Own posts + per-post likes/comments/reposts | `GET /feed/dash/updates?...` (self actor) → each update's `socialDetail.totalSocialActivityCounts` | reactions public, but authoritative |
| Post impressions / reach | DOM parse of `/analytics/creator/content/` **or** official `memberCreatorPostAnalytics` API | **yes — not in public scrape** |
| Search appearances | DOM parse of `/analytics/search-appearances/` | **yes** |
| `{me}` public id | `GET /voyager/api/me` → returns `miniProfile.publicIdentifier` | — |

### 5d. Data shape (POST body to `/api/linkedin/sync`)

```jsonc
{
  "profile": {
    "public_id": "taha-anwar-...",
    "followers": 18342,
    "connections": 5011,
    "profile_views_90d": 1204,
    "search_appearances_7d": 88,
    "captured_at": "2026-07-14T09:00:00+05:00"   // Karachi ISO, like appendIntel
  },
  "posts": [
    {
      "urn": "urn:li:activity:73...",
      "url": "https://www.linkedin.com/feed/update/urn:li:activity:73...",
      "posted_at": "2026-07-12T...",
      "text_preview": "first 80 chars",
      "likes": 210, "comments": 47, "reposts": 9,
      "impressions": 15230        // only present if analytics page/API was read
    }
  ]
}
```

### 5e. Where it writes

- **New `ProfileStats` tab** (append-only, one row per daily sync): `captured_at | followers | connections | profile_views_90d | search_appearances | notes`. Append-only gives us a growth time-series for free (the thing manual entry never captured). Add a `saveProfileStats()` to `lib/sheets.ts` mirroring `appendIntel`.
- **Posts / Account Posts tab:** upsert by `posted_url`/`urn` — fill `likes`, `comments`, `views` (impressions) live, replacing what `sync-post-stats.mjs` gets from Apify (Apify can't see impressions; this can). This closes Stage 12's loop *with owner impressions*, which the CLAUDE.md notes is impossible from the public scrape.
- **The manual `lib/profile.ts` values:** the dashboard reads the latest `ProfileStats` row instead of a hardcoded constant. Keep `lib/profile.ts` as the *fallback* default if no sync has run yet.

### 5f. Sync cadence

- **On-visit:** content script fires every time the user opens/uses a LinkedIn tab → opportunistic fresh sync, zero extra requests beyond normal browsing (lowest detection risk).
- **Daily tick:** `chrome.alarms` at `periodInMinutes: 1440`, jittered, as a backstop when they haven't browsed. Only fire if a LinkedIn tab/session is available; otherwise skip silently.
- **Server-side de-dupe:** `/api/linkedin/sync` replaces "today's" ProfileStats row on re-run (same idempotent pattern as `save-daily-report.mjs`).

### 5g. Realistically gettable vs not

| Metric | Gettable live via own-session? | How |
|---|---|---|
| Followers, connections | ✅ exact | `networkinfo` |
| Profile views (90d) | ✅ | `wvmpCards` (owner-only) |
| Search appearances | ✅ | analytics DOM (owner-only) |
| Own posts + likes/comments/reposts | ✅ | feed dash updates `socialCounts` |
| **Post impressions / reach** | ✅ (the big win) | analytics-page DOM **or** official API — *impossible from our current Apify public scrape* |
| Per-viewer impression identity | ⚠️ partial | `wvmpCards` shows recent viewers, not full impression list |
| Others' post impressions | ❌ never | not exposed to anyone but the post owner |

The headline: **impressions and profile views ARE reachable for the owner** — exactly the gap the current public Apify scraper (and the manual `lib/profile.ts` entry) can't fill.

---

## 6. Build roadmap (phased, with effort + risk)

**Phase 0 — Decide the risk posture (0.5 day).** Choose: (a) raw Voyager from the extension (most data, grey-area, LinkedIn actively enforcing), (b) DOM-read only (lower risk, survives like AuthoredUp, but fragile to class-name changes and only what's on screen), or (c) apply for the official Member Post Analytics API (safe, but partner-gated + slow). Recommendation: **start with (b) for impressions/profile-views by reading the analytics pages the user already opens, plus one Voyager `networkinfo` call for follower/connection counts** — best risk/reward. Apply for (c) in parallel as the long-term durable path.

**Phase 1 — Read-only follower/connection sync (0.5–1 day). Lowest risk.**
Extend `extension/content.js` to call `/voyager/api/identity/profiles/{me}/networkinfo` on visit, POST to a new `/api/linkedin/sync` (clone of `intel/ingest/route.ts`, new `LINKEDIN_SYNC_TOKEN`), write a `ProfileStats` row. Dashboard reads latest row, `lib/profile.ts` becomes the fallback. *Risk:* low — one call, own account, read-only. This alone kills the most annoying manual entry.

**Phase 2 — Posts + socialCounts (1–2 days). Low/medium risk.**
Add the feed-dash-updates call, parse each update's `socialCounts`, upsert into Posts/Account Posts by URN. Replaces/augments the Apify path with authoritative live numbers. *Risk:* low-medium — a few more calls; keep it to once/day.

**Phase 3 — Owner analytics: impressions, profile views, search appearances (2–4 days). Medium risk / most fragile.**
Either (3a) DOM-parse `/analytics/creator/content/`, `/analytics/profile-views/`, `/analytics/search-appearances/` when the user visits them (safest, but needs resilient selectors — reuse the ARIA-anchor hardening already in `content.js`), or (3b) get official-API approval and call `memberCreatorPostAnalytics`. *Risk:* medium — DOM selectors break on LinkedIn redesigns; decoration-ID Voyager calls break even faster; the official API needs approval. This is the highest-value phase (impressions were previously impossible) and the one to build most defensively.

**Cross-cutting risks:** (1) LinkedIn UI/endpoint churn — budget maintenance; anchor on ARIA/stable JSON keys, not hashed classes. (2) §8.2 exposure — keep it read-only, own-account, low-frequency, cookie-never-leaves-browser. (3) Chrome Web Store — if we ever publish it publicly, cookie-borrowing extensions get flagged; keeping it **unlisted / load-unpacked internal** (as the current comment extension already is) sidesteps store review entirely.

---

## Sources

- LinkedIn Voyager scraper guide (endpoints, csrf-token = JSESSIONID, headers): https://iron-mind.ai/blog/linkedin-profile-scraper-python-voyager-api
- `nsandman/linkedin-api` (Voyager client source — real `/identity/profiles/{id}/networkinfo`, `/identity/wvmpCards`, `/feed/updates`, header dict): https://github.com/nsandman/linkedin-api
- Scofield Idehen — Voyager API developer's guide: https://dev.to/scofieldidehen/linkedin-voyager-api-the-ultimate-developers-guide-1a08
- `linkedin-api` on PyPI (methods overview): https://pypi.org/project/linkedin-api/
- Official Member Post Analytics API (`memberCreatorPostAnalytics`, metrics, scope `r_member_postAnalytics`): https://learn.microsoft.com/en-us/linkedin/marketing/community-management/members/post-statistics
- LinkedIn launches Member Post Analytics API (July 8 2025, 11 partners): https://ppc.land/linkedin-enables-third-party-analytics-access-with-new-member-post-api/
- LinkedIn crackdown / class action over extension scanning: https://ppc.land/linkedin-hit-with-class-action-over-hidden-browser-scan-of-6-000-extensions/
- AuthoredUp on why DOM-read survived where Shield's cookie model didn't: https://authoredup.com/blog/shield-alternatives
- Shield alternative / cookie-model shutdown post-mortem: https://cclarity.io/shield-alternative , https://meetsona.ai/blog/safe-shield-app-alternatives/
- Shield Chrome extension support doc: https://help.shieldapp.ai/en/articles/10290125-the-shield-chrome-extension
- Taplio X Chrome extension: https://taplio.com/linkedin-chrome-extension
- LinkedIn Help — Prohibited software and extensions (§8.2 basis): https://www.linkedin.com/help/linkedin/answer/a1341387/prohibited-software-and-extensions
- LinkedIn automation/scraping ToS analysis (2026): https://connectsafely.ai/articles/is-linkedin-automation-safe-tos-scraping-guide-2026
- Digiday — new API for creators/brands: https://digiday.com/media/linkedin-makes-it-easier-for-creators-to-track-performance-across-platforms/
