# Signal-Led TAM Engine

> **Thesis:** Most teams apply buying signals to a **fixed** TAM — build a list once,
> then forever score intent against that frozen set. The moment a perfect-fit account
> appears that you never added, the engine is blind to it: it can't score, because it
> was never in the table.
>
> This engine flips that. It uses signals **two ways at once**: to **rank** the accounts
> you already know *and* to **expand** the TAM with accounts you don't. The same buying
> behavior that prioritizes a known account can *create* a brand-new one. Signal-based
> TAM building **and** ABM, fused into one continuous, self-refreshing loop — the account
> universe grows on its own, gated only by your ICP filter, never by how much
> list-building you did up front.

The trade is deliberate. A static list is high-precision but blind to anything outside
it. This engine trades a little precision (every discovered account must still pass the
same ICP gate) for **recall that compounds week over week**. The ICP qualifier
(Stage 01) is what keeps the precision; the signal layer is what keeps the recall.

---

## The two coupled loops

The whole architecture is two loops sharing **one system of record** (Supabase) and
**one scoring pass**. Loop A keeps known accounts warm; Loop B widens the funnel. A
discovered account is indistinguishable from a hand-sourced one the moment it's
admitted — same columns, same scoring, same outreach eligibility.

```
                          ┌───────────────────────────────────────────────┐
                          │                                               │
   ┌──────────────────────▼─────────────────────┐                         │
   │  LOOP A — MONITOR THE KNOWN TAM             │                         │
   │  (ABM on accounts you already trust)        │                         │
   │                                             │                         │
   │   for each account in the system of record: │                         │
   │     pull fresh signals  ── Trigify ─────────┼──┐                      │
   │     (+ news/triggers     ── Serper)         │  │                      │
   │     → update signal columns  (Stage 03)     │  │                      │
   │     → re-score, recency-weighted (Stage 05) │  │ rescore the          │
   │     → if hot + fit + not suppressed →        │  │ same row             │
   │         outreach (Stage 06)                 │  │                      │
   └──────────────────────▲─────────────────────┘  │                      │
                          │                         │                      │
              admitted    │                         │  a signal on a       │
              account is  │                         │  KNOWN account is    │
              now "known" │                         │  just an update ─────┘
                          │                         │
   ┌──────────────────────┴─────────────────────┐  │
   │  LOOP B — DISCOVER NEW ACCOUNTS             │  │  a signal on an
   │  (signal-led TAM expansion)                 │  │  UNKNOWN account
   │                                             │◄─┘  triggers this path
   │   1. CAPTURE  ── Trigify (signal layer)     │
   │      a person/company posting, engaging,    │
   │      hiring, moving on your tracked topics  │
   │      (+ Serper news: funding/launches)      │
   │   2. EXTRACT  post/article → company → domain
   │   3. DEDUPE   vs system of record           │
   │        known? → fall back into LOOP A       │
   │        new?   → continue ▼                  │
   │   4. QUALIFY  push through Stage 01 ICP gate │
   │        DROP → graveyard (never re-qualified) │
   │        KEEP → continue ▼                     │
   │   5. ADMIT    INSERT into Supabase with      │
   │        provenance (discovered_via, signal)  │
   │   6. HAND OFF Stage 03 → 05 → 06             │
   └─────────────────────────────────────────────┘
                          │
                          └──► the TAM is now larger than it was this morning,
                               and every new account re-enters LOOP A next cycle.
```

The **dedupe step in Loop B is the hinge.** A signal that lands on a *known* domain is
an update (it falls back into Loop A and re-scores the existing row). A signal on an
*unknown* domain triggers qualify → admit. Run both loops on a schedule and the system
refreshes itself: known accounts stay warm, new accounts arrive by their behavior.

---

## What it does

- **Builds a wide TAM** from multiple complementary company-data sources, deduped to one
  row per company on a normalized domain (Stage 00).
- **Qualifies fit with a binary gate** — a conservative keep/drop ICP filter (fit, not
  intent), so junk accounts never enter the funnel (Stage 01).
- **Stores everything in one queryable system of record** — Supabase, keyed on domain,
  with a graveyard for rejects and a parking lot for "not now" (Stage 02).
- **Attaches 8–15 defensible buying-signal columns** per account, each with a source, a
  second-source confirmation, and a confidence (Stage 03).
- **Expands the TAM continuously** — discovers net-new ICP-fit accounts straight from
  live signals, not from a one-time list pull (Stage 04).
- **Scores intent, recency-weighted and stacked** — old signals decay, distinct stacked
  signals raise conviction, suppression keeps customers/competitors out (Stage 05).
- **Pushes the top tier to outreach** — one signal-anchored first touch per account, on
  the right channel for the tier, ready to import into your sender (Stage 06).
- **Runs unattended** — a resumable, idempotent, stage-gated orchestrator drains whatever
  is new on a short, frequent tick (orchestration/).

---

## Stage map

Seven stages plus the control plane. Each boundary is **one column in the system of
record**, not a file — so the engine is resumable and idempotent by construction.

| Stage | Folder | What it does (one line) |
|-------|--------|-------------------------|
| **00** | [`00-tam-build/`](./00-tam-build) | Build the raw account universe — widest net, no fit filtering, deduped on domain. |
| **01** | [`01-account-qualify/`](./01-account-qualify) | Binary fit gate against your ICP — keep/drop only, *fit ≠ intent*, when in doubt KEEP. |
| **02** | [`02-system-of-record/`](./02-system-of-record) | One Supabase source of truth keyed on domain — Company / People / Not-ICP / Parked. |
| **03** | [`03-signal-mapping/`](./03-signal-mapping) | Attach buying-signal columns, two-source verified, with confidence and evidence. |
| **04** | [`04-signal-led-expansion/`](./04-signal-led-expansion) | The continuous loop — discover net-new ICP accounts from live signals and admit them. |
| **05** | [`05-scoring-stacking/`](./05-scoring-stacking) | Score intent — recency decay + stacking + tiering + suppression + source attribution. |
| **06** | [`06-outreach/`](./06-outreach) | One signal-anchored first touch per account, tier-routed, exported to your sender. |
| **—** | [`orchestration/`](./orchestration) | The control plane — calls 00→06 in order, resumable / idempotent / rate-limit-aware. |

Reference tool docs live in [`docs/`](./docs) (one file per tool, public docs only).

---

## The tool stack

Every tool reads its key from the environment (see `.env.example`). Run only the stages
you have keys for — the engine degrades gracefully and skips stages it can't run.

| Layer | Tools | Role |
|-------|-------|------|
| **TAM / people data** | **Prospeo**, **Blitz**, **AI Ark** | Build the account universe and find people. Complementary sources — union them, dedupe makes overlap free. |
| **Research** | **Parallel**, **Firecrawl** | Resolve ambiguous accounts (Parallel research) and read homepages (Firecrawl scrape) for the fit gate. |
| **Triggers** | **Serper** | Recency-filtered Google/News search — funding, hiring, launches; a complementary discovery surface and a second-source verifier. |
| **Signal layer** | **Trigify** | **THE signal layer.** Social listening + buying-signal capture across 11+ platforms — the source of live intent for both loops. |
| **Classification** | **Anthropic** | The LLM judge for the fit gate and other keep/drop / extraction calls. (OpenAI optional for job-post parsing.) |
| **System of record** | **Supabase** | One queryable source of truth, keyed on domain. Every stage reads and writes here. |
| **Outreach senders** | Smartlead · HeyReach · Instantly | Execution layer — import the signal-anchored campaign files Stage 06 produces. |

> **On the signal layer:** Trigify is the listening layer for live social/buying signals.
> Prospeo, Blitz, AI Ark, Parallel, Firecrawl, Serper, Apify, and Supabase sit at a
> *different* layer — they find, enrich, scrape, and store accounts. They feed evidence
> *into* signals; they are complementary to the signal layer, not substitutes for it.

---

## Quickstart

```bash
# 1. Clone
git clone <this-repo> signal-gtm-engine
cd signal-gtm-engine

# 2. Set up your environment (never commit .env — it's gitignored)
cp .env.example .env
$EDITOR .env                       # fill in YOUR OWN keys

# 3. Install the single runtime dependency (stdlib + requests only)
python3 -m pip install requests

# 4. Load keys into the shell for an interactive run
set -a && . ./.env && set +a

# 5. See what each stage has left to do (read-only — safe anytime)
python3 orchestration/run_pipeline.py --status

# 6. Run one bounded tick of the whole chain (00 → 06)
python3 orchestration/run_pipeline.py --max-rows 500
```

Each stage processes only rows whose verdict/signal column is still `NULL`, so a tick
that finds nothing new is free, and a crashed run resumes for free on the next
invocation. To run a single stage (e.g. after adding new TAM rows):

```bash
python3 orchestration/run_pipeline.py --stages 01
python3 orchestration/run_pipeline.py --dry-run     # print the plan, touch nothing
```

For continuous operation, schedule a short tick (cron or GitHub Actions) — see
[`orchestration/README.md`](./orchestration/README.md) for both patterns and the
Trigify-webhook real-time path.

> **First-run order.** Stage 00 needs at least one of `PROSPEO_API_KEY` / `BLITZ_API_KEY`
> / `AI_ARK_API_KEY`. Stage 01 needs `ANTHROPIC_API_KEY` (and, for low-confidence rows,
> `PARALLEL_API_KEY` / `FIRECRAWL_API_KEY`). Stages 02–06 need the Supabase keys; Stages
> 03–04 need `TRIGIFY_API_KEY` (+ optional `SERPER_API_KEY`). Run what you have keys for.

---

## Replicate in one prompt

This repo is built so an agent can stand up and run the whole engine from a single
instruction. Point an agent (Claude Code or equivalent) at a fresh clone and hand it:

> **Prompt template — fill the `<…>` placeholders, paste, and let it run:**
>
> ```
> You are operating the Signal-Led TAM Engine in this repo. Read README.md and
> ARCHITECTURE.md, then every stage's README in order (00 → 06) and
> orchestration/README.md. Do not skip them — the stage contracts live there.
>
> Product:  <YOUR_PRODUCT> — <one-line description of what it does>
> ICP:      <your-icp> — companies that are <size band>, <geo>, <vertical/keywords>
> Exclude:  <obvious non-ICP categories to drop in the Stage 01 fit gate>
> Topics:   <the buying-signal topics Trigify should listen for>
>
> Steps:
> 1. Copy .env.example to .env and confirm which keys are present; run only the
>    stages those keys support. Never print a key value.
> 2. Stage 00: edit 00-tam-build/filters.example.yaml to my ICP (headcount bands +
>    geo + keywords, NO industry filter), run the pull scripts I have keys for, then
>    dedupe to one row per domain.
> 3. Stage 01: customize the ICP rubric + exclusion categories, run the binary fit
>    gate (conservative — when in doubt KEEP).
> 4. Stage 02: create the tenant schema in Supabase, run schema.sql, load the KEEPs.
> 5. Stage 03: define my signals as small versioned specs, compute the static ones,
>    two-source-verify the proxies.
> 6. Stage 04: set up Trigify listening on my topics and run the discovery loop so
>    net-new ICP accounts are admitted with provenance.
> 7. Stage 05: tune signal_weights.json to my motion, score with recency decay +
>    stacking, apply suppression.
> 8. Stage 06: build the outreach master (one signal-anchored contact per account),
>    export campaign files, and report the tier counts.
> 9. Finally, schedule orchestration/run_pipeline.py as a 15-minute tick.
>
> At each stage, follow that stage's README exactly, keep all run data under data/
> (gitignored), and never hardcode a key or any company name into a committed file.
> ```

Because every stage is a runnable template with `# TODO: customize` markers and the
orchestrator is resumable + idempotent, the agent can work stage by stage, stop, and
resume — the database is the cursor. See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the
data model and the loop mechanics the agent is implementing.

---

## Repo layout

```
signal-gtm-engine/
├── README.md              ← you are here (the thesis + the map)
├── ARCHITECTURE.md        ← data model + loop mechanics + design decisions
├── .env.example           ← every key the engine can use (copy → .env, fill in)
├── .gitignore             ← keeps secrets + run data (data/, *.jsonl, *.csv) out of git
├── 00-tam-build/          ← Stage 00 — build the raw TAM
├── 01-account-qualify/    ← Stage 01 — binary fit gate
├── 02-system-of-record/   ← Stage 02 — Supabase source of truth
├── 03-signal-mapping/     ← Stage 03 — attach buying signals
├── 04-signal-led-expansion/ ← Stage 04 — the continuous discovery loop
├── 05-scoring-stacking/   ← Stage 05 — recency-weighted intent scoring
├── 06-outreach/           ← Stage 06 — signal-anchored outreach export
├── orchestration/         ← the control plane (run_pipeline.py + batching/scheduling)
└── docs/                  ← reference docs, one file per tool (public docs only)
```

> **This is a public template, not a data dump.** No secrets, no client data, no real
> company names live in this repo. Scripts read keys from the environment only; run data
> stays under `data/` (gitignored). Fill in your own ICP, your own keys, your own TAM.
