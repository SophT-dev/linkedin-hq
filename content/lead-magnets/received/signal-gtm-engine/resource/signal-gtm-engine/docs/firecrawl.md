# Firecrawl — Web Scraping & URL Discovery

> Condensed reference for how this repo uses Firecrawl. Source docs are far longer;
> this covers only what the signal-gtm-engine pipeline actually needs.

## What it is

Firecrawl is a web-scraping API that turns any URL into clean, LLM-ready **markdown**
(or structured JSON). You give it a URL; it fetches the page, strips the nav / footer /
cookie-banner boilerplate, and returns just the readable content. It also discovers
every URL on a site (`/v1/map`) and can search the open web. No headless-browser plumbing
to maintain on your side — it handles JS rendering, retries, and caching.

In this repo Firecrawl is **complementary infrastructure**, not a signal source: it is
the cheapest reliable way to read what a company *says it does* on its own website, which
is exactly the input the qualification stage needs.

## Role in this pipeline

Firecrawl's job here is **Stage 01 — Account Qualify**: batch-scrape each surviving
company's homepage to clean markdown so an LLM can make a binary KEEP/DROP fit decision
over real homepage copy (not a thin one-line description). See
`01-account-qualify/README.md` → sub-step **(c) Firecrawl homepage scrape**
(`firecrawl_scrape.py`).

```
TAM rows (domain, name, short description)
   → coarse LLM exclusion
   → Firecrawl homepage scrape  ← THIS TOOL  (/v1/scrape, markdown, onlyMainContent)
   → deterministic regex clean
   → final LLM KEEP/DROP verdict
```

It can also map a site to find the most informative page (`/about`, `/products`,
`/what-we-do`) before scraping, and search the open web for external context — but the
core, always-on use is the homepage read.

> Firecrawl reads **fit** (what a company is/does). It does **not** read **intent /
> buying signal** — that is the signal layer's job (Trigify), kept strictly separate.

## Base URL & auth

| | |
|---|---|
| **Base URL** | `https://api.firecrawl.dev` |
| **Auth header** | `Authorization: Bearer <FIRECRAWL_API_KEY>` |
| **Content type** | `application/json` |
| **Key env var** | `FIRECRAWL_API_KEY` (keys look like `fc-...`) |

Scripts read the key from the environment only — never hardcode it:

```python
import os, requests
headers = {
    "Authorization": f"Bearer {os.environ['FIRECRAWL_API_KEY']}",
    "Content-Type": "application/json",
}
```

Copy the repo-root `.env.example` to `.env` and fill in your own key. No key is ever
written to disk by the pipeline scripts.

## Endpoints used here

| Endpoint | Method | Does | Credit cost |
|---|---|---|---|
| `/v1/scrape` | POST | One URL → clean markdown / HTML / structured JSON | 1 / page (+4 in JSON mode = 5) |
| `/v1/map` | POST | Discover all URLs on a site (nav + footer + sitemap) | 1 / call, flat |
| `/v1/search` | POST | Search the open web, return scraped results | variable |
| `/v1/batch/scrape` | POST | Scrape many known URLs in one async job | 1 / page (+4 each in JSON mode) |

> Versioning note: Firecrawl exposes some endpoints under both `/v1/...` and `/v2/...`.
> This repo standardizes on **`/v1/`** for every call so all scripts hit one consistent
> path. If you adopt a newer batch path (`/v2/batch/scrape`), only update the base path —
> the request/response shapes shown below are the same.

### `/v1/scrape` — single page (the workhorse)

```json
POST https://api.firecrawl.dev/v1/scrape
{
  "url": "https://example.com",
  "formats": ["markdown"],
  "onlyMainContent": true
}
```

- `onlyMainContent: true` (default) strips nav / footer / sidebars — keep it on.
- `maxAge` controls cache freshness in ms (default `172800000` = 2 days). For prospect
  research set `604800000` (1 week): company sites rarely change daily and cache hits are
  much faster/cheaper. `maxAge: 0` forces a fresh scrape.
- **Structured JSON** mode (LLM-powered extraction) costs **5 credits/page** — reserve it
  for high-value targets; the repo default is plain markdown + a separate cheap LLM read:

```json
{
  "url": "https://example.com",
  "formats": [{
    "type": "json",
    "prompt": "Does this company build its own software/platform, or sell services? What does it offer and to which industries?",
    "schema": {
      "type": "object",
      "properties": {
        "company_type": {"type": "string", "description": "product | services | hybrid"},
        "primary_offerings": {"type": "string"},
        "target_industries": {"type": "string"}
      }
    }
  }],
  "onlyMainContent": true
}
```

### `/v1/map` — URL discovery (cheapest)

```json
POST https://api.firecrawl.dev/v1/map
{ "url": "https://example.com", "search": "products services about", "limit": 30 }
```

Returns a `links` array (real, verified URLs — no hallucination). Adding `search` orders
results most-relevant-first, so you can pick the best page (`/about`, `/products`) to
scrape next. One flat credit regardless of how many URLs come back.

### `/v1/search` — open-web context (optional)

```json
POST https://api.firecrawl.dev/v1/search
{ "query": "<company name> funding round", "limit": 5 }
```

Searches the open web (not site-internal) and returns each result already scraped to
markdown. Useful for external context (funding, news, partnerships) when the homepage
alone isn't enough.

### `/v1/batch/scrape` — many URLs, one async job

```json
POST https://api.firecrawl.dev/v1/batch/scrape
{
  "urls": ["https://example.com", "https://example.com/about"],
  "formats": ["markdown"],
  "onlyMainContent": true
}
```

Returns immediately with a job id; poll `GET /v1/batch/scrape/<id>` for results. Results
are retained ~24h after completion. Same per-page cost as single scrape. For very large
TAMs the repo instead loops `/v1/scrape` with a per-row checkpoint (see
`firecrawl_scrape.py`) so a crashed run resumes without re-paying for already-scraped
rows — pick whichever fits your runner.

## Credit notes

- **Scrape / batch:** 1 credit per page in markdown mode; **5 per page** in JSON
  (LLM-extraction) mode (1 base + 4).
- **Map:** 1 credit per call, flat, no matter how many URLs return — the cheapest way to
  discover pages.
- **Search:** variable, depends on result count.
- **Cheap path = default path.** For qualification, scrape homepage → markdown (1 credit),
  then run a cheap separate LLM read. Only spend the 5-credit JSON mode on high-value
  accounts where you want the extraction done inside Firecrawl.
- **Cache to save credits/time:** a high `maxAge` (e.g. 1 week) reuses recent scrapes
  instead of re-fetching. Re-running a resumable job skips rows already in the checkpoint.
- **Rate limits:** when fanning out (e.g. from a no-code runner), keep concurrency low
  (~2 in flight, ~2s between calls) to avoid `429`s. The repo scripts add retries +
  backoff for the same reason.

Rough planning: homepage-only qualification of **N** companies ≈ **N credits**
(markdown). Adding a mapped second page ≈ **2N**. JSON-mode extraction ≈ **5N** — usually
not worth it at full-TAM scale.

## Scrape formats

`markdown` (default — use this), `html`, `rawHtml`, `json` (LLM-structured),
`screenshot`, `links`, `images`, `summary`. For this pipeline, `markdown` is the only one
you normally need; the deterministic clean step downstream does the rest.
