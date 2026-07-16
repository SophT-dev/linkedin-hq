# Stage 04 — Signal-Led Expansion (The Continuous Loop)

> **The core idea:** Don't only apply signals to a *fixed* TAM. Use signals to **grow** the TAM.

Most "intent" setups are static: you build a TAM once (Stage 00), qualify it
(Stage 01), and then forever score signals *against that frozen list*. The
moment a perfect-fit account appears that you never added — a company that just
raised a round, started hiring for your category, or whose founder is posting
about exactly the problem you solve — your engine is blind to it. It will never
score, because it was never in the table.

Stage 04 fixes that. It runs a **discovery loop** alongside the monitoring loop:
signals don't just *rank* accounts you already know, they *find* accounts you
don't. Every new account that passes qualification gets admitted to the same
system of record (Stage 02), enriched with signals (Stage 03), and handed to
scoring (Stage 05) — exactly as if you'd sourced it by hand in Stage 00. The TAM
becomes a living set that compounds week over week.

Trigify is the signal source for this stage. It is THE social-listening /
buying-signal layer: people and companies posting or engaging on the topics you
track. Serper is a complementary news/trigger feed (funding, hiring, launches)
— not a signal competitor, just a second discovery surface.

---

## The two loops

```
                ┌──────────────────────────────────────────────────────────┐
                │                                                          │
                │   LOOP A — MONITOR THE KNOWN TAM   (Stage 03 territory)  │
                │                                                          │
   accounts ───▶│   for each account already in Supabase:                 │
   in Supabase  │     pull fresh signals (Trigify monitors, Serper news)  │
                │     → update signal columns → re-score (Stage 05)        │
                │                                                          │
                └──────────────────────────────────────────────────────────┘
                                          ▲
                                          │  rescore the same row
                                          │
   ┌───────────────────────────────────────────────────────────────────────┐
   │                                                                       │
   │   LOOP B — DISCOVER NEW ACCOUNTS   (THIS STAGE)                        │
   │                                                                       │
   │   1. CAPTURE SIGNAL                                                    │
   │        Trigify  → people/companies posting or engaging on your topics │
   │        Serper   → news/funding/hiring trigger events                  │
   │                                                                       │
   │   2. EXTRACT THE ACCOUNT                                               │
   │        post/article → author's company → resolve to a domain          │
   │                                                                       │
   │   3. DEDUPE vs Supabase                                                │
   │        already in TAM? ──yes──▶ treat as a fresh signal on that row   │
   │                                  (feeds Loop A — update + rescore)     │
   │                          └─no──▶ it's NET-NEW. continue.              │
   │                                                                       │
   │   4. QUALIFY (push through Stage 01)                                   │
   │        scrape homepage / research → KEEP or DROP against your ICP     │
   │                                                                       │
   │   5. ADMIT                                                             │
   │        on KEEP → INSERT into Supabase company table                   │
   │                  with provenance: discovered_via, discovery_signal    │
   │                                                                       │
   │   6. HAND OFF                                                          │
   │        run Stage 03 signal mapping on the new row                     │
   │        → Stage 05 scoring → Stage 06 outreach                         │
   │                                                                       │
   └───────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
                          newly admitted account is now
                          a "known" account → next cycle it
                          is monitored by LOOP A. The loop closes.
```

**How the two loops couple.** Loop A keeps the accounts you already trust warm.
Loop B widens the funnel. They share one system of record (Stage 02) and one
scoring pass (Stage 05), so a discovered account is indistinguishable from a
hand-sourced one the moment it's admitted — same columns, same scoring, same
outreach eligibility. The dedupe step in Loop B is the hinge: a signal that
lands on a *known* account is just an update (it falls back into Loop A); a
signal on an *unknown* account triggers the qualify → admit path. Run both on a
schedule (e.g. daily) and the TAM grows on its own, gated only by your ICP
filter — never by how much list-building you did up front.

---

## Why signal-led discovery beats static list-building

| Static TAM (Stage 00 only) | Signal-led expansion (Stage 04) |
| --- | --- |
| Built once; decays as the market moves | Refreshed continuously from live activity |
| Misses accounts you never thought to add | Surfaces accounts *by their behavior*, not your guesswork |
| Intent is scored against a frozen set | Intent *creates* new entries in the set |
| New-logo discovery is a manual research sprint | New-logo discovery is a background job |
| Timing is luck | Timing is the trigger (you arrive *because* something happened) |

The trade you're making: a static list is high-precision but blind to anything
outside it. Signal-led expansion trades a little precision (you must qualify
every discovered account, because a topic-engager is not automatically an ICP
fit) for *recall that compounds*. The Stage 01 qualify gate is what keeps the
precision — nothing enters the TAM without passing the same ICP bar your
hand-sourced accounts passed.

---

## The files in this stage

| File | What it does |
| --- | --- |
| [`trigify_listen.py`](./trigify_listen.py) | Create/poll a Trigify saved search, pull collected results, and extract candidate accounts (company name → domain) from people + posts. The primary signal-capture surface. |
| [`serper_triggers.py`](./serper_triggers.py) | Run recency-filtered Google/News searches (funding, hiring, launches) via Serper, then extract company mentions as discovery candidates. A complementary trigger feed. |
| [`feedback_loop.py`](./feedback_loop.py) | The glue. Takes a discovered account → dedupes vs Supabase → if new, enqueues it for Stage 01 qualify → on KEEP, loads it to Supabase and marks it ready for Stage 03 re-score. Closes the loop. |

### How they chain

```
  trigify_listen.py ─┐
                     ├──▶  candidate accounts (JSONL)  ──▶  feedback_loop.py  ──▶  Supabase
  serper_triggers.py ┘        (name, domain, signal)         (dedupe → qualify        (admitted,
                                                              → admit → mark           provenance-tagged)
                                                               for rescore)
```

`trigify_listen.py` and `serper_triggers.py` are **producers** — they emit a
normalized candidate stream. `feedback_loop.py` is the **consumer** — it owns
dedupe, the Stage 01 hand-off, admission, and the Stage 03 re-score flag. You
can run the producers independently and feed their output into the loop, or wire
all three in `orchestration/` for a hands-off daily cycle.

---

## Candidate record (the contract between producers and the loop)

Both producers emit one JSON object per line (JSONL) with this shape. Keeping
the shape stable is what lets `feedback_loop.py` consume either source
identically:

```json
{
  "company_name": "Acme Corp",
  "domain": "example.com",
  "discovered_via": "trigify",
  "discovery_signal": "linkedin_post_engagement",
  "signal_detail": "Author posted about <your-icp topic>",
  "source_url": "https://www.linkedin.com/feed/update/urn:li:activity:...",
  "person_name": "Jane Doe",
  "person_title": "VP Engineering",
  "person_url": "https://www.linkedin.com/in/example",
  "captured_at": "2026-06-23T00:00:00Z"
}
```

`domain` is the dedupe key. If a producer can't resolve a domain, it still emits
the record (with `domain` null) so the loop can attempt resolution before
dropping it.

---

## Quick start

```bash
# 1. capture signals → candidate stream
export TRIGIFY_API_KEY=...      # from .env
python trigify_listen.py --topic "<your-icp topic>" --out data/candidates.jsonl

export SERPER_API_KEY=...
python serper_triggers.py --query "<your-icp> raises Series A" --recency week \
    --out data/candidates.jsonl --append

# 2. run the loop: dedupe → qualify → admit → flag for rescore
export SUPABASE_PROJECT_REF=...
export SUPABASE_ANON_KEY=...
python feedback_loop.py --in data/candidates.jsonl
```

Run these on a daily schedule (see `orchestration/`) and Loop B keeps feeding
net-new, ICP-qualified accounts into the same table Loop A monitors.

---

## Where this couples to the rest of the engine

- **Stage 00 (TAM build):** Stage 04 is the *continuous* counterpart to the
  one-shot list-build. Same destination table, different trigger.
- **Stage 01 (Qualify):** `feedback_loop.py` calls the same qualification gate.
  Discovered accounts get no special treatment — they pass the ICP bar or they
  don't. (Wire `qualify_account()` to your Stage 01 entrypoint.)
- **Stage 02 (System of record):** Admitted accounts land in the same Supabase
  company table, with extra provenance columns so you can always answer "how did
  this account get here?".
- **Stage 03 (Signal mapping):** Newly admitted rows are flagged
  `needs_signal_refresh = true` so Stage 03 picks them up on its next pass.
- **Stage 05 (Scoring):** Re-score runs over admitted + refreshed rows so a
  discovered account is ranked alongside everything else.

> **Note on tooling:** Trigify is the signal layer for this engine. The
> data/enrichment/outreach tools referenced elsewhere (Prospeo, Blitz, AI Ark,
> Parallel, Firecrawl, Serper, Apify, Supabase) are complementary — they help
> resolve domains, scrape homepages, and store accounts. They are not signal
> sources and do not replace Trigify here.
