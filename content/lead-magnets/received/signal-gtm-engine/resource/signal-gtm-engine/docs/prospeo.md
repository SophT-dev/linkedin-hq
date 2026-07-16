# Prospeo

> Company + people search/enrichment API. In this pipeline, Prospeo is the
> **list-building and people-data layer**: it builds the raw TAM (companies) and
> resolves the buying committee at those companies (people), then reveals their
> verified email + mobile on demand.

Source docs: <https://prospeo.io/api-docs> · condensed for this repo.

---

## What it is

Prospeo is a B2B data API with two jobs:

1. **Search** — query a large, refreshed database of **companies** and **people**
   using 20+ filters (industry, headcount, funding, technology, location,
   seniority, department, job title, years of experience, etc.) and pull back
   structured records. Search results return identity + firmographic +
   job-history data, but **never** the email or mobile.
2. **Enrich** — take an identifier from a search result (a `person_id`) and
   **reveal** that person's verified email and/or mobile number. The same idea
   applies to companies via the company enrich endpoint.

The split matters for cost: searching is cheap (1 credit per page of 25), and
you only spend the larger enrichment cost on the specific people you actually
want to contact.

---

## Base URL & auth

- **API base:** `https://api.prospeo.io`
  (note: the marketing/docs site is `prospeo.io`; the **API host** is
  `api.prospeo.io`).
- **Auth header:** every request sends your key in the **`X-KEY`** header.
  (There is no `Authorization: Bearer` — it is a raw header named `X-KEY`.)
- **Key:** read from the environment variable **`PROSPEO_API_KEY`** — never
  hardcode it. In code:

  ```python
  import os
  PROSPEO_API_KEY = os.environ["PROSPEO_API_KEY"]  # placeholder — set in .env
  HEADERS = {"X-KEY": PROSPEO_API_KEY, "Content-Type": "application/json"}
  ```

  The matching line in `.env.example` is:

  ```
  PROSPEO_API_KEY=your_prospeo_key_here
  ```

- **Sanity check (free):** `GET /account-information` returns plan, remaining
  credits, used credits, and next renewal date. Use it to verify the key works
  and to check credits before a large run. It costs **0 credits**.

---

## Key endpoints

All paths are relative to `https://api.prospeo.io`. All requests carry the
`X-KEY` header; POST bodies are JSON.

### 1. Search Company — build the TAM

| | |
|---|---|
| **Method / path** | `POST /search-company` |
| **Body** | `{ "page": <int>, "filters": { ... } }` |
| **Returns** | `results[]` (each has a `company` object) + `pagination` |

- `filters` (**required**) — the filter config (industry, headcount, funding,
  technology, location, NAICS/SIC, etc.). You can also pre-filter against a
  **list of company websites or names** (max **500** at a time) via
  `filters.company.websites.include` / `filters.company.names.include`.
- `page` (optional, default `1`) — paginate the full set.
- **Limits:** 25 results/page, **1000 pages max → 25,000 companies** per saved
  search. Read `pagination.total_page` to know when to stop.
- **Rule:** a search cannot be built from `exclude`-only filters (perf reasons).
- Location/job-title filters need exact canonical strings — pull them from the
  Search Suggestions endpoint or the dashboard payload helper, not free text
  like `"nyc"`.

Example body:

```json
{
  "page": 1,
  "filters": {
    "company_industry": { "include": ["Software"] },
    "company_headcount_range": { "include": ["51-200", "201-500"] },
    "company_funding": { "stage": ["Series A", "Series B"] }
  }
}
```

### 2. Search Person — resolve the buying committee

| | |
|---|---|
| **Method / path** | `POST /search-person` |
| **Body** | `{ "page": <int>, "filters": { ... } }` |
| **Returns** | `results[]` (each has a `person` + its current `company`) + `pagination` |

- Same `filters` / `page` shape as Search Company, plus people filters:
  `person_seniority`, `person_department`, `person_job_title`,
  `person_year_of_experience`, `person_location_search`, etc.
- Pre-filter to your TAM by passing the company websites/names list (max 500)
  inside `filters.company` — this is how you connect Stage 1 (companies) to the
  people at exactly those companies.
- **Email and mobile are present in the response but always empty/unrevealed
  here.** Each person has a `person_id` — that's what you feed to enrich.
- **Limits:** 25/page, 1000 pages max → **25,000 people** per saved search.

### 3. Enrich — reveal email + mobile

| | |
|---|---|
| **Method / path** | `POST /enrich-person` (single) · `POST /bulk-enrich-person` (batch) |
| **Company variants** | `POST /enrich-company` · `POST /bulk-enrich-company` |
| **Input** | a `person_id` from a Search Person result (single), or a list of `person_id`s (bulk) |
| **Returns** | the `person` object with `email.revealed: true` / `mobile.revealed: true` and the actual values filled in |

- The enrich step is what populates `email.email`, `mobile.mobile`
  (E.164, e.g. `+12345678900`), country code, etc. — only `revealed` fields
  carry real values.
- `email.status` / `mobile.status` are `VERIFIED` or `UNAVAILABLE`. Prospeo's
  model is **pay for valid emails only** — you are not charged for catch-all /
  undeliverable emails (so an `UNAVAILABLE` result shouldn't cost a credit).
- Use **single** `/enrich-person` for one-offs and **bulk** for the whole short
  list of people you decided to keep after qualification — it's the same data,
  one round trip.

> There are also standalone email/mobile finder products on the marketing site
> (email-by-name, domain search, mobile finder). For this pipeline the
> search → enrich flow above is the one to script against; the finders are the
> same underlying data exposed differently.

---

## Credits & rate limits

**How credits are spent**

- **Search (`/search-company`, `/search-person`):** **1 credit per request that
  returns ≥1 result** — i.e. 1 credit per page of up to 25 records. A request
  that returns nothing (`NO_RESULTS`) is not billed as a successful page.
- **Deduplication:** if your team already paid for the *exact same page* of
  results within the last **30 days**, the repeat is **free** — the response
  carries `"free": true` and no credit is charged. (Helpful for resumable runs:
  re-pulling a page you already pulled won't double-charge inside the window.)
- **Enrich:** consumes the bulk of credits; charged per revealed record.
  Verified-only billing means catch-all / unavailable emails don't burn credits.
- Check balance any time with the free `GET /account-information`
  (`remaining_credits`, `used_credits`).

**Rate limits** (per plan; tracked separately for search vs enrich):

| Category | Starter | Growth | Pro |
|---|---|---|---|
| Search — per second | 1 | 2 | 5 |
| Search — per minute | 30 | 60 | 180 |
| Search — per day | 1,000 | 4,000 | 250,000 |
| Enrich — per second | 5 | 5 | 30 |
| Enrich — per minute | 300 | 300 | 1,800 |
| Enrich — per day | 2,000 | 5,000 | 500,000 |

Every response includes headers to self-throttle:
`x-daily-request-left`, `x-minute-request-left`, `x-daily-reset-seconds`,
`x-minute-reset-seconds`, plus the `x-*-rate-limit` totals. On `429`
(`Rate limit exceeded`), back off using `x-minute-reset-seconds`.

**Common error codes** (HTTP `400` unless noted):
`INVALID_API_KEY` (check `X-KEY`), `INVALID_FILTERS` (see `filter_error`),
`PLAN_REQUIRED` (a filter needs a higher tier), `NO_RESULTS`,
`INSUFFICIENT_CREDITS`, `SERVICE_TEMPORARILY_UNAVAILABLE` (retry after a delay),
`429 Rate limit exceeded`.

---

## Role in THIS pipeline

Prospeo sits at the **front** of the engine — it produces both the account
universe and the contacts, before the signal layer (Trigify) and outreach
tools touch anything.

1. **TAM build (companies).** Run `POST /search-company` with your firmographic
   ICP filters (industry, size, funding, tech, geography) and paginate to pull
   the raw account universe — up to 25,000 companies per saved search. This is
   the candidate TAM that later stages qualify and score. Persist each page to
   the system of record (Supabase) so the run is **resumable** and dedup-friendly
   (the 30-day `free: true` window means re-pulling a page is cheap/free).

2. **People resolution (buying committee).** For the accounts you keep after
   qualification, run `POST /search-person` pre-filtered to that company
   list (websites/names, ≤500 per call) and your persona filters
   (`person_seniority`, `person_department`, `person_job_title`). This returns
   the right people at the right accounts — names, titles, job history,
   LinkedIn — but **no contact details yet**.

3. **Reveal on the short list only.** Once a person clears scoring/persona fit,
   call `/enrich-person` (or `/bulk-enrich-person` for the batch) with their
   `person_id` to reveal **verified email + mobile**. Because search is 1
   credit/page and enrich is the expensive step, you only spend enrichment
   credits on contacts you intend to actually reach — keeping cost proportional
   to pipeline, not to TAM size.

Downstream, Trigify provides the buying/social **signals** on these accounts
and people, scoring stacks the signals, and the outreach tools (Smartlead /
HeyReach / Instantly) take the enriched, signal-ranked contacts. Prospeo's only
job is: **clean accounts in, real contactable people out.**

> **# TODO: customize** — define your own ICP filter set (industry / headcount /
> funding / tech) for Stage 1, and your persona filters (seniority / department /
> job title) for Stage 2, before running against live credits.
