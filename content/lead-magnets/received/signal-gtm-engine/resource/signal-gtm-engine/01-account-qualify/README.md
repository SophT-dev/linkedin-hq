# Stage 01 — Account Qualify (Binary Fit Gate)

> **This is a keep/drop fit filter. It is NOT scoring and it is NOT tiering.**
> Tiering / prioritization happens later, in **Stage 05 (scoring & stacking)**, once
> live signals are in play. Stage 01 only answers one question per company:
>
> **"Could this company ever plausibly buy `<YOUR_PRODUCT>`?"** — keep it. Otherwise drop it.

---

## Why a binary gate (and why fit ≠ intent)

A raw TAM pulled in Stage 00 is noisy. A company-data provider hands you tens of
thousands of rows, and a large slice of them are categorically un-sellable to —
not because they're a bad-timing prospect, but because they are the *wrong kind of
entity entirely*. A staffing agency, a brick-and-mortar restaurant group, a county
government, a content publisher: no amount of buying signal turns these into
customers for most B2B software.

So Stage 01 strips out the obvious non-ICP rows **before** you spend money enriching
them, scraping their sites in depth, or — most importantly — before you let a
buying signal (Stage 03/04) pull a junk account into your outreach.

Two principles drive the whole stage:

1. **Fit is not intent.** A perfect-fit company with zero signal is still KEPT here —
   it just won't get prioritized until a signal fires. A great signal on a non-fit
   company is worthless. Stage 01 protects the funnel from the second case.

2. **A false DROP is far worse than a junk KEEP.** A junk keep costs you one more
   homepage scrape and one more cheap LLM read downstream. A false drop silently
   deletes a real customer from your entire pipeline, forever, with no second chance.
   Every step below is tuned to be **conservative**: *when in doubt, KEEP.*

---

## The 5 sub-steps

```
   TAM rows (company name, domain, short description)
        │
        ▼
 (a) COARSE LLM EXCLUSION  ── icp_exclude.py
        │   Read ONLY the short description. Drop a company ONLY when it is
        │   ~100% certain to be a clear non-ICP category. ANY doubt => KEEP.
        │   Cheap, fast, resumable. Emits a verdict + a confidence level.
        │
        ├──► verdict = DROP (high confidence)  ──────────────►  ✗ dropped
        │
        ├──► verdict = KEEP (high confidence)  ──────────────►  ✓ kept (skip the rest)
        │
        ▼   verdict = KEEP but confidence = LOW
 (b) PARALLEL.AI RESEARCH  ── parallel_research.py
        │   The description was too thin/vague to judge. Ask Parallel.ai to
        │   research the company and return a clean factual summary.
        │   (Only invoked for the low-confidence slice — keeps cost down.)
        │
        ▼
 (c) FIRECRAWL HOMEPAGE SCRAPE  ── firecrawl_scrape.py
        │   Batch-scrape each remaining company's homepage to markdown.
        │   Retries + checkpoint so a 30k-row run can resume after a crash.
        │
        ▼
 (d) DETERMINISTIC CLEAN  ── clean_homepage.py
        │   Pure regex. Strip images, keep link text, drop nav/footer/cookie
        │   boilerplate and junk short lines, collapse blank lines, truncate
        │   to ~9000 chars. NO LLM here — cleaning must be cheap & reproducible.
        │
        ▼
 (e) FINAL LLM VERDICT  ── final_verdict_prompt.example.txt (driven by your runner)
        │   One last KEEP/DROP read, now over real homepage copy instead of a
        │   one-line description. This is the authoritative verdict.
        │
        ▼
   KEPT accounts  ──►  Stage 02 (system of record)
```

### (a) Coarse LLM exclusion — `icp_exclude.py`
Reads each company's **short description only** (the cheap field every TAM provider
ships) and asks Claude to drop it **only** when the description clearly proves the
company belongs to one of ~6 non-ICP categories. The bias is hard-coded into the
prompt: *false exclusion is worse than a junk keep.* Resumable over the whole TAM via
a checkpoint file. The prompt lives in `icp_prompt.example.txt` and is fully
parameterizable — you fill in your own ICP and your own exclusion categories.

### (b) Parallel.ai research — `parallel_research.py`
Only invoked when step (a) returns **KEEP with LOW confidence** — i.e., the
description was too vague, too short, or too generic to judge. Parallel.ai's Task API
researches the company from the public web and returns a clean factual summary so the
later homepage read has real context to work with. We don't pay for this on the easy
rows — only on the genuinely ambiguous slice.

### (c) Firecrawl homepage scrape — `firecrawl_scrape.py`
Batch-scrapes the homepage of every still-alive company to clean markdown via
Firecrawl `/v1/scrape`. Retries transient failures, and writes a checkpoint after each
row so a large run resumes where it left off instead of re-scraping (and re-paying)
from zero.

### (d) Deterministic clean — `clean_homepage.py`
**No LLM.** Pure regex: strip image markdown, keep the *text* of links (drop the URL),
remove nav/footer/cookie/social boilerplate, drop lines that are too short to carry
meaning, collapse runs of blank lines, and truncate to ~9000 chars so the final LLM
read stays cheap and within context. Cleaning is deterministic on purpose — same input
always yields the same output, and you can eyeball-audit it for free.

### (e) Final LLM verdict — `final_verdict_prompt.example.txt`
The authoritative KEEP/DROP read, now over real homepage copy. A company that looked
ambiguous from its one-line description is usually obvious once you read what its
homepage actually says it does. Same conservative bias: drop only when the homepage
makes it clear the company is a non-ICP category.

---

## When is Parallel.ai actually invoked?

Only on the **low-confidence KEEP** slice from step (a). The decision tree:

| Step (a) result            | What happens next                                  |
|----------------------------|----------------------------------------------------|
| DROP (high confidence)     | Dropped. Done.                                     |
| KEEP (high confidence)     | Kept. Skip research; go straight to homepage scrape. |
| KEEP (**low** confidence)  | → Parallel.ai research → homepage scrape → clean → final verdict |

This keeps research spend proportional to ambiguity: clear rows are cheap, only the
genuinely murky companies get the expensive treatment.

---

## Running it

Everything is env-driven. Copy the repo-root `.env.example` to `.env` and fill in your
own keys. The scripts read keys via `os.environ` only — no key is ever written to disk.

```bash
# 1. coarse exclusion over the whole TAM (resumable)
python icp_exclude.py --in data/tam.jsonl --out data/01a_excluded.jsonl

# 2. research the low-confidence keeps
python parallel_research.py --in data/01a_excluded.jsonl --out data/01b_research.jsonl

# 3. scrape homepages of the survivors (resumable)
python firecrawl_scrape.py --in data/01b_research.jsonl --out data/01c_scraped.jsonl

# 4. deterministic clean (no LLM, no network)
python clean_homepage.py --in data/01c_scraped.jsonl --out data/01d_clean.jsonl

# 5. final verdict — wire clean homepage + final_verdict_prompt.example.txt
#    into the same Anthropic call shape used in icp_exclude.py
```

> `data/` is git-ignored. This repo ships **runnable templates** — fill in your own ICP,
> your own keys, and your own TAM. No company data or secrets are committed.

---

## Inputs & outputs (record shape)

Each script reads/writes JSONL — one company per line. Fields accumulate down the
pipeline; nothing is destroyed, so you can always audit *why* a row was kept or dropped.

```jsonc
{
  "domain": "example.com",
  "name": "Acme",
  "description": "We help teams do <thing>.",   // from Stage 00 / your TAM provider
  "exclude_verdict": "keep",                     // (a) keep | drop
  "exclude_confidence": "low",                   // (a) high | low
  "exclude_reason": "description too vague",     // (a) short rationale
  "research_summary": "...",                     // (b) Parallel.ai, only if low-conf
  "homepage_markdown": "...",                    // (c) Firecrawl raw
  "homepage_clean": "...",                       // (d) deterministic clean
  "final_verdict": "keep",                       // (e) keep | drop — authoritative
  "final_reason": "clearly a software product"   // (e) short rationale
}
```
