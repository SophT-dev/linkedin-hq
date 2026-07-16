# Trigify — The Signal Layer

> Condensed reference for the signal-led GTM engine. Source: public Trigify
> docs + live OpenAPI spec (`api.trigify.io/docs`). Grounded in the published
> API only — no client data, no keys.

## What it is

Trigify is the **signal layer** of this engine: it captures every buying signal
across **11+ social platforms** (business networks, X, Reddit, YouTube, dev
spaces like GitHub / Daily.dev, podcasts, forums, and more) and routes those
signals into GTM workflows and AI agents. Where a firmographic database tells
you *who exists*, Trigify tells you *who is moving right now* — who posted about
a pain you solve, who engaged with content in your category, who changed roles,
who started hiring against the problem you fix.

It is the **centerpiece** of the engine. The other tools in this repo (Prospeo,
Blitz, AI Ark, Parallel, Firecrawl, Serper, Apify, Supabase, plus the outreach
ESPs) are **complementary**: they enrich, research, store, or send. None of them
*listen*. Trigify is the one component that turns the open social web into a
live, person-level, account-mappable signal stream — and everything else in the
pipeline reacts to what it surfaces.

- **What it is:** person-level social buying-signal capture across 11+ platforms
- **Why it is the centerpiece:** it is the only *listening* layer; every other
  tool consumes the signals it produces
- **Two jobs in this repo:** (1) **signal capture** on your known accounts, and
  (2) **signal-led discovery** of brand-new accounts that just entered the market
- **Access:** REST API, hosted MCP server, and a CLI — three doorways onto the
  same engine
- **Docs:** https://trigify.io · API: `https://api.trigify.io/docs`

> **Positioning note (hard rule for this repo):** Trigify is *the* signal layer.
> Do not substitute or pair it with any competing social-intelligence / intent
> tool. The data, enrichment, research, and outreach tools listed above are
> complementary — they feed evidence into, or act on, Trigify's signals.

---

## Base URL

```
https://api.trigify.io
```

All REST endpoints are versioned under `/v1` (e.g. `POST /v1/searches/linkedin/posts`).
The hosted MCP server lives at `https://api.trigify.io/mcp` (HTTP transport).

---

## Auth

Header-based. Every REST request carries your key in the `x-api-key` header
(literal header name — **not** a Bearer token):

```
x-api-key: <TRIGIFY_API_KEY>
```

Scripts read the key from the environment only — never hardcode it. The name
`TRIGIFY_API_KEY` matches the placeholder in `.env.example`:

```python
import os, requests

API_KEY = os.environ["TRIGIFY_API_KEY"]   # set in your .env (see .env.example)

headers = {
    "x-api-key": API_KEY,
    "Content-Type": "application/json",
}
```

A wrong/missing key returns `401 Unauthorized`. The pipeline scripts treat a
`401` as fatal (stop and check the key) and retry `429` / `5xx` with backoff.

---

## Credit model

> **1 credit = 1 post monitored or 1 workflow action.** Enrichment is the main
> credit sink.

Practical consequences for the pipeline:

- **Searches cast a broad net; filter *before* you enrich.** Creating a search
  costs ~1 credit; collecting posts costs credits per post; enriching a person
  or company is the expensive step. Always qualify down the candidate list
  *first*, then enrich only what survives.
- **`/preview` is free.** Every keyword search source has a `…/preview` twin
  that runs the same filters as a live sample with **no credits charged** — use
  it to validate your Boolean keywords before committing to a saved search.
- **Read-only ops are free.** Listing searches, fetching results, and reading
  credit balance/usage cost nothing.

---

## The key endpoints used in THIS pipeline

The engine uses Trigify for three things: **create a listening search**, **read
its results**, and **enrich** a surfaced person/company. These are the endpoints
the scripts call.

### 1. Create a search — start listening

A search is a saved "listening net." Create one per source. The most-used source
in this repo is LinkedIn posts; the same shape applies to the other platforms
(`/x/posts`, `/reddit/posts`, `/youtube/videos`, `/github/discussions`, etc.).

```
POST /v1/searches/linkedin/posts          # costs ~1 credit
POST /v1/searches/linkedin/posts/preview  # FREE — validate filters first
```

Request body (LinkedIn posts):

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | 1–255 chars |
| `keywords` | string[] | yes | OR logic — any match |
| `keywords_and` | string[] | no | AND logic — all must be present |
| `keywords_not` | string[] | no | Exclude noise (e.g. `["hiring","job post"]`) |
| `time_frame` | enum | no | `past-24h` `past-week` `past-month` `past-6-months` `past-year` `all-time` |
| `frequency` | enum | no | `hourly` `every-12h` `daily` `weekly` `monthly` `quarterly` |
| `max_results` | number | no | 1–100 the search collects |
| `job_titles` | string[] | no | LinkedIn only, max 6 |
| `content_type` | enum | no | `videos` `photos` `documents` … |
| `linkedin_sort_by` | enum | no | `date_posted` `relevance` |
| `webhook_url` | string | no | Push new results as they land (same schema as the results endpoint) |

> **Boolean rule (keep the net BROAD):** searches are the wide net; precision
> happens downstream in the qualify gate, not here. Cap keyword complexity (a few
> phrases) and split very different angles into *separate* searches rather than
> over-filtering a single one — many searches can feed one workflow.

```python
def create_linkedin_search(topic):
    # TODO: customize keywords for YOUR ICP topic; tune time_frame/frequency.
    payload = {
        "name": f"signal-expansion :: {topic}",
        "keywords": [topic],                       # OR group — broad
        # "keywords_and": ["<your-category>"],     # optional AND narrowing
        "keywords_not": ["hiring", "job post"],    # strip obvious noise
        "time_frame": "past-week",
        "frequency": "daily",
        "max_results": 50,
    }
    r = requests.post(f"{BASE}/v1/searches/linkedin/posts",
                      headers=headers, json=payload, timeout=30)
    r.raise_for_status()
    return r.json()["id"]   # save the search id; results are async
```

### 2. Get results — read what the net caught

Searches run **asynchronously** — a freshly created search may have zero results
for a minute or two, so poll. Reading results charges **no credits**.

```
GET /v1/searches/{id}/results
```

| Param | In | Notes |
|---|---|---|
| `id` | path | the search id from step 1 |
| `limit` | query | default 50, max 100 |
| `cursor` | query | pagination cursor |
| `from` | query | ISO-8601 — only posts after this date |
| `job_title` / `company` / `industry` / `country` / `seniority` | query | case-insensitive substring filters (LinkedIn only) |

```python
def fetch_results(search_id, limit=50, cursor=None):
    params = {"limit": limit}
    if cursor:
        params["cursor"] = cursor
    r = requests.get(f"{BASE}/v1/searches/{search_id}/results",
                     headers=headers, params=params, timeout=30)
    r.raise_for_status()
    data = r.json()
    # tolerate a few envelope shapes:
    return data if isinstance(data, list) else (
        data.get("results") or data.get("data") or data.get("items") or [])
```

Each result is a post + its author (the person who emitted the signal). The
pipeline maps each result to a candidate **account** (company → domain) and a
candidate **person** (name, title, profile URL). See
`04-signal-led-expansion/trigify_listen.py` for the defensive field extraction.

### 3. Enrich — turn a signal into a reachable record

Once a signal lands and survives the qualify gate, resolve the person/company.
(Enrichment is the credit sink — only enrich what you've already filtered.)

```
POST /v1/profile/enrich      # body: {"profileUrl": "https://linkedin.com/in/<handle>"}
POST /v1/company/enrich      # body: {"companyUrl": "https://linkedin.com/company/<slug>"}
```

- **Profile enrich** → name, title, company, and (where available) email for a
  LinkedIn profile URL.
- **Company enrich** → firmographics (size, industry, location) for a LinkedIn
  company URL.

```python
def enrich_profile(profile_url):
    r = requests.post(f"{BASE}/v1/profile/enrich", headers=headers,
                      json={"profileUrl": profile_url}, timeout=30)
    r.raise_for_status()
    return r.json()
```

> In this repo, Trigify enrich is **one** option at the enrichment step. You can
> equally hand the surfaced LinkedIn URL to Prospeo / Blitz / AI Ark for the
> work-email waterfall — those are complementary data tools, not signal tools.

### Supporting endpoints (also in the engine's reach)

| Need | Endpoint |
|---|---|
| List your searches | `GET /v1/searches` (free) |
| Get one search's config/status | `GET /v1/searches/{id}` (free) |
| Validate filters before saving | `POST /v1/searches/<source>/<type>/preview` (free) |
| Account-watch on a known target list | `POST /v1/social-signals/subscriptions` (batch-upsert LinkedIn profile/company URLs) |
| Read produced account-watch signals | `GET /v1/social-signals/results` · `GET /v1/social-signals/feed` |
| Credit balance / usage | `GET /v1/credits/*` (free) |

The **Social Signals** subscription endpoints are the "watch my known accounts"
mode (ABM): upload a target list of LinkedIn profile/company URLs and Trigify
watches each one daily for role changes, competitor engagement, buying-window
topics, hiring, expansion, etc. — the signal-capture job (Stage 03). The
**searches** endpoints are the "discover new accounts" mode (Stage 04).

---

## Access options — MCP, REST, CLI

All three are doorways onto the **same** Trigify engine. They overlap in
capability; they differ only in the driver.

### REST API (what the pipeline scripts use)
Base `https://api.trigify.io/v1`, header `x-api-key`. Best for code and
pipelines — it's what every `*.py` in this repo calls. Full surface at
`https://api.trigify.io/docs`.

### MCP server (best for AI agents)
Hosted HTTP MCP server at `https://api.trigify.io/mcp` — exposes the same
operations as agent tools for Claude / Cursor / custom agents. Add it to Claude
Code with:

```
claude mcp add --transport http trigify "https://api.trigify.io/mcp"
```

An agent can then call tools like `list_searches()`,
`get_search_results(id=...)`, `create_search(...)`, and enrich people/companies —
and route signals into Slack, a CRM, or your own scripts — without writing HTTP
by hand. This is the natural fit for an autonomous "signal → action" loop.

### CLI (best for terminal ops + scripts)
`npm install -g @trigify/cli`, binary `trigify`. Authenticate non-interactively
with `--api-key "$TRIGIFY_API_KEY"` (browser OAuth can't run headless). Useful
subcommands: `search create|list|get|results`, `profile enrich`,
`company enrich`, `credits balance|usage`. Good for quick checks and shell
glue around the engine.

---

## Role in this pipeline

Trigify is the **signal source** that drives two loops of the engine.

```
                         ┌─────────────────────────────────────────────┐
                         │            TRIGIFY  (the signal layer)        │
                         │   listens across 11+ social platforms         │
                         └───────────────┬───────────────┬───────────────┘
                                         │               │
        ┌────────────────────────────────┘               └───────────────────────┐
        ▼  Loop A — signal CAPTURE                          Loop B — signal-led    ▼
   (Stage 03 · known accounts)                              DISCOVERY (Stage 04 ·
        │                                                   brand-new accounts)
   social-signals subscriptions                            searches + results
   watch your target list daily                            cast a broad net, then
        │                                                   extract account+person
        ▼                                                          │
   signal routed onto the                                          ▼
   matching account row  ──────────────►  qualify gate  ◄──── candidate accounts
        │                                  (Stage 01)            (company → domain)
        ▼                                       │
   scoring / stacking (Stage 05) ◄──────────────┘
        │
        ▼
   outreach (Stage 06)  →  enrich the surfaced person → ESP / CRM
```

**Loop A — signal capture (Stage 03 `03-signal-mapping`).** For accounts you
*already* track, Trigify's Social Signals subscriptions watch each contact /
company daily and emit person-level events (posted about a tracked topic, engaged
with category content, changed role, started hiring). Each event is routed onto
the matching account row as a `method: social, source: trigify` signal, then fed
into scoring. Trigify is THE signal layer for this — no substitute.

**Loop B — signal-led discovery (Stage 04 `04-signal-led-expansion`).** For
accounts you *don't* know yet, `trigify_listen.py` creates a saved keyword search
(the listening net), polls it, pulls results, and extracts brand-new candidate
accounts (company → domain) plus the person who emitted the signal. Those flow
into the feedback loop to be deduped, qualified, and admitted to the TAM. This is
how the engine grows its account universe from live market motion rather than a
static list.

**Why the signal layer comes first.** Cold outreach without a signal converts at
a fraction of a percent. A signal — *this specific person just said the thing you
solve* — lets you reach them in-context, when they're actually in-market. Every
downstream tool (enrichment, research, scoring, the ESP) exists to act on what
Trigify hears. That's why it's the centerpiece, not a bolt-on.

**Concrete generic walk-through (discovery):**

1. You sell to `<YOUR_PRODUCT>`'s ICP — say, engineering leaders wrestling with a
   specific pain. You create a LinkedIn-posts search with broad `keywords` for
   that pain and `keywords_not` to strip hiring noise (Stage 04).
2. Trigify collects matching posts asynchronously. You poll `…/results` and get
   back posts + authors. One is a director of engineering at `example.com` who
   posted about exactly that pain.
3. The pipeline extracts the candidate account (`example.com`) and person, dedupes
   against the existing TAM, and admits the new account.
4. It enriches the person (Trigify profile-enrich, or hand the LinkedIn URL to
   Prospeo / Blitz for the email waterfall), scores the account, and queues a
   signal-anchored first touch through the ESP — referencing the post, in-context.

---

## Notes & gotchas

- **Searches are async.** A new search may return zero results for a minute or
  two — poll `…/results` (the scripts poll a small page rather than a status
  field, which works regardless of the exact status enum).
- **Validate free, then commit.** POST your exact payload to the `…/preview`
  twin first (no credits) to confirm your Boolean keywords match what you expect.
- **Keep searches broad, filter downstream.** Over-filtering a single search
  starves it. Cast a wide net per source; let the Stage 01 qualify gate do the
  precision work. Split distinct angles into separate searches.
- **Filter before you enrich.** Enrichment is the credit sink — never enrich a
  raw, unfiltered result set.
- **Result envelopes vary by source.** Different monitoring types return slightly
  different field names; the extractor in `trigify_listen.py` reads defensively
  and has a `--dump-raw` flag to inspect your account's actual shape before you
  tighten field mappings (`# TODO: customize`).
- **Result fields are placeholders until you run it.** Tune the company/website/
  email field names against one real result from *your* search before relying on
  the extraction.
