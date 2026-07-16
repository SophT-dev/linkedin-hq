# Architecture

How the Signal-Led TAM Engine is put together: the **data model** every stage reads and
writes, the **loop mechanics** that turn raw signals into an ever-growing qualified TAM,
and the **design decisions** that make the whole thing converge instead of pile up.

Read [`README.md`](./README.md) first for the thesis (signals **expand** the TAM, not
just rank it) and the two-loop diagram. This document is the *why it works*.

---

## 1. The data model

Everything lives in one Supabase project, keyed on the **normalized root domain**. There
are four tables. Three of them exist so that a company that was already seen — and
already decided about — is *never re-worked*. That is the property that makes a
continuous, self-refreshing loop affordable.

```
                         ┌──────────────────────────────────────────┐
   discovery / TAM ─────▶│  normalize domain  →  the insert decision │
                         └───────────────┬──────────────────────────┘
                                         │
        ┌────────────────────────────────┼─────────────────────────────────┐
        ▼                  ▼              ▼                ▼                 ▼
   no usable domain   in Not-ICP?     in Company?     brand-new domain   (later) parked
        │                  │              │                │              data filled in
        ▼                  ▼              ▼                ▼                 │
   ┌─────────┐        ┌─────────┐    ┌─────────┐      ┌─────────┐           │
   │ Parked  │        │  SKIP   │    │ UPSERT  │      │ INSERT  │◄──────────┘
   │ (no key)│        │(known   │    │(merge   │      │(new row,│
   └─────────┘        │ reject) │    │ fields) │      │ provenance)
                      └─────────┘    └─────────┘      └─────────┘
```

### `Company` — the spine

One row per real-world company, `domain` as PRIMARY KEY. Every stage touches it.
Conceptually it carries four bands of columns:

- **Firmographics** (from Stage 00) — `company_name`, `industry`, `headcount`/
  `employee_count`, `linkedin_url`, `description`, and a write-once `source` tag (which
  tool found it).
- **Fit** (from Stage 01) — `fit_verdict` / `fit_tier`. The keep/drop ICP decision plus
  `clean_homepage` evidence. *Slow-moving.*
- **Signals** (from Stage 03/04) — generic `signal_*` columns, `signal_count`,
  `last_signal_date`, each with an attached confidence and evidence. *Fast-moving.*
- **Intent + state** (from Stage 05/06) — `intent_score`, `intent_tier`, `suppressed`,
  `suppression_reason`, `primary_signal_source`, plus the stage-gate cursors
  (`qualify_verdict`, `loaded_at`, `signal_checked_at`, `score`, `pushed_at`).
- **Provenance** (from Stage 04) — `discovered_via`, `discovery_signal`, `parent_domain`,
  `is_subsidiary`. Answers "how did this account get here?" for every row.

### `People` — contacts

Linked to `Company` by `company_domain` (FK). Dedups on `(company_domain, email)`, with
`(company_domain, linkedin_url)` as the secondary key when there's no email. Carries
`persona`, `grade`, `email_status`, `source`, and `live_verified` (only `true` when the
title was actually re-confirmed at find-time). Stage 06 picks one primary contact per
account from here.

### `Not-ICP` — the graveyard (a reject is data, not a delete)

Rejected domains live here forever. **A reject is recorded, never deleted.** When a
later TAM pull or a Loop-B signal re-surfaces a domain that's already in `Not-ICP`, the
insert decision **skips it** — you never spend money re-qualifying something you already
ruled out. In a loop that re-discovers the same companies constantly, this table is what
keeps cost bounded.

### `Parked` — the "not now" lot

Companies that *might* be ICP later but can't be acted on yet: **no usable domain**
(can't be keyed → can't be deduped), missing firmographics, a shared-platform / free-mail
"domain", or a fit account with no signal yet. Parked rows are revisited when a signal
lands or the missing data fills in, then promoted into `Company`. You never invent a
domain to force a row into the spine.

> Full normalization rules, the insert decision tree, and parent/subsidiary handling
> are in [`02-system-of-record/dedupe.md`](./02-system-of-record/dedupe.md). The DDL is
> in `02-system-of-record/schema.sql`, self-documenting via `COMMENT ON COLUMN`.

---

## 2. The loop mechanics

A signal — from capture to either an outreach touch or a brand-new account — moves
through a fixed pipeline. The same pipeline serves both loops; the only fork is the
dedupe step, which decides whether a signal *updates* a known account or *births* a new
one.

```
 discover ─▶ fit-qualify ─▶ dedupe ─▶ stack / score ─▶ suppress ─▶ outreach ─▶ feed back
 (capture)   (binary gate)  (domain)  (recency-weight) (hard gate)  (1 touch)   (admit + rescore)
```

### discover

Two surfaces emit candidate accounts/signals into one normalized stream:

- **Trigify (the signal layer)** — people/companies posting, engaging, hiring, or moving
  on your tracked topics across 11+ platforms. This is the live-intent source for both
  loops. A broad Boolean search casts the net; a workflow filters + enriches; the result
  is a candidate (or a signal on a known account).
- **Serper (complementary triggers)** — recency-filtered Google/News queries for
  funding, hiring, and launches. A second discovery surface and a second-source verifier,
  not a signal source in its own right.

Both emit the **same candidate record shape** (`company_name`, `domain`, `discovered_via`,
`discovery_signal`, `source_url`, `captured_at`, …) so the consumer treats them
identically. If a producer can't resolve a domain, it still emits the record (domain
null) so the loop can attempt resolution before dropping it.

### fit-qualify (binary)

Every candidate — discovered *or* hand-sourced — passes the **same** Stage 01 fit gate.
It is a **keep/drop** decision, never a score: *"could this company ever plausibly buy
`<YOUR_PRODUCT>`?"* The gate is deliberately conservative (a false DROP silently deletes
a real customer forever; a junk KEEP costs one cheap homepage read). Cheap description
read first; only the low-confidence slice escalates to Parallel research + Firecrawl
homepage scrape + a final LLM verdict. Drops go to the `Not-ICP` graveyard.

### dedupe (the hinge)

Normalize the candidate's domain and check it against the system of record:

- **Domain already in `Company`** → this is an *update*. The signal is merged onto the
  existing row; `signal_count` and `last_signal_date` advance; the account re-enters
  **Loop A** for re-scoring. No new row.
- **Domain in `Not-ICP`** → *skip*. Already ruled out; don't re-qualify.
- **No usable domain** → *park* until it resolves.
- **Brand-new domain** → it's net-new; it goes through fit-qualify and, on KEEP, is
  *admitted* with provenance (`discovered_via`, `discovery_signal`). This is **Loop B**
  growing the TAM.

This one branch is what couples the two loops. A signal is never wasted: it either
warms an account you know or it grows the set.

### stack / score (recency-weighted)

For accounts that fit, Stage 05 produces the **intent** number (distinct from fit):

- **Composite** — `contribution = base_weight × strength × decay(age_days)`, summed over
  all live signals on the account. Weights are config (`signal_weights.json`), not code.
- **Recency decay** — `decay = 0.5 ** (age_days / half_life)` (default half-life 30 days).
  Intent is perishable: a 90-day-old signal is worth ~12% of a fresh one; past
  `MAX_SIGNAL_AGE_DAYS` it's dropped entirely. *This is the single most important rule in
  the stage* — without it stale accounts surface forever.
- **Stacking** — reward **distinct** signal *types* firing together, not raw volume
  (`stack_multiplier = 1 + STACK_BONUS × (distinct_types − 1)`, capped). Three different
  signals on one account beat ten likes from a bot.
- **Tiering** — bucket the `[0,100]` score into A/B/C/D so reps act on a label.
- **Source attribution** — record which signal type contributed most, so in 60 days you
  can kill the signal types that source accounts but never convert.

### suppress (hard gate)

Applied *after* scoring (so analytics keep the number) but *before* outreach. Closed-won,
current customers, active competitors, already-in-sequence, and do-not-contact accounts
get `suppressed = true` and never enter the queue — no matter how hot. The work-queue
rule is a simple AND: `fit_tier ∈ (A,B) AND intent_tier ∈ (A,B) AND NOT suppressed`.

### outreach (one signal-anchored touch)

Stage 06 picks **one** primary contact per account (persona-ranked), routes by tier
(high → multi-thread; mid → automated; low → trigger-gated hold), and exports
campaign files whose first line is built from the **real detected signal**
(`top_signal_summary`). The rule is absolute: **no signal → no send.** A row with no
fresh signal is kicked back to nurture, never blasted.

### feed back

The close. An admitted account is now "known" — next cycle Loop A monitors it like any
other. Outcomes flow back into calibration: re-weight signal types by *observed*
conversion, re-tune the decay half-life to where conversions actually cluster, re-set
tier thresholds to your reps' real throughput. **score → outreach → outcome → re-weight
→ score.** The engine gets sharper the longer it runs.

This is the resume property too: because every stage processes only rows whose verdict
column is `NULL` and writes that column **after** the work succeeds, a crash re-queues
at most one in-flight batch. The database is the cursor; there is no side-car checkpoint
to drift. See [`orchestration/README.md`](./orchestration/README.md).

---

## 3. Key design decisions

Five decisions carry the whole engine. Each is a deliberate constraint that pays for
itself in a system that runs continuously.

### Fit ≠ intent (two separate numbers, never fused)

**Fit** ("is this the kind of company I sell to?") is slow-moving and answered once, by
a binary gate (Stage 01). **Intent** ("is this company in-market *right now*?") is
fast-moving, decays, and is answered every cycle by scoring (Stage 05). They live in
**separate columns** because when a campaign underperforms you must know *which* number
was wrong — did you target the wrong companies (fit) or the right companies at the wrong
time (intent)? Fuse them and you can't tell. A perfect-fit account with no signal is not
a priority; a great signal on a non-fit account is worthless. You work only the
intersection.

### Domain as identity (never the name)

Company **names** are unstable across sources (`Acme, Inc.` / `Acme Incorporated` /
`ACME` are one company). The **normalized root domain** is the dedup key *and* the join
key everywhere — `Company.domain` PRIMARY KEY, `People.company_domain` FK, same key shape
on `Not-ICP` and `Parked`. Normalize once, at TAM build, and the entire loop —
qualification, signal capture, scoring, outreach status — lands on one row per real
company. Get the domain wrong and the whole pipeline drifts; get it right and the loop
*converges* across multi-source, multi-signal re-entry instead of piling up duplicates.

### Recency decay (intent is perishable)

A signal is evidence that a company feels the pain *now*. "Now" has a shelf life — a
"Head of RevOps" opening from two weeks ago is a live opening; the same post from eight
months ago is filled and cold. Exponential decay with a tunable half-life makes the score
reflect *current* intent, not a lifetime signal count. Without decay, every account that
ever fired a signal sits at the top of the queue forever and the list rots. Decay is also
what lets the *same* account legitimately cool off and drop out of the queue, then heat
back up when a fresh signal lands — the mechanism behind a "self-refreshing" TAM.

### Suppression (the queue's safety rail)

Some accounts must **never** be in outreach regardless of score: closed-won, current
customers, active competitors, already-in-sequence, do-not-contact. Suppression is a
**hard gate applied after scoring** — the score is still recorded for analytics, but a
`suppressed` row is excluded from the work queue. In a loop that re-discovers accounts
constantly, this is non-negotiable: without it the engine will cheerfully re-surface a
customer or a competitor every time a new signal fires on them. The one irreversible
action (the actual send) is gated twice — by the queue predicate *and* by a dedupe check
against the sender's own list — because a double-send is worse than a missed send.

### Source attribution (so you can prune dead signals)

Every account records the signal type that contributed most (`primary_signal_source`) and
the full set that fired (`contributing_signal_types`). This is what makes the feedback
loop measurable: run a cohort report — *"of accounts whose primary source was X, what %
became opportunities vs. accounts sourced by Y?"* — and re-weight or kill signal types by
**observed conversion**, not gut feel. A signal type that sources many accounts but
converts none gets its base weight lowered or dropped. Attribution is the difference
between tuning the engine and tuning blind.

---

## Where each decision is enforced

| Decision | Lives in | Enforced by |
|----------|----------|-------------|
| Fit ≠ intent | Stages 01 + 05 | separate `fit_tier` / `intent_tier` columns; binary gate vs. scored gate |
| Domain as identity | Stage 02 | `normalize_domain()` + `domain` as PRIMARY KEY / join key everywhere |
| Recency decay | Stage 05 | `decay(age_days) = 0.5 ** (age_days / half_life)`, `MAX_SIGNAL_AGE_DAYS` cutoff |
| Suppression | Stage 05 → 06 | post-score `suppressed` flag + pre-send dedupe against the sender list |
| Source attribution | Stage 05 | `primary_signal_source` + `contributing_signal_types` per account |

> The signal layer throughout is **Trigify**. The data/enrichment/research/outreach tools
> (Prospeo, Blitz, AI Ark, Parallel, Firecrawl, Serper, Apify, Supabase, and the senders)
> sit at other layers — they find, enrich, store, and act on accounts. They feed evidence
> into the signal columns; they are complementary to the signal layer, not substitutes
> for it.
