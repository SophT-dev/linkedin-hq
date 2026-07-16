# AI Ark — Company & People Data API

> **Source:** <https://docs.ai-ark.com/docs/getting-started> (+ `/docs/authentication`,
> `/docs/rate-limits`, `/docs/mcp`, and the per-endpoint pages under `/reference/`)
> **Machine-readable index:** <https://docs.ai-ark.com/llms.txt> (all pages in
> Markdown + endpoints in OpenAPI)
> **Last verified:** 2026-06-23
> All endpoints, methods, params, and limits below are taken verbatim from the
> AI Ark docs — nothing here is inferred.

---

## What it is

AI Ark is a B2B **company & people data API** — a structured data + enrichment
platform. Per its own docs it covers **400M+ people and 68.4M companies** ("70M+
companies / 500M+ people" in marketing rounding) and exposes them through a small
set of POST search + enrichment endpoints that return paginated JSON.

In **this pipeline** it is a **TAM / people data source**, used the same way as
Prospeo and Blitz: you give it ICP filters (industry, headcount, location,
keywords, tech, lookalike domains) and it returns companies and people you fold
into the raw account universe. It is *complementary* to the other data tools, not
a replacement — see "Role in this pipeline" below.

It is **not** a signal/intent tool. The signal layer in this engine is Trigify.
AI Ark only supplies firmographic + people records (and contact enrichment:
emails, mobile phones, reverse lookup).

---

## Base URL

```
https://api.ai-ark.com/api/developer-portal
```

Every documented endpoint is a path under this base (e.g. the company search is
`POST {BASE}/v1/companies`). The docs site `https://docs.ai-ark.com` is
documentation only — never an API host.

---

## Authentication

Pass your API key in the **`X-TOKEN`** request header. No `Bearer` prefix, no
OAuth dance for the data endpoints — just the raw key value.

> The getting-started/first-steps prose mentions "OAuth 2.0 / Bearer" in passing,
> but the authoritative **Authentication** reference and every per-endpoint page
> use `X-TOKEN`. The repo's `aiark_search.py` is already built against `X-TOKEN`.
> Use `X-TOKEN`.

Required headers on every request:

```
X-TOKEN: <YOUR_API_KEY>
Content-Type: application/json
```

Minimal cURL (from the docs):

```bash
curl -H "X-TOKEN: YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d "{}" \
     "https://api.ai-ark.com/api/developer-portal/v1/companies"
```

**In scripts, read the key from the environment — never hardcode it:**

```python
import os
API_KEY = os.environ["AI_ARK_API_KEY"]   # matches .env.example
HEADERS = {"X-TOKEN": API_KEY, "Content-Type": "application/json"}
```

The env var name in this repo is **`AI_ARK_API_KEY`** (see `.env.example`).

---

## Rate limits & quota

Global, across all endpoints:

| Window      | Limit                  |
|-------------|------------------------|
| per second  | 5 requests             |
| per minute  | 300 requests           |
| per hour    | 18,000 requests        |

- Bulk search endpoints return up to `size` records per request, so at `size=100`
  the *record* throughput is much higher (docs quote ~500 rec/s, 30k/min, 1.8M/hr).
- Exceeding the quota returns **`429 Too Many Requests`**; limit windows reset
  every 60s.
- Each AI Ark service has its own default concurrency limit (raisable on request);
  see `/docs/customizing-quotas`.
- Remaining credits: `GET /v1/payments/credits` → `{ "total": <int> }` (see below).

---

## Company data endpoints

### Company Search — `POST /v1/companies`

Full URL: `https://api.ai-ark.com/api/developer-portal/v1/companies`
Reference: <https://docs.ai-ark.com/reference/company-search-1.md>

The primary firmographic search. Filter by an `account` object and paginate.

**Request body (JSON):**

| Param              | Type    | Required | Notes |
|--------------------|---------|----------|-------|
| `page`             | integer | yes      | zero-based page number (default `0`) |
| `size`             | integer | yes      | items per page, `0`–`100` (default `10`) |
| `account`          | object  | no       | filter object: identification, details, financial/size, advanced filters |
| `lookalikeDomains` | array   | no       | up to 5 LinkedIn URLs or domains → find similar companies |
| `lists`            | object  | no       | references to lists for excluding company IDs |

**Response (200):** Spring-style page object —

- `content[]` — company objects with nested `summary`, `links`, `contact`,
  `financial`, `location`, `technologies`, `industries`, `keywords`, `languages`,
  SIC/NAICS codes, and a last-update timestamp.
- `pageable`, `totalElements`, `totalPages`, `first`/`last`/`empty` — pagination.

**Per-query cap matters:** like every provider in stage `00`, a single broad
filter combination only pages so deep. Split the search across many **narrow,
overlapping headcount bands** (one query per band) to escape the cap and avoid
over-sampling big well-known companies. This is exactly what `00-tam-build/aiark_search.py`
does.

---

## People data endpoints

### People Search — `POST /v1/people`

Full URL: `https://api.ai-ark.com/api/developer-portal/v1/people`
Reference: <https://docs.ai-ark.com/reference/people-search-1.md>

Find people by company-level (`account`) and person-level (`contact`) filters.
Returns records **synchronously** plus a `trackId` you can reuse to enrich emails
in bulk (see Email Finder).

**Request body (JSON):**

| Param     | Type    | Required | Notes |
|-----------|---------|----------|-------|
| `account` | object  | no       | company-based filters (`AccountFilter`) |
| `contact` | object  | no       | person-based filters (`ContactFilter`) |
| `lists`   | object  | no       | exclusion lists (up to 10 lists × 10K items) |
| `page`    | integer | yes      | zero-based page number (default `0`) |
| `size`    | integer | yes      | results per page, `0`–`100` (default `10`) |

**Example body** (from docs):

```json
{
  "account": {
    "domain": { "any": { "include": ["example.com"] } },
    "name":   { "any": { "include": { "mode": "SMART", "content": ["Acme"] } } }
  },
  "contact": {
    "fullName": { "any": { "include": { "mode": "SMART", "content": ["Jane Doe"] } } }
  },
  "page": 0,
  "size": 10
}
```

**Response (200):** `content[]` of person objects (id, identifier, `profile`
name/title/picture, links, location, educations, skills, position history,
company details, department/function, statistics), plus `pageable`,
`totalElements`, `totalPages`, and a **`trackId`** for the search.

---

### Export People with Email (bulk, async) — `POST /v1/people/export`

Reference: <https://docs.ai-ark.com/reference/people-export-with-email.md>

Bulk version of People Search that resolves **emails** and returns results via
**webhook**. Same `account` / `contact` / `lists` filters.

| Param     | Type    | Required | Notes |
|-----------|---------|----------|-------|
| `page`    | integer | yes      | zero-based |
| `size`    | integer | yes      | `1`–`10000` max per export |
| `webhook` | string  | yes      | URI; results are POSTed here on completion |
| `account` / `contact` / `lists` | object | no | filters (as in People Search) |

**Flow:** submit → immediate `200` with `trackId`, `state: "PENDING"`,
`statistics{total,found}` → background job → results POSTed to your `webhook`
(auto-retried up to 3×). `size > 10000` → `400 pagination limit exceeded`.
Webhook payload schema: <https://docs.ai-ark.com/reference/export-people-webhook.md>.

---

### Export Single Person with Email — `POST /v1/people/export/single`

Reference: <https://docs.ai-ark.com/reference/people-export-single.md>

Enrich **one** person (synchronous) by AI Ark `id` or LinkedIn `url`.

| Param | Type   | Required | Notes |
|-------|--------|----------|-------|
| `id`  | string | one of   | the person's AI Ark id (from a People Search result) |
| `url` | string | one of   | the person's LinkedIn profile URL |

At least one of `id` / `url` is required (`400` if both empty). Returns a full
person profile including an `email[]` array (address, MX records, validation
status), plus links, location, education, certifications, position groups,
company, skills, languages, industry, department. `404` if person/email not found.

---

### Find Emails by Track ID (async) — `POST /v1/people/email-finder`

Reference: <https://docs.ai-ark.com/reference/people-email-finder-by-track-id.md>

Resolve emails for a previous People Search, by reusing its `trackId`.

| Param     | Type           | Required | Notes |
|-----------|----------------|----------|-------|
| `trackId` | string (UUID)  | yes      | from a People Search response |
| `webhook` | string (URI)   | no       | async completion callback |

`trackId` is **single-use and expires (~6h)**. Returns `trackId`, `state`
(`PENDING`/`COMPLETED`), and `statistics{total,found}`.
`404` = "track id not found, expired, or already used".

**Async email flow:**
1. `POST /v1/people` → get `trackId`
2. `POST /v1/people/email-finder` with that `trackId` (+ optional `webhook`)
3. Poll results, or wait for the webhook (payload:
   <https://docs.ai-ark.com/reference/find-emails-webhook.md>)

**Retrieve results — `GET /v1/people/email-finder/{trackId}/inquiries`**
(<https://docs.ai-ark.com/reference/get-email-finder-results-by-track-id.md>)
Path param `trackId`; query `page` (default 0), `size` (1–100, default 10).
Returns `content[]` of inquiries (`refId`, `state` e.g. `DONE`,
`input{firstname,lastname,domain}`, `output` email + verification) with standard
page fields. Companion endpoints: `.../email-finder-statistics-by-track-id`.

---

### Mobile Phone Finder — `POST /v1/people/mobile-phone-finder`

Reference: <https://docs.ai-ark.com/reference/people-mobile-phone-finder.md>

Find mobile numbers for one person.

| Param      | Type          | Required    | Notes |
|------------|---------------|-------------|-------|
| `linkedin` | string (URI)  | conditional | LinkedIn profile URL — OR — |
| `domain`   | string        | conditional | company domain (must pair with `name`) |
| `name`     | string        | conditional | full name (must pair with `domain`) |

Provide **either** `linkedin` **or** `domain`+`name`. Returns `id`, `linkedin`,
and `data` (array of phone numbers). `404` if no match.

---

### Reverse People Lookup — `POST /v1/people/reverse-lookup`

Reference: <https://docs.ai-ark.com/reference/people-reverse-lookup.md>

Identify a person from a single contact string (email or phone, etc.).

| Param    | Type   | Required | Notes |
|----------|--------|----------|-------|
| `search` | string | yes      | "the contact information to search for (email address, phone number, etc.)" |

Returns a full person object (profile, contact links, location, position groups,
education, skills, certifications, languages, industry, department, company
details). `404` "Data not found" if nothing matches.

---

### Personality Analysis — `POST /v1/people/...`

Reference: <https://docs.ai-ark.com/reference/people-analysis.md>
Personality/DISC-style analysis for a person (useful for outreach tone). Pull the
exact path + params from the reference page before wiring it up.

---

## Utility endpoints

| Purpose                | Method & path |
|------------------------|---------------|
| Remaining credits      | `GET /v1/payments/credits` → `{ "total": <int> }` (<https://docs.ai-ark.com/reference/fetch-credit.md>) |
| Create / update a list | `POST` — <https://docs.ai-ark.com/reference/save-list.md> (lists used by the `lists` exclusion filter) |
| Resend email webhook   | <https://docs.ai-ark.com/reference/resend-email-finder-webhook-1.md> |
| Resend export webhook  | <https://docs.ai-ark.com/reference/resend-export-people-webhook-1.md> |

Always call `GET /v1/payments/credits` before a large bulk export so a run
doesn't die mid-way on exhausted credits.

---

## MCP server (optional)

AI Ark ships a remote **MCP server** (Cursor / Windsurf / Claude Desktop):

```
https://api.ai-ark.com/v1/mcp?token={YOUR-API-KEY}
```

It exposes direct API access, documentation search, and live account data as MCP
tools. Reference: <https://docs.ai-ark.com/docs/mcp> and
<https://docs.ai-ark.com/reference/mcp.md>. Pass the key in the `token` query
param; in this repo that key comes from `AI_ARK_API_KEY` — don't paste the literal
value into a committed config.

---

## Role in THIS pipeline

AI Ark sits in **Stage `00` — TAM Build** as one of three interchangeable
company/people **data sources**:

| Source   | Env var          | Stage-00 script              | What it's good for |
|----------|------------------|------------------------------|--------------------|
| Prospeo  | `PROSPEO_API_KEY` | `00-tam-build/prospeo_search.py` | company + people search/enrich |
| Blitz    | `BLITZ_API_KEY`   | `00-tam-build/blitz_search.py`   | employee / company directory |
| **AI Ark** | **`AI_ARK_API_KEY`** | **`00-tam-build/aiark_search.py`** | broad firmographics + lookalikes + people/contact enrichment |

How it fits:

1. **TAM build (stage 00).** Run `aiark_search.py` with your ICP filters, sliced
   into narrow overlapping headcount bands, to pull companies into
   `data/companies_tam.jsonl`. Each row is tagged `source: "aiark"` so the origin
   stays auditable when you dedup against Prospeo / Blitz rows. **`domain` is the
   join key** for the whole engine — normalize it on write (lowercase, no `www.`,
   no scheme/path).
2. **Lookalike expansion.** Feed up to 5 known good-fit domains into
   `lookalikeDomains` to widen the net beyond explicit filters.
3. **People + contact data.** `POST /v1/people` for buyer-persona contacts at TAM
   accounts; then `/v1/people/export` (bulk, webhook) or `/v1/people/export/single`
   / `/v1/people/email-finder` for emails, and `/v1/people/mobile-phone-finder`
   for phones — complementary to Prospeo's contact data, not a duplicate of it.
4. **Hand-off.** Qualification (stage `01`) and the system-of-record (stage `02`)
   key off the normalized `domain`, regardless of which source produced the row.

**Boundaries:**
- AI Ark is **firmographic + people + contact** data only. It does **not** provide
  buying/intent signals — that is Trigify's job (the dedicated signal layer).
- Treat Prospeo / Blitz / AI Ark as redundant nets: union their outputs, dedup on
  `domain`, keep `source` for provenance. More sources = better long-tail coverage,
  since each provider caps and skews differently per query.
