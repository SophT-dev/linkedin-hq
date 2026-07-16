# Stage 00 — TAM Build

**Goal:** build the raw account universe (Total Addressable Market) for your ICP.
This is the widest, dumbest net you will cast in the whole pipeline. You are NOT
qualifying here — you are just *collecting every company that could plausibly be a
fit* into one deduplicated table, so the next stages have something to grade.

> **Mental model:** TAM build = quantity + coverage. Qualification (stage `01`)
> = precision. Keep them separate. If you try to be precise here you will
> accidentally throw away accounts you can never get back.

---

## What "good" looks like

A single file `data/companies_tam.jsonl` where every row is one unique company:

| column         | example                          | notes |
|----------------|----------------------------------|-------|
| `company_name` | `Acme Robotics`                  | display name |
| `domain`       | `acme.com`                       | **normalized**: lowercase, no `www.`, no scheme, no path |
| `linkedin_url` | `https://linkedin.com/company/acme` | canonical company page if known |
| `headcount`    | `230`                            | integer estimate (or a band like `201-500`) |
| `industry`     | `Software Development`           | provider's label, kept verbatim |
| `description`  | `Builds warehouse automation...` | one-paragraph blurb (feeds stage 01 qualification) |
| `source`       | `prospeo`                        | which tool produced this row (`prospeo` / `blitz` / `aiark`) |

`domain` is the **join key** for the entire engine. Everything downstream
(qualification, system-of-record, signal mapping) keys off normalized domain. If
the domain is wrong or dirty, the whole pipeline drifts. Normalize it once, here.

---

## The core problem: per-query row caps

Every company-search API caps how many rows a *single* filter combination can
return. You will hit one of two walls:

1. **Hard page cap** — e.g. Prospeo returns at most **25,000** rows per filter set
   (1000 pages × 25). If your ICP has 60k companies, a single broad query can only
   ever see 25k of them. The other 35k are invisible — the API just stops paging.
2. **Soft skew** — providers return the *most prominent* matches first. Even under
   the cap, a broad query over-samples big, well-known companies and starves the
   long tail (the smaller companies that are often the best-fit, least-contested
   accounts).

### The fix: overlapping FINE headcount bands

Instead of one query for "50–10000 employees", split the headcount axis into many
**narrow** bands and run one query per band:

```
50-150   →  query 1
150-300  →  query 2
300-500  →  query 3
500-800  →  query 4
800-1200 →  query 5
... etc
```

Each band is small enough that its total result count fits *under* the per-query
cap, so you actually page through the whole band instead of getting truncated.
Union all the bands and you've reconstructed the full universe the broad query
could never reach.

**Why "overlapping"?** Providers disagree on headcount. The same company might be
"148" to one source and "152" to another, and a hard band boundary at 150 would
drop it from *both* the `50-150` and `150-300` pulls in edge cases (off-by-one,
re-estimation between pages, rounding). Overlap the bands by a few percent
(`50-150`, `140-300`, `290-500`, ...) so a company near a boundary lands in two
pulls. The dedupe step (below) collapses the duplicates for free, so overlap costs
you nothing and closes the gap. **Never leave a hard seam between bands.**

You can split on *any* high-cardinality axis the same way when headcount alone
isn't enough to get under the cap — e.g. add a geo loop (`US`, `UK`, `DE`, ...) or
an industry loop *inside* each headcount band. The pattern is always:
**narrow filter → page to exhaustion → next narrow filter → UNION → DEDUPE.**

---

## The pull → union → dedupe pipeline

```
   ┌─ Prospeo  /search-company ─┐
   ├─ Blitz    /search/people  ─┤   each band/geo → page to last page
   └─ AI Ark   /v1/companies   ─┘   → append raw rows to data/companies_raw.jsonl
                  │
                  ▼
        data/companies_raw.jsonl        (every row from every pull, with `source`)
                  │
                  ▼  normalize domain (lowercase, strip scheme + www + path)
                  ▼  drop rows with no usable domain
                  ▼  UNION across all sources, DEDUPE on normalized domain
                  │     (keep the richest row per domain; merge `source` into a list)
                  ▼
        data/companies_tam.jsonl        (one row per unique company → stage 01)
```

The provided scripts each **append** to `data/companies_raw.jsonl` and are
**resumable** (they checkpoint progress per band, so a crash or rate-limit doesn't
restart the run). The dedupe is a tiny final pass — read all raw rows, normalize,
keep one per domain. A reference normalize+dedupe is included at the bottom of this
README; wire it into whatever orchestration you use (or run it standalone).

---

## Which tool for what

All three are **complementary account-data sources.** Run as many as you have keys
for and union them — coverage compounds, and the dedupe makes overlap harmless.

| Tool | Script | Best at | Endpoint(s) used | Per-query cap to respect |
|------|--------|---------|------------------|--------------------------|
| **Prospeo** | `prospeo_search.py` | Filter-rich company list building (20+ firmographic filters: headcount, industry, location, keywords, tech). The default workhorse for TAM. | `POST /search-company` (and `POST /search-person` for a person-first pull) | 25,000 rows / filter set (1000 pages × 25). Search RPS is low (1–5 by plan) — go slow. |
| **Blitz** | `blitz_search.py` | Company + employee directory. `Find People` searches across many companies in one call and returns the employer company object — handy when you want a *people-first* path into the same account universe, or to map a company's org. | `POST /v2/search/people`, `POST /v2/search/employee-finder` | Paginated (`max_results` ≤ 50/page). 5 RPS on paid plans. |
| **AI Ark** | `aiark_search.py` | 70M+ company / 500M+ people DB with a structured nested-filter query (industry/size/location/keywords/NAICS/tech), refreshed ~monthly. Good independent cross-source for coverage. | `POST /v1/companies`, `POST /v1/people` | `size` ≤ 100/page, `page` is zero-based. 5 req/s · 300/min · 18,000/hr. |

**Prospeo vs Blitz vs AI Ark — when to reach for which:**

- **Start with Prospeo.** Its company-search filter set is the most expressive for
  drawing an ICP boundary (headcount bands, industry, location, company keywords),
  and it's purpose-built for "build me an account list."
- **Add AI Ark** as a second independent company source for coverage. Different DB,
  different freshness — it catches accounts Prospeo misses, and vice versa.
- **Use Blitz** when your ICP is more naturally defined by *people* than by
  firmographics (e.g. "companies that employ a Head of X"), or when you also want
  the employee roster for the same accounts. Its `Find People` returns the company
  object alongside each person, so you can derive an account list from a people pull.

---

## Hard rules for this stage

1. **Do NOT filter by industry here.** Industry labels are noisy and inconsistent
   across providers; a strict industry filter at TAM time silently drops good-fit
   companies that a provider mislabeled. Industry/fit qualification is **stage 01's
   job** (it reads the `description` + homepage and decides). Here, keep industry as
   a *column*, not a *filter*. (The one exception: if your ICP is genuinely a single
   tight vertical and the provider's industry enum is reliable for it, you may use it
   — but default to off.)
2. **Headcount + geo + (optional) keywords are your only filters.** Headcount draws
   the size boundary of the ICP; geo draws the serviceable boundary; keywords
   (`<your-icp>` themes) gently bias the long tail. That's it.
3. **Normalize the domain once, here.** `lower()`, strip `http(s)://`, strip
   leading `www.`, strip any path/query. This is the pipeline's join key.
4. **Keep the `description`.** Stage 01 qualification needs it. A TAM row with no
   description is a row stage 01 has to re-fetch — wasteful.
5. **Tag every row with `source`.** You need to know which tool found a company
   (for debugging coverage gaps and for trusting/merging conflicting firmographics).

---

## How to run

```bash
# 0. set up
cp ../.env.example ../.env          # then fill in YOUR keys (never commit .env)
cp filters.example.yaml filters.yaml # then edit to your ICP
export $(grep -v '^#' ../.env | xargs)   # load keys into the shell

# 1. pull (run whichever sources you have keys for; all append to the same raw file)
python3 prospeo_search.py --filters filters.yaml --out data/companies_raw.jsonl
python3 blitz_search.py   --filters filters.yaml --out data/companies_raw.jsonl
python3 aiark_search.py   --filters filters.yaml --out data/companies_raw.jsonl

# 2. dedupe → final TAM (see reference snippet below, or your orchestration step)
python3 dedupe.py data/companies_raw.jsonl data/companies_tam.jsonl
```

Each pull is resumable — re-run the same command after a crash/rate-limit and it
picks up from the last completed band (checkpoint file under `data/`).

---

## Reference: normalize + dedupe (drop-in)

This is intentionally tiny and stdlib-only. Save as `dedupe.py` or fold into
orchestration. It is the canonical domain-normalization the whole engine relies on.

```python
import json, sys
from urllib.parse import urlparse

def normalize_domain(raw: str) -> str | None:
    """lowercase, strip scheme + www + path → bare registrable host."""
    if not raw:
        return None
    raw = raw.strip().lower()
    if "://" not in raw:
        raw = "http://" + raw           # let urlparse find the host
    host = urlparse(raw).netloc or urlparse(raw).path
    host = host.split("/")[0].split("@")[-1].split(":")[0]
    if host.startswith("www."):
        host = host[4:]
    return host or None

def richness(row: dict) -> int:
    """prefer the most complete row when collapsing duplicates."""
    return sum(1 for k in ("linkedin_url", "headcount", "industry", "description")
               if row.get(k))

def main(src_path: str, out_path: str) -> None:
    best: dict[str, dict] = {}
    with open(src_path) as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            dom = normalize_domain(row.get("domain") or row.get("website") or "")
            if not dom:
                continue                  # no usable join key → drop
            row["domain"] = dom
            prev = best.get(dom)
            if prev is None:
                row["source"] = [row.get("source")] if row.get("source") else []
                best[dom] = row
            else:
                # merge: keep richer row, union the source tags
                src = set(prev.get("source", []))
                if row.get("source"):
                    src.add(row["source"])
                winner = row if richness(row) > richness(prev) else prev
                winner["source"] = sorted(src)
                best[dom] = winner
    with open(out_path, "w") as out:
        for row in best.values():
            out.write(json.dumps(row, ensure_ascii=False) + "\n")
    print(f"TAM: {len(best)} unique companies → {out_path}")

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
```

---

## What feeds the next stage

`data/companies_tam.jsonl` → **stage 01 (account qualification)** reads each row's
`description` (and, when confidence is low, scrapes the homepage) to decide
in/out of ICP. Nothing here is final — TAM is deliberately over-inclusive.
