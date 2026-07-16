# Serper

> Google Search / Google News as an API. In this pipeline Serper is the
> **web-evidence confirmer and trigger-event finder**: it detects which ATS a
> company runs (via job-board search), confirms keyword signals against an
> independent source, and discovers freshly-changed accounts from recency-gated
> Google + News queries (funding, hiring, launches, expansions).

Source: <https://serper.dev> · <https://docs.serper.dev> · condensed for this repo.
The marketing/docs site is heavily JS-gated; the request/response shapes below
are the ones the scripts in this repo actually call and parse.

---

## What it is

Serper (serper.dev) is a fast, low-cost **Google Search API**. You POST a query
and a few Google-style knobs and it returns the SERP as clean JSON — the same
results a browser would show, parsed into fields you can act on. It is a *search*
API, not a database: you don't filter firmographics, you ask Google a question
and read the answer.

It exposes one SERP "vertical" per endpoint. The two this pipeline uses:

1. **Search** (`/search`) — the standard Google web SERP: `organic` results,
   plus `topStories`, `peopleAlsoAsk`, `relatedSearches`, `knowledgeGraph`,
   `answerBox`, sitelinks, etc. This is the workhorse for **ATS detection** and
   **two-source signal confirmation** (e.g. `site:boards.greenhouse.io` queries).
2. **News** (`/news`) — the Google News SERP: a `news[]` array of dated articles
   (title, snippet, link, source, `date`/relative age, imageUrl). This is the
   workhorse for **trigger-event discovery** ("Acme raises Series A").

Other verticals exist on the same host and auth and follow the same body shape —
`/images`, `/videos`, `/places`, `/maps`, `/shopping`, `/scholar`, `/patents`,
`/autocomplete` — but this engine only needs `/search` and `/news`.

---

## Base URL & auth

- **API host:** `https://google.serper.dev`
  (note: `serper.dev` is the marketing/dashboard site; the **API host** is
  `google.serper.dev`. Endpoints are `…/search` and `…/news`.)
- **Method:** every call is a **`POST`** with a **JSON body** (not GET
  query-strings). `Content-Type: application/json`.
- **Auth header:** your key goes in the **`X-API-KEY`** header.
  (There is no `Authorization: Bearer` — it's a raw header named `X-API-KEY`.)
- **Key:** read from the environment variable **`SERPER_API_KEY`** — never
  hardcode it. In code:

  ```python
  import os, requests
  SERPER_API_KEY = os.environ["SERPER_API_KEY"]  # placeholder — set in .env
  HEADERS = {"X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json"}

  resp = requests.post(
      "https://google.serper.dev/search",
      headers=HEADERS,
      json={"q": '"Acme Corp" "machine learning engineer" site:boards.greenhouse.io'},
      timeout=30,
  )
  ```

  The matching line in `.env.example` is:

  ```
  SERPER_API_KEY=your_serper_key_here
  ```

- **Auth failure:** an unset/invalid key comes back as **HTTP 401/403**. The
  scripts here exit early with a clear message on those codes — if you see one,
  check the header name is exactly `X-API-KEY` and the env var is exported.
- **Free tier:** a new key ships with a pool of free credits (no card required)
  to validate the integration before you commit budget.

---

## Endpoints & parameters

Both endpoints take the **same JSON body**; only the response array name differs
(`organic` for search, `news` for news).

| Endpoint | Path | Returns |
|---|---|---|
| Web search | `POST https://google.serper.dev/search` | `organic[]`, `topStories[]`, `peopleAlsoAsk[]`, `relatedSearches[]`, `knowledgeGraph`, `answerBox`, `searchParameters` |
| News | `POST https://google.serper.dev/news` | `news[]` (each: `title`, `snippet`, `link`, `source`, `date`, `imageUrl`), `searchParameters` |

### Request body parameters

| Param | Type | Meaning | Notes / examples |
|---|---|---|---|
| `q` | string · **required** | The Google query. | Full Google syntax works: quotes, `OR`, `site:`, `-`, `intitle:`. e.g. `'"Acme Corp" ("ML platform" OR "machine learning") site:jobs.lever.co'` |
| `tbs` | string | **Time-based search** — the recency filter. | `qdr:h` past hour · `qdr:d` past day · `qdr:w` past week · `qdr:m` past month · `qdr:y` past year. This is what makes a result a *fresh trigger event* and not old news. |
| `gl` | string | Geo (country) code. | `us`, `gb`, `de`, … Default `us`. Biases results to that country's Google. |
| `hl` | string | Interface/result language. | `en`, `fr`, `de`, … Default `en`. |
| `num` | int | Results to return. | Default 10; commonly set to 20; up to ~100. Higher `num` = more SERP page coverage (and on some plans, more credits — see below). |
| `page` | int | SERP page number (pagination). | `1`-based. Page 2 ≈ results 11–20 (depends on `num`). Use instead of/with `num` to walk deep results. |
| `location` | string | Canonical Google location string. | e.g. `"San Francisco, California, United States"`. Finer-grained than `gl`; use Google's canonical names, not free text. |
| `autocomplete` | bool | (on `/search`) include query autocomplete suggestions. | Optional; not used by this pipeline. |

Minimal recency-gated body (what `serper_triggers.py` sends):

```json
{ "q": "<your-icp> raises Series A", "tbs": "qdr:w", "num": 20, "gl": "us", "hl": "en" }
```

### Reading the response

- **`/search`** → iterate `organic[]` for `title` / `snippet` / `link`, and also
  scan `topStories[]` (Google sometimes surfaces fresh trigger news on a web
  search). For ATS/two-source confirmation you usually just need the **hit
  count** (`len(organic)`), not the bodies.
- **`/news`** → iterate `news[]` for `title` / `snippet` / `link` / `source` /
  `date`. The `date` is typically relative ("2 days ago"); `tbs` already
  bounds it, so you rarely re-parse it.
- Resolve the **company** from each hit by taking the `link`'s domain — but only
  trust it as the account's own domain if it's **not** a press-wire/aggregator
  (TechCrunch, Crunchbase, BusinessWire, PRNewswire, GlobeNewswire, Bloomberg,
  Reuters, Forbes, LinkedIn, …). Otherwise fall back to parsing the company name
  out of the headline and let a later stage resolve the domain. (See
  `AGGREGATOR_DOMAINS` and `_company_name_from_headline()` in
  `04-signal-led-expansion/serper_triggers.py`.)

### Batch (optional)

Serper also accepts an **array of query objects** at the same endpoints (and a
`/batch`-style flow) so you can submit many queries in one round trip — useful
when you have a long list of trigger queries or per-account `site:` confirmations
and want fewer HTTP calls. The scripts here loop one query at a time (simpler,
with a polite `sleep` between calls); switch to batched bodies if you hit volume.

---

## Credits & rate limits

- **Pricing model:** Serper is **credit-based and pay-as-you-go** (credits don't
  expire on the standard plans). A basic search query costs on the order of **~1
  credit**; richer requests (large `num`, certain verticals) can cost more — read
  your dashboard's per-query cost, since exact credit math is plan-dependent.
- **Free credits:** every account starts with a free credit pool (no card) so you
  can validate the integration before paying.
- **Throughput:** Serper is built for high concurrency (queries return in ~1–2s);
  practical QPS is governed by your plan, not a hard public number. **Self-throttle
  anyway** — the scripts here sleep ~1s between queries and back off on `429`.
- **Errors to handle:**
  - `401` / `403` — bad/missing `X-API-KEY`. Fix the key; don't retry.
  - `429` — rate limited. Exponential backoff, then resume.
  - `5xx` — transient. Retry with backoff (the scripts do up to 4 attempts).
  - `400` — malformed body (usually a bad `tbs` token or missing `q`).

> **Cost discipline:** Serper is cheap *per query* but you can fan out fast (one
> query per account for ATS confirmation, one per trigger pattern × recency
> window). Keep query lists tight and recency windows as narrow as the cadence
> allows — a `qdr:w` News sweep run weekly will not double-surface last week's
> events the way an unbounded query would.

---

## Role in THIS pipeline

Serper is **complementary to the signal layer, never a replacement for it.**
The social/intent signal layer owns "who is posting, engaging, and showing
buying behavior." Serper owns "what does the open web + Google News say,
right now" — and it shows up in three places:

### 1. ATS detection (Stage 03 — signal mapping)

A company's **applicant tracking system** is a strong firmographic/tech signal
(it tells you they're hiring, on what platform, for which roles). Serper detects
it without scraping anything: a `site:`-scoped Google query reveals which job
board a company posts on.

```json
{ "q": "\"Acme Corp\" (\"ML platform\" OR \"machine learning engineer\") site:boards.greenhouse.io OR site:jobs.lever.co" }
```

`len(organic) >= min_hits` → the company runs that ATS and is hiring for the role
you care about. This is the `source: serper` / `method: two_source` confirmer in
`03-signal-mapping/signals.example.yaml` and the `serper_confirm()` function in
`verify_pattern.py`. It pairs with the DNS/CNAME ATS probe (`cname_probe.py`):
the CNAME tells you the *vendor* a `careers.` subdomain points at; Serper tells
you *what roles are live* on it.

### 2. Two-source signal confirmation (Stage 03)

Any keyword signal extracted from a homepage or job post can be **independently
confirmed** with a second source before it earns full confidence. Serper is that
second source: a single Google query that, if it returns ≥`min_hits`, flips a
signal from `inferred` to `confirmed` for the scoring stage (Stage 05). One weak
source is a guess; homepage-AND-Serper agreeing is evidence.

### 3. Trigger-event discovery (Stage 04 — signal-led expansion)

In the expansion loop, Serper is a **second discovery surface** alongside the
social signal layer. Where the signal layer captures *social* signal (people and
companies posting/engaging on your topics), Serper captures *event* signal from
Google + Google News: **funding rounds, hiring sprees, product launches, market
expansions** — the recency-gated trigger events that mean "something just changed
at this account, now is the time to reach out."

`serper_triggers.py` runs recency-filtered (`tbs=qdr:*`) trigger queries, extracts
candidate companies from titles/snippets/links, and emits the **same normalized
candidate JSONL** the social-listening source emits — so the downstream
`feedback_loop.py` consumes both surfaces identically and dedups across them.

> **# TODO: customize** — write YOUR trigger-query set for Stage 04 (e.g.
> `'"<your-category>" raises'`, `'<your-icp> "now hiring" <key role>'`,
> `'<your-icp> launches'`) and YOUR ATS confirmation templates for Stage 03
> (the `site:` boards your ICP actually posts on), then tune `recency` and
> `min_hits` to your cadence before running against live credits.

**Bottom line:** the signal layer remains THE signal engine. Serper is the
cheap, fast, Google-grounded confirmer and trigger-finder that gives every
signal a second pair of eyes and feeds fresh, just-changed accounts into the
expansion loop.
