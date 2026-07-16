# Blitz API — People & Company Data (employee / people backfill)

> Condensed reference for the signal-led GTM engine. Source: public Blitz API docs
> (`docs.blitz-api.ai`). This file is grounded in the published API reference only —
> no client data, no keys.

## What it is

Blitz is a **flat-rate B2B people + company data API**. You give it a company
(LinkedIn URL or domain) or an ICP filter set, and it returns matching people
(name, title, location, LinkedIn URL, work history) and company firmographics.
It also enriches a LinkedIn profile URL into a verified work email.

In this pipeline Blitz is the **employee / people backfill layer**: once Trigify
surfaces a buying signal at an account (the signal layer), Blitz turns that account
into the *right humans to reach* — decision-makers, buying committee, or the full
team — then hands their LinkedIn URLs to the email-enrichment step. It is one of
several complementary people-data sources (alongside Prospeo and AI Ark); use it as
a primary source or a waterfall fallback when another source returns no contacts.

Coverage (per published plan pages): 380M+ contacts, 60M+ companies, 62M+ verified
emails (~97% claimed email accuracy), plus US mobile phone numbers on the top tier.

## Base URL

```
https://api.blitz-api.ai/v2
```

All endpoints are `POST` with a JSON body, except the account health check
(`GET /account/key-info`).

## Auth

Header-based. Every request carries your key in the `x-api-key` header (literal
header name, not a Bearer token):

```
x-api-key: <BLITZ_API_KEY>
```

- Read the key from the environment as `BLITZ_API_KEY` (matches `.env.example`).
  Never hardcode it; never put it in client-side code — route through your backend.
- **Health-check first:** `GET /v2/account/key-info` returns `valid`,
  `remaining_credits`, `max_requests_per_seconds`, `allowed_apis`, and
  `active_plans`. Hit this before a batch job to confirm the key is live and to
  read your real rate limit.
- Auth errors: `401` (missing/invalid key), `402` (key valid but plan/limit
  reached), `404` (key not found in their system).

Example health check:

```bash
curl "https://api.blitz-api.ai/v2/account/key-info" \
  -H "x-api-key: ${BLITZ_API_KEY}"
```

## Key endpoints

All paths are relative to the base URL `https://api.blitz-api.ai/v2`.

### 1. Employee Finder — `POST /search/employee-finder`

Search **all** employees at a single company, with pagination. Best for team
mapping and multi-threaded outreach (every matching person, not just the best one).

| Param | Type | Req | Default | Notes |
|---|---|---|---|---|
| `company_linkedin_url` | string | Yes | — | Full company LinkedIn URL |
| `country_code` | array | No | `["WORLD"]` | 2-letter ISO codes, or `["WORLD"]` for global |
| `continent` | array | No | — | Continent enum (case-sensitive) |
| `sales_region` | array | No | — | e.g. `["NORAM"]` (case-sensitive) |
| `job_level` | array | No | — | Seniority enum, e.g. `["VP","Director"]` (case-sensitive) |
| `job_function` | array | No | — | Department enum, e.g. `["Sales & Business Development"]` (case-sensitive) |
| `min_connections_count` | number | No | `0` | 0–500; filters out inactive profiles |
| `max_results` | number | No | `50` | Per page, 1–50 |
| `page` | number | No | `1` | Page-based pagination, starts at 1 |

Pagination is **page-based**: response returns `total_pages`; loop `page` until you
reach it. Capped at 200 pages / 10k results. Person fields are returned **directly**
in `results[]` (no nesting).

`job_level`, `job_function`, `sales_region`, `continent` are **case-sensitive
enums** — `"vp"` instead of `"VP"` silently returns 0 results.

```bash
curl -X POST "https://api.blitz-api.ai/v2/search/employee-finder" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${BLITZ_API_KEY}" \
  -d '{
    "company_linkedin_url": "https://www.linkedin.com/company/acme",
    "job_level": ["VP", "Director"],
    "job_function": ["Sales & Business Development"],
    "sales_region": ["NORAM"],
    "max_results": 50,
    "page": 1
  }'
```

### 2. Find People — `POST /search/people`

Search decision-makers **across many companies at once**. Combine company-level
filters (industry, size, HQ, keywords, revenue, founded year, NAICS/SIC) with
person-level filters (title, function, level, location, education) in one call.

Body has two main objects plus paging:

- **`company`** — `linkedin_url[]`, `name{include,exclude}`,
  `industry{include,exclude}`, `type{include,exclude}`,
  `employee_range[]` (`"1-10"`…`"10001+"`), `employee_count{min,max}`,
  `min_linkedin_followers`, `revenue{min,max}`, `naics_code{}`, `sic_code{}`,
  `web_traffic{min,max}`, `ad_spend{min,max}`, `keywords{include,exclude}`,
  `founded_year{min,max}`, `hq{city{},country_code[],continent[],sales_region[]}`.
- **`people`** — `job_title{include_linkedin_headline,include,exclude}`,
  `job_function[]`, `job_level[]`, `min_connections`,
  `location{city[],country_code[],continent[],sales_region[]}`,
  `education{include,exclude}`.
- **`max_results`** — 1–50 (default 10). **`cursor`** — pass back for next page.

Pagination is **cursor-based**: pass the returned `cursor` into the next request;
stop when `cursor` is `null`. Capped at 50k results.

**Filter logic:** all filters AND together; multiple values inside one filter OR
together. **Title matching:** plain `"CEO"` is full-text (also matches `Co-CEO`);
wrap in brackets `"[CEO]"` for exact match. Mixed arrays allowed.

```bash
curl -X POST "https://api.blitz-api.ai/v2/search/people" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${BLITZ_API_KEY}" \
  -d '{
    "company": {
      "industry": { "include": ["Software"], "exclude": [] },
      "employee_range": ["51-200", "201-500"],
      "hq": { "country_code": ["US"] }
    },
    "people": {
      "job_title": { "include": ["[VP Sales]", "Head of Revenue"], "exclude": [] },
      "location": { "country_code": ["US"] },
      "min_connections": 500
    },
    "max_results": 50,
    "cursor": null
  }'
```

### 3. Waterfall ICP Search — `POST /search/waterfall-icp-keyword`

Find the **single best decision-maker** at one company using a prioritized cascade.
The engine tries each tier in order and **stops as soon as `max_results` is met** —
so you get your "dream contact," and only fall through to Plan B / fallback (e.g.
CEO) when a tier yields nothing.

| Param | Type | Req | Notes |
|---|---|---|---|
| `company_linkedin_url` | string (uri) | Yes | Target company |
| `cascade` | array of tiers | Yes | Ordered tiers, tried in sequence (min length 1) |
| `max_results` | number | No | 1–100 |

Each cascade tier: `include_title[]`, `exclude_title[]`, `location[]` (e.g.
`["WORLD"]`), `include_headline_search` (bool — also match the LinkedIn headline,
not just title). Same bracket exact-match rule as Find People.

Response nests the person under `results[].person`, plus two ordering signals:
`icp` (which cascade tier matched, 1 = highest) and `ranking` (relevance within the
company, 1 = most relevant).

```bash
curl -X POST "https://api.blitz-api.ai/v2/search/waterfall-icp-keyword" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${BLITZ_API_KEY}" \
  -d '{
    "company_linkedin_url": "https://www.linkedin.com/company/acme",
    "cascade": [
      { "include_title": ["Chief Marketing Officer", "Marketing Director"],
        "exclude_title": ["assistant","intern","junior"],
        "location": ["WORLD"], "include_headline_search": false },
      { "include_title": ["Marketing Manager", "Head of Growth"],
        "exclude_title": ["junior","assistant","intern"],
        "location": ["WORLD"], "include_headline_search": false },
      { "include_title": ["CEO","Founder","Owner"],
        "exclude_title": ["assistant","intern"],
        "location": ["WORLD"], "include_headline_search": false }
    ],
    "max_results": 5
  }'
```

### 4. Company Enrichment — `POST /enrichment/company`

Resolve a **company LinkedIn URL** into a full firmographic profile: `name`,
`about`, `industry`, `type`, `size`, `employees_on_linkedin`, `followers`,
`founded_year`, `hq{city,state,country_code,country_name,...}`, `domain`,
`website`, `linkedin_id`. Returns `{ "found": bool, "company": {...} }`.

| Param | Type | Req | Notes |
|---|---|---|---|
| `company_linkedin_url` | string | Yes | Company LinkedIn URL |

If you only have a domain, run **Domain → LinkedIn URL** first
(`POST /enrichment/domain-to-linkedin`, body `{ "domain": "example.com" }`,
returns `{ "found": bool, "company_linkedin_url": "..." }`), then pipe the LinkedIn
URL here. Most v2 endpoints take LinkedIn URLs, so this resolution unlocks the
pipeline from a bare domain.

```bash
curl -X POST "https://api.blitz-api.ai/v2/enrichment/company" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${BLITZ_API_KEY}" \
  -d '{ "company_linkedin_url": "https://www.linkedin.com/company/acme" }'
```

### Supporting: Find Work Email — `POST /enrichment/email`

Turn a **person LinkedIn URL** into a verified work email (SMTP-validated).
The search/finder endpoints return LinkedIn URLs but **not** emails — chain this
endpoint to complete each contact.

| Param | Type | Req | Notes |
|---|---|---|---|
| `person_linkedin_url` | string | Yes | Person LinkedIn URL |

Returns `{ "found": bool, "email": str|null, "all_emails": [...] }`. On
`found: false`, no verified email exists and `email` is `null`. (Requires the
Unlimited Email plan or above — see rate limits.)

```bash
curl -X POST "https://api.blitz-api.ai/v2/enrichment/email" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${BLITZ_API_KEY}" \
  -d '{ "person_linkedin_url": "https://www.linkedin.com/in/example-person" }'
```

A direct mobile/phone endpoint (`POST /enrichment/phone`, US-only) and reverse
email/phone lookups also exist on the top plan; not core to people backfill here.

## Rate limits

- **5 requests per second** (standard, all plans). Your exact cap is in the
  `max_requests_per_seconds` field of `GET /v2/account/key-info` — read it and
  configure your client-side limiter from that value, not a hardcoded constant.
- **Pagination caps:** Employee Finder → 200 pages / 10k results;
  Find People → 50k results (cursor-based).
- **Credits vs. unlimited:** new accounts get 1,000 free trial credits (1 credit
  per person/company/email returned). Paid plans are **flat-rate unlimited** — no
  per-request cost — so iterating ICP configs and re-running is free of marginal
  cost. Plan tiers gate *which* endpoints you can call:
  - **Unlimited Leads (~$399/mo):** search + company enrichment + employee finder
    + domain→LinkedIn (no email/phone enrichment).
  - **Unlimited Email (~$499/mo):** adds `/enrichment/email`.
  - **Unlimited Phone (~$599/mo):** adds `/enrichment/phone` (US mobile).
- On `429`, back off and retry; on `402`, the plan tier doesn't include that
  endpoint (or trial credits are exhausted). Scripts should retry with backoff on
  `429`/`5xx` and treat `402`/`401` as fatal config errors.

## Role in the pipeline (employee / people backfill)

Blitz sits in the **people-backfill stage**, downstream of the signal layer and
upstream of outreach:

1. **Signal layer (Trigify)** flags accounts showing buying intent / fit.
2. **Resolve the account** — if you only have a domain, run
   `domain-to-linkedin` → `enrichment/company` to get the LinkedIn URL +
   firmographics and confirm ICP fit.
3. **Backfill the humans** — pick one of:
   - **Waterfall ICP** when you want *the single best* decision-maker per account
     (cascade: ideal title → deputy → exec fallback). Lightest-weight, one contact.
   - **Employee Finder** when you want *the whole relevant team* at one account
     (e.g. every Director+ in Sales) for multi-threaded outreach.
   - **Find People** when you're sourcing *across many accounts at once* from ICP
     filters rather than per-account.
4. **Enrich to a sendable contact** — pass each returned `linkedin_url` to
   `enrichment/email` (and `enrichment/phone` if on that plan) to get a verified
   work email / mobile.
5. **Hand off** the name + title + LinkedIn + verified email to the system of
   record (Supabase) and the outreach tools (Smartlead / HeyReach / Instantly).

As a **waterfall fallback**, Blitz can stand in when the primary people source
(e.g. Prospeo or AI Ark) returns no contacts for an account: try the primary, and
if empty, run Blitz Employee Finder / Waterfall ICP on the same company LinkedIn
URL before giving up on the account.

> Choosing between the three people endpoints: *one best contact per known account*
> → Waterfall ICP; *the full team at a known account* → Employee Finder;
> *people across a list of accounts / pure ICP filters* → Find People.
