# Supabase

> Postgres database with an **auto-generated REST API** in front of it. In this
> pipeline, Supabase is the **system of record** (Stage 02): one queryable row per
> company, keyed on `domain`, that every other stage reads from and writes back to.
> The loader talks to the REST API (PostgREST) — no ORM, no client library, just
> HTTP + JSON.

Source docs: <https://supabase.com/docs> · <https://postgrest.org> · condensed
for this repo. See also `../02-system-of-record/` (`README.md`, `supabase_load.py`,
`schema.sql`, `dedupe.md`).

---

## What it is

Supabase is a managed **Postgres** database plus a set of auto-generated APIs over
it. Two pieces matter for this engine:

1. **Postgres** — a real relational database. You define tables, primary keys,
   foreign keys, indexes, and `COMMENT ON COLUMN` documentation in plain SQL
   (`schema.sql`). The `domain` column is the primary key on `Company` and the
   join key everywhere — that's what makes dedup and multi-source identity
   resolution work (see `../02-system-of-record/dedupe.md`).

2. **The Data API (PostgREST)** — Supabase exposes every table as a REST endpoint
   automatically. The moment a table exists in an exposed schema, you can
   `GET` / `POST` / `PATCH` / `DELETE` rows over HTTPS as JSON. No server code to
   write. This is what `supabase_load.py` posts into and what later stages query.

There's nothing to host and no driver to install: the engine writes to the
database with `requests` over plain HTTP. Postgres gives you the identity layer
(one row per company); the Data API gives you a zero-glue way to read and write it.

---

## Data API base & schema layout

- **Data API base:**
  `https://<PROJECT_REF>.supabase.co/rest/v1/<Table>`
  - `<PROJECT_REF>` is your project's ref (the subdomain Supabase assigns) — read
    from **`SUPABASE_PROJECT_REF`**.
  - `<Table>` is the table name exactly as defined in `schema.sql`
    (e.g. `Company`, `People`, `Company_Not_ICP`, `Company_Parked`).
  - One path per table. PostgREST verbs map to SQL:
    `GET` = select, `POST` = insert/upsert, `PATCH` = update, `DELETE` = delete.

- **Filtering & shaping (query params):** PostgREST reads filters off the URL —
  `?domain=eq.example.com`, `?select=domain,company_name,total_score`,
  `?fit_verdict=eq.fit&order=total_score.desc&limit=100`. The full filter grammar
  (`eq`, `in`, `gte`, `like`, `is`, …) is PostgREST's, not Supabase-specific.

- **Schema-per-tenant:** run **one** project and isolate each client/product in its
  own Postgres **schema** (`acme`, `globex`, …) rather than per-tenant table renames.
  The write/read is routed to the right schema with a header (below). PostgREST only
  serves schemas listed in **Settings → API → Exposed schemas**, and the API role
  needs `USAGE` on the schema — otherwise the request 404s.

```python
import os
PROJECT_REF = os.environ["SUPABASE_PROJECT_REF"]   # placeholder — set in .env
TABLE = "Company"                                  # # TODO: customize per call
BASE = f"https://{PROJECT_REF}.supabase.co/rest/v1/{TABLE}"
```

The matching lines in `.env.example`:

```
SUPABASE_PROJECT_REF=your_project_ref_here
SUPABASE_ACCESS_TOKEN=your_supabase_access_token_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

---

## Auth (two different keys, two different jobs)

Supabase has two credential types. **Do not mix them up** — they hit different
surfaces.

### 1. Data API — `SUPABASE_ANON_KEY`

Every Data API call (read or write) carries the anon key **twice**:

- in the **`apikey`** header (PostgREST gateway requires it), and
- in the **`Authorization: Bearer <key>`** header (the auth context).

```python
import os
ANON_KEY = os.environ["SUPABASE_ANON_KEY"]   # placeholder — set in .env

HEADERS = {
    "apikey": ANON_KEY,
    "Authorization": f"Bearer {ANON_KEY}",
    "Content-Type": "application/json",
}
```

The anon key is a public, project-scoped key — it is safe to use from the loader
**only because** access is gated by what the database role is allowed to do
(see the RLS note at the bottom). It is **not** a substitute for RLS.

### 2. Management API — `SUPABASE_ACCESS_TOKEN`

A **separate** personal access token for the **Management API** (and the Supabase
MCP): creating projects, listing tables, applying migrations, fetching the project
URL/keys, reading logs, running advisors. It is **not** used by `supabase_load.py`
and never appears in a Data API request.

```python
import os
ACCESS_TOKEN = os.environ["SUPABASE_ACCESS_TOKEN"]   # management API / MCP only
MGMT_HEADERS = {"Authorization": f"Bearer {ACCESS_TOKEN}"}
```

> **Rule of thumb:** data in/out of tables → **anon key** on the Data API.
> Provisioning / schema / project ops → **access token** on the Management API.
> Never hardcode either; both come from `os.environ[...]` matching `.env.example`.

---

## Schema routing — the `Content-Profile` header

PostgREST serves one schema by default (usually `public`). To write into a
**tenant** schema (`acme`, `globex`, …) without renaming tables, set the schema on
the request:

- **Writes** (`POST` / `PATCH` / `DELETE`) → **`Content-Profile: <schema>`**
- **Reads** (`GET`) → **`Accept-Profile: <schema>`**

```python
write_headers = {**HEADERS, "Content-Profile": "acme"}   # route POST to schema `acme`
read_headers  = {**HEADERS, "Accept-Profile":  "acme"}   # route GET  to schema `acme`
```

This is how one project serves many tenants from identical table definitions: the
same `POST .../rest/v1/Company` lands in `acme.Company` or `globex.Company` purely
by which profile header you send. If the header names a schema that isn't in
**Exposed schemas** (or the role lacks `USAGE`), the call returns **404** — that's
the first thing to check when a write "disappears."

---

## The batch upsert pattern (200-row POST + 5xx retry)

This is the core write pattern the whole engine uses — implemented in
`../02-system-of-record/supabase_load.py`. Every stage produces rows; this one
writer gets them in reliably and **idempotently**.

**Shape of one write:**

- **URL:** `https://<PROJECT_REF>.supabase.co/rest/v1/<Table>?on_conflict=<key>`
  - `on_conflict` is the conflict-target column(s): `domain` for `Company`,
    `company_domain,email` for `People`.
- **Body:** a JSON **array** of up to **200** row objects. PostgREST inserts a bulk
  array in a single POST, so you batch instead of one-row-per-request.
- **Headers:**
  - `apikey` + `Authorization: Bearer` (the anon key, both),
  - `Content-Profile: <schema>` (route to the tenant),
  - **`Prefer: resolution=merge-duplicates`** → this turns the insert into an
    **upsert**: a row whose `on_conflict` key already exists is **updated**, not
    rejected. That is what makes re-runs safe and dedup-friendly — re-pulling the
    same `domain` from another source updates the existing row instead of erroring
    on the primary key.
  - add `,return=minimal` to skip echoing inserted rows back (less payload).

```python
import os, time, requests

PROJECT_REF = os.environ["SUPABASE_PROJECT_REF"]
ANON_KEY    = os.environ["SUPABASE_ANON_KEY"]

TABLE       = "Company"     # # TODO: customize
SCHEMA      = "acme"        # # TODO: customize (tenant schema)
ON_CONFLICT = "domain"      # # TODO: customize ("company_domain,email" for People)
BATCH_SIZE  = 200           # PostgREST is happy with a few hundred rows per POST

URL = (f"https://{PROJECT_REF}.supabase.co/rest/v1/{TABLE}"
       f"?on_conflict={ON_CONFLICT}")
HEADERS = {
    "apikey": ANON_KEY,
    "Authorization": f"Bearer {ANON_KEY}",
    "Content-Type": "application/json",
    "Content-Profile": SCHEMA,                       # schema routing
    "Prefer": "resolution=merge-duplicates,return=minimal",  # upsert + lean response
}

def chunked(rows, size):
    for i in range(0, len(rows), size):
        yield rows[i:i + size]

def upsert(rows, max_retries=5, backoff_base=2.0, timeout=60):
    """Batch-upsert rows, retrying only on transient 5xx / 429 / network errors."""
    session = requests.Session()
    for idx, batch in enumerate(chunked(rows, BATCH_SIZE)):
        for attempt in range(1, max_retries + 1):
            try:
                resp = session.post(URL, headers=HEADERS, json=batch, timeout=timeout)
            except requests.RequestException as e:
                time.sleep(backoff_base ** attempt)   # network blip → back off, retry
                continue
            if resp.status_code in (200, 201, 204):
                break                                  # batch landed
            # 4xx (not 429) = bad rows/config; retrying won't help → surface + stop.
            if 400 <= resp.status_code < 500 and resp.status_code != 429:
                raise RuntimeError(f"batch {idx}: HTTP {resp.status_code} {resp.text[:500]}")
            # 5xx or 429 = transient → exponential backoff, then retry.
            time.sleep(backoff_base ** attempt)
        else:
            raise RuntimeError(f"batch {idx}: exhausted {max_retries} retries")
```

**Why these choices:**

- **200 rows/POST** — one round trip per 200 rows keeps the load fast without
  oversizing the request body.
- **Upsert via `merge-duplicates`** — idempotent re-runs. Crash mid-load, fix the
  cause, re-run — already-loaded domains are simply updated, not duplicated.
- **Retry on 5xx / 429 / network only** — a `4xx` (e.g. unknown column, malformed
  row) is a data/config bug; retrying just hammers a request that will never
  succeed, so it's surfaced and stopped. Transient server errors back off and retry.
- **Resumable** — the production loader (`supabase_load.py`) also writes a `.ckpt`
  checkpoint after each successful batch, so a crashed run picks up where it left
  off. The snippet above is the minimal core; the repo script adds checkpointing,
  `.jsonl`/`.json` input, and a `--dry-run`.

> **# TODO: customize** — set `TABLE`, `SCHEMA`, and `ON_CONFLICT` for your tenant,
> and make sure each row object's keys match column names in `schema.sql`. PostgREST
> rejects unknown keys, so clean rows before loading.

---

## Reading the work queue

Reads are the same base URL with `Accept-Profile` for the schema and PostgREST
filters on the query string. The payoff of a real system of record: the action
list is one filtered read.

```python
read_headers = {**HEADERS, "Accept-Profile": SCHEMA}  # GET uses Accept-Profile
params = {
    "select": "domain,company_name,intent_tier,total_score,last_signal_date",
    "fit_verdict": "eq.fit",
    "intent_tier": "in.(hot,warm)",
    "order": "total_score.desc",
    "limit": "100",
}
resp = requests.get(
    f"https://{PROJECT_REF}.supabase.co/rest/v1/Company",
    headers=read_headers, params=params, timeout=60,
)
queue = resp.json()  # highest-intent, in-ICP, freshly-signalled accounts, ranked
```

The equivalent SQL (run in the Supabase SQL Editor) is in
`../02-system-of-record/README.md`.

---

## RLS security note (read this)

For this repo's **bulk-load pattern**, `schema.sql` leaves **Row Level Security
(RLS) OFF** and grants the API role table access so the loader can POST rows
directly with just the anon key.

> ⚠️ **This is fine for a private build you control. It is NOT production-safe.**
> With RLS off and the anon role granted table access, **anyone who has the anon
> key can read and write every row** in the exposed schemas. The anon key is a
> public client key — treat the database as world-accessible under this config.

For anything production / multi-user / internet-exposed:

1. **Enable RLS** on every table (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`).
2. **Write explicit policies** — RLS-on with no policy denies everything; you must
   grant exactly the reads/writes each role needs.
3. **Keep server-side writes off the anon key** — privileged bulk loads should run
   with a service-role key (server-side, never shipped to a client), not the anon
   key, and never expose the service-role key in client code or this repo.

A commented hardening block (enable RLS + starter policies) lives at the bottom of
`../02-system-of-record/schema.sql`.

---

## Role in THIS pipeline

Supabase is the hub every other stage connects to:

1. **Stage 00 (TAM build)** and **Stage 01 (Qualify)** write companies in, upserting
   on `domain` so multi-source pulls collapse to one row.
2. **Stage 03 / 04 (Signals)** patch `signal_*` slots, `signal_count`, and
   `last_signal_date` onto the existing company row — the signal layer (Trigify)
   feeds these.
3. **Stage 05 (Scoring)** writes `total_score` / `intent_tier` back.
4. **Stage 06 (Outreach)** reads the ranked, in-ICP, freshly-signalled work queue
   and updates outreach status.

One row per company, keyed on `domain`, written by **one** loader, routed per tenant
by `Content-Profile`. That single source of truth is what makes the loop converge
(dedup + write-back) instead of piling up duplicates across sources and signals.
