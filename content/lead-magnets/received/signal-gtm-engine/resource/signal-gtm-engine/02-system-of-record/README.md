# Stage 02 — System of Record

**One queryable source of truth for the whole engine.** Every other stage reads
from and writes back to this database. Get this right and the loop is reliable;
skip it and you re-work the same accounts forever.

```
00 TAM build ─┐
01 Qualify ───┤
03 Signals ───┼──► [ SUPABASE ] ◄── one row per company, keyed on domain
05 Scoring ───┤        │
06 Outreach ──┘        └──► the work queue you actually act on
```

---

## Why a database (and not a spreadsheet)

The engine pulls companies from **many sources** (search APIs, enrichment,
signal feeds) and attaches **many signal types** over time. The same company
shows up again and again, under different names, from different entry points.

A spreadsheet has no identity layer — paste two lists together and you get
duplicates, conflicting fields, and signals scattered across rows. **The loop
only works if there is one stable place where:**

1. **Identity is resolved** — the same company collapses to one row no matter
   how many sources surfaced it (dedup on the **domain**, see `dedupe.md`).
2. **Every stage writes back** — qualification verdicts, captured signals,
   scores, and outreach status all land on that one row.
3. **You can query the work queue** — "fit accounts with a fresh signal, ranked
   by total score, not yet contacted" is one SQL filter, not a manual sort.

That is the entire reason this stage exists: **dedup + identity resolution
across multi-source / multi-signal entry is what makes the loop converge instead
of pile up.**

---

## The universal key: `domain`

The normalized root **domain** is the dedup key AND the join key everywhere:

- `Company.domain` — PRIMARY KEY (one row per company).
- `People.company_domain` — FK back to `Company`.
- `Company_Not_ICP.domain` / `Company_Parked.domain` — same key shape, so a
  re-pulled domain is instantly recognized as a known reject or a parked record.

Normalization rules (lowercase, strip scheme/`www`/path, reduce to eTLD+1) and
the parent/subsidiary handling are spelled out in **`dedupe.md`**. Read it before
loading anything.

---

## Files in this stage

| File                | What it is |
|---------------------|------------|
| `schema.sql`        | Generic DDL for `Company`, `People`, `Company_Not_ICP`, `Company_Parked`. Self-documenting via `COMMENT ON COLUMN`. Run it once per tenant schema. |
| `supabase_load.py`  | Batch loader → Supabase Data API (PostgREST). 200-row batches, schema routing, upsert, retry/backoff, resumable. |
| `dedupe.md`         | Domain normalization + parent/subsidiary identity-resolution rules. |
| `README.md`         | This file. |

---

## The four tables

- **`Company`** — the spine. Firmographics + `clean_homepage` + generic
  `signal_*` slots + `signal_count` + `fit_verdict` + `intent_tier` + scores.
  Every stage touches this table.
- **`People`** — contacts linked by `company_domain`, with `persona` / `grade` /
  `email_status` / `source` / `live_verified`.
- **`Company_Not_ICP`** — rejected companies. A **graveyard, not a delete**: a
  re-pull of a rejected domain from another source is recognized and skipped, so
  you never re-qualify something you already ruled out.
- **`Company_Parked`** — "not now" companies that **might** be ICP later
  (missing data, no signal yet, over capacity). Revisit when a signal lands or
  data fills in.

---

## Schema-per-tenant (one project, many clients)

Run **one** Supabase project and isolate each client/product in its own Postgres
**schema** (`acme`, `globex`, …). The loader routes every write to the right
schema with the PostgREST **`Content-Profile`** header — no per-tenant table
renames, no cross-tenant collisions.

> PostgREST only serves schemas listed in **Settings → API → Exposed schemas**.
> Add each tenant schema there and grant the `anon` role usage on it, or the
> `Content-Profile` header returns 404. (Noted at the bottom of `schema.sql`.)

---

## RLS note (read the security caveat)

For this repo's **bulk-load pattern**, `schema.sql` leaves **RLS off** and grants
the `anon` role table access so the loader can POST rows directly.

> ⚠️ **This is fine for a private build you control. It is NOT production-safe.**
> With RLS off + anon grants, anyone with the anon key can read/write every row.
> For anything production / multi-user / internet-exposed, **enable RLS and write
> explicit policies** (commented hardening block is in `schema.sql`).

---

## Self-documenting columns

Every non-obvious column carries a `COMMENT ON COLUMN` in `schema.sql`. They show
up in the Supabase table editor and in `\d+` / `information_schema`, so the
schema explains itself — what `intent_tier` means, why `source` is write-once,
how `last_signal_date` drives recency decay, etc. Anyone (or any agent) inspecting
the DB learns the model without reading code.

---

## Concrete walk-through (generic)

You want to stand up the source of truth for a tenant called **`acme`** and load
a first batch of companies.

### 0. Set keys (never hardcode them)

```bash
cp ../.env.example ../.env        # then fill in the real values
export SUPABASE_PROJECT_REF=your_ref
export SUPABASE_ANON_KEY=your_anon_key
# (SUPABASE_ACCESS_TOKEN is for the MCP / management API, not this loader.)
```

### 1. Create the schema + tables

In the Supabase SQL Editor, create the tenant schema, point `schema.sql` at it
(uncomment the `CREATE SCHEMA` / `SET search_path TO acme;` lines at the top),
and run the file. Add `acme` to **Settings → API → Exposed schemas**.

### 2. Prepare your rows

Each object's keys must match column names. Example `companies.jsonl`
(one object per line — all neutral placeholders):

```json
{"domain": "example.com", "company_name": "Acme", "industry": "Software", "employee_count": 120, "clean_homepage": "https://example.com", "source": "tam-search"}
{"domain": "globex.example", "company_name": "Globex", "industry": "Software", "employee_count": 800, "source": "tam-search"}
```

Normalize the `domain` field first using the rules in `dedupe.md`, and drop any
row whose domain is already in `Company_Not_ICP`.

### 3. Dry-run, then load

```bash
# validate the file without sending anything
python supabase_load.py --table Company --schema acme --input companies.jsonl --dry-run

# load for real (upsert on domain → safe to re-run)
python supabase_load.py --table Company --schema acme --input companies.jsonl
```

The loader batches 200 rows per POST, upserts on `domain` (so re-runs dedup
instead of erroring), retries 5xx with backoff, and writes a `.ckpt` checkpoint
after each batch so a crash resumes cleanly.

### 4. Load the people

```bash
python supabase_load.py --table People --schema acme \
    --input people.jsonl --on-conflict company_domain,email
```

### 5. Query the work queue

Once signals (Stage 03) and scores (Stage 05) have written back, your action
list is a single filter:

```sql
SET search_path TO acme;
SELECT domain, company_name, intent_tier, total_score, last_signal_date
FROM "Company"
WHERE fit_verdict = 'fit'
  AND intent_tier IN ('hot', 'warm')
  AND last_signal_date >= now() - interval '30 days'
ORDER BY total_score DESC
LIMIT 100;
```

That query is the payoff of having a real system of record: the highest-intent,
in-ICP, freshly-signalled accounts, ranked — ready to hand to Stage 06 (Outreach).
