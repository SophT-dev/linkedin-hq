# Orchestration — the resumable signal-led GTM engine

This folder ties the seven stages (`00`–`06`) into **one engine that can be killed at any
point and restarted without losing or duplicating work**. It is the control plane; the stage
folders are the workers.

```
00-tam-build         → build the raw TAM (companies)            [Prospeo / Blitz / AI Ark]
01-account-qualify   → qualify each account against your ICP    [Firecrawl + Parallel + LLM]
02-system-of-record  → load survivors into Supabase             [Supabase]  ← the source of truth
03-signal-mapping    → attach buying/social signals to accounts [Trigify]
04-signal-led-expansion → discover NEW accounts from signals    [Trigify]   ← feeds back into 00/01
05-scoring-stacking  → score + stack signals into a priority    [pure SQL / LLM]
06-outreach          → push the top tier to the outreach layer  [Smartlead / HeyReach / Instantly]
```

The whole thing is designed around three properties. If you understand these three, you
understand the engine.

---

## 1. Why it is stage-gated

Each stage reads rows that the **previous** stage finished and writes a verdict the **next**
stage reads. Stages never reach across more than one boundary. The contract between any two
stages is a single column in Supabase, not a file format or an in-memory object:

| Stage | Reads rows where… | Writes |
|-------|-------------------|--------|
| `01-account-qualify` | `qualify_verdict IS NULL` | `qualify_verdict` ∈ {`fit`, `not_fit`, `unsure`} |
| `02-system-of-record` | `qualify_verdict = 'fit'` AND `loaded_at IS NULL` | `loaded_at` |
| `03-signal-mapping` | `loaded_at IS NOT NULL` AND `signal_checked_at IS NULL` | `signal_checked_at`, signal rows |
| `05-scoring-stacking` | `signal_checked_at IS NOT NULL` AND `score IS NULL` | `score`, `tier` |
| `06-outreach` | `tier = 'A'` AND `pushed_at IS NULL` | `pushed_at` |

Because the gate is a column predicate, **the work that remains is always computable from the
database alone** — you never need a side-car file that says "I got up to row 4,210". The
database *is* the cursor.

This is what makes it safe to interleave manual review: a human can flip a `qualify_verdict`
from `unsure` to `fit` by hand, and stage `02` will pick it up on its next pass with no code
change.

---

## 2. Why it is resumable

**Every step only processes rows whose verdict / signal column is `NULL`.** That one rule is the
whole resume mechanism. There is no checkpoint file to corrupt, no offset to drift.

- Crash at row 4,210 of 19,000? Re-run the stage. The 4,210 already-written rows have a
  non-`NULL` verdict and are skipped by the `WHERE … IS NULL` filter. You resume at 4,211 for
  free.
- Want to re-run a stage from scratch on a subset? `UPDATE … SET qualify_verdict = NULL WHERE …`
  and re-run. The stage re-does exactly that subset.
- Want to add 5,000 new companies to an existing TAM? Insert them with `qualify_verdict = NULL`.
  Every downstream stage treats them as un-processed and pulls them through. **No "full
  rebuild" exists or is ever needed.**

The orchestrator (`run_pipeline.py`) holds **no state of its own**. Kill it mid-run and restart;
it re-reads the gate columns and continues. Its only job is to call the stages in order and
stop early if a stage reports "nothing left to do".

> Practical consequence: the safe way to operate this engine is to run it *often* and *partially*.
> A cron tick that processes the 300 rows that became un-`NULL` since the last tick is the normal
> mode — not a once-a-week 19,000-row marathon.

---

## 3. Why it is idempotent

Resumable means "doesn't lose work". Idempotent means "running it twice does not create
duplicate or wrong work". You need both. Three rules buy idempotency:

1. **Writes are keyed, not appended.** Every upsert into Supabase uses a natural key
   (`domain` for companies, `domain + person_linkedin_url` for contacts, `account_id +
   signal_type + source_url` for signals). Re-processing a row overwrites its own record
   instead of inserting a second one. Use Postgres `ON CONFLICT (key) DO UPDATE`.
2. **A verdict is only written after the expensive work succeeds.** Order inside each step is:
   call the API → validate the response → *then* `UPDATE … SET verdict = …`. If the API call
   throws, the verdict stays `NULL`, the row stays in the queue, and the retry is automatic on
   the next pass. Never write the verdict first.
3. **External side-effects (stage 06) carry their own guard.** Pushing a contact to an outreach
   tool is the one irreversible action, so it is gated twice: by `pushed_at IS NULL` in the query
   **and** by a dedupe check against the outreach tool's own list before the push. A double-send
   is worse than a missed send.

Idempotency is what lets the cron loop in section 6 run unattended. A tick that overlaps the
previous tick, or re-processes a row the previous tick already touched, is harmless.

---

## 4. The sub-agent batch pattern (for LLM classification stages)

Stages `01-account-qualify` and `05-scoring-stacking` (the LLM-judged parts) are the slow,
expensive stages. They follow a fan-out / checkpoint / fan-in pattern so a 19,000-row
classification finishes in wall-clock minutes instead of hours, and survives a mid-run crash.

```
                 ┌─ batch 0 (rows 0..499)    → sub-agent → checkpoint 0 ─┐
 un-NULL rows ──→├─ batch 1 (rows 500..999)  → sub-agent → checkpoint 1 ─┤──→ verdicts in Supabase
 (the queue)     ├─ batch 2 (rows 1000..1499)→ sub-agent → checkpoint 2 ─┤
                 └─ …                         → …          → …            ─┘
                        (N batches run in parallel, each independent)
```

The mechanics:

1. **Split.** Pull the un-`NULL` queue, slice it into `N`-row batches (default `BATCH_SIZE=500`;
   smaller for slow per-row work like homepage qualification, larger for cheap text
   classification). Each batch is a self-contained unit of work — it carries its own input rows
   and writes its own output.
2. **Run in parallel.** Hand each batch to an independent sub-agent / worker process.
   `MAX_PARALLEL` (default `4`) caps how many run at once so you respect the **slowest** tool's
   rate limit (see `batching.md`). Parallelism is bounded by the rate limit, not by CPU.
3. **Checkpoint each batch.** When a batch finishes, it writes its verdicts to Supabase
   **as one batched POST of ≤200 rows** (Supabase's comfortable upsert size) and records the
   batch as done. Because verdicts are keyed upserts, a re-run of a partially-completed batch is
   safe. A crash loses at most one in-flight batch, not the whole run.
4. **Fan back in.** The orchestrator waits for all batches, then asks the gate query again. Any
   rows still `NULL` (a batch that errored out entirely) simply get re-queued on the next
   invocation — no special "retry the failures" code path, the `WHERE … IS NULL` filter *is* the
   retry.

Why sub-agents and not one big loop? Three reasons: (a) a single bad row (timeout, malformed
homepage) can't stall the other 18,999 — it fails its own batch and the rest proceed; (b)
batches are the natural unit for the rate-limit budget — you tune `MAX_PARALLEL × per-call cost`
against the tool ceiling; (c) the checkpoint granularity matches the batch, so the blast radius
of any failure is one batch.

> The Anthropic API specifics for the LLM-judge calls (model id, prompt-caching the long ICP
> rubric across a batch, structured tool-use for the verdict, token budgeting) live next to the
> stage that makes the calls, in `01-account-qualify/`. This README only fixes the *batch
> orchestration* shape; the stage owns the prompt.

---

## 5. Per-tool rate limits (the budget every stage spends against)

The hard numbers live in `batching.md` with the retry/backoff code pattern. The summary the
orchestrator cares about:

| Tool | Stage | Ceiling we target | How the engine respects it |
|------|-------|-------------------|----------------------------|
| **Blitz** | 00, 03 | ~4–5 req/sec | token-bucket limiter at 4 rps (one under the 5 rps cap) |
| **Prospeo** | 00, 06 | 5/sec · 300/min · 2,000/day (Starter); 30/sec on Pro | per-second + per-day bucket; stop the stage when the daily bucket empties |
| **AI Ark** | 00 | provider-defined | conservative 2 rps default until you confirm your plan's ceiling |
| **Firecrawl** | 01 | ~12 concurrent workers (plan-dependent) | bounded worker pool of 12; never fire-and-forget |
| **Parallel** | 01 | 2,000 req/min (Task API), **async** | submit → poll for status, don't block a worker on a 30-min task |
| **Serper** | 01, 03 | high, but pay-per-query | batch where the endpoint allows; cache results by query |
| **Apify** | 01 (fallback), 04 | actor-run, not rps | **space batches 60–90 s apart with backoff** — see below |
| **Trigify** | 03, 04 | credit-metered, not rps | filter *before* enriching; let webhooks push, don't poll hot |
| **Supabase** | all | generous; we self-limit | **200-row POST batches**, keyed upserts |

**Apify is the one that bites.** It runs *actors* (whole jobs), not request-per-second calls.
Firing batches back-to-back gets you throttled or queued behind your own runs. The pattern is:
launch a batch, wait for the run to finish, **sleep 60–90 s with jitter**, launch the next.
Treat Apify as the slow fallback it is, not a primary throughput path.

**Trigify is the signal layer and is credit-metered, not rate-limited in rps terms.** The cost
control is *order of operations*: filter posts/profiles down with a cheap search first, and only
spend enrichment credits on what survives the filter. Prefer its webhook push (Signal Created →
your endpoint) over polling its results on a tight loop.

---

## 6. Scheduling the continuous loop

The engine is built to run as a **short, frequent tick**, not a long batch job. Because it is
resumable and idempotent, a tick that does nothing (no new un-`NULL` rows) is free, and a tick
that overlaps the previous one is harmless.

### Option A — cron (simplest)

Run a partial tick every 15 minutes. Each tick drains whatever became un-`NULL` since the last
one. `flock` prevents two ticks from overlapping if a run ever runs long.

```cron
# m   h  dom mon dow   command
*/15  *  *   *   *     /usr/bin/flock -n /tmp/sigeng.lock \
                         /usr/bin/env -S bash -c 'cd /path/to/signal-gtm-engine && \
                         set -a && . ./.env && set +a && \
                         python3 orchestration/run_pipeline.py --max-rows 500 >> /var/log/sigeng.log 2>&1'
```

`--max-rows 500` bounds each tick so a backlog drains gradually instead of one tick trying to
process 19,000 rows and blowing every rate-limit budget at once.

### Option B — GitHub Actions (no server to babysit)

A scheduled workflow does the same thing, with keys stored as encrypted repo secrets (never in
the repo). Sketch:

```yaml
# .github/workflows/engine-tick.yml  — illustrative; adapt to your repo
name: engine-tick
on:
  schedule:
    - cron: "*/15 * * * *"   # every 15 min, UTC
  workflow_dispatch: {}       # manual "run now" button
concurrency:
  group: engine-tick          # GH cancels/queues overlapping ticks for you
  cancel-in-progress: false
jobs:
  tick:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.11" }
      - run: pip install requests
      - name: run one tick
        env:
          PROSPEO_API_KEY:       ${{ secrets.PROSPEO_API_KEY }}
          BLITZ_API_KEY:         ${{ secrets.BLITZ_API_KEY }}
          AI_ARK_API_KEY:        ${{ secrets.AI_ARK_API_KEY }}
          PARALLEL_API_KEY:      ${{ secrets.PARALLEL_API_KEY }}
          FIRECRAWL_API_KEY:     ${{ secrets.FIRECRAWL_API_KEY }}
          SERPER_API_KEY:        ${{ secrets.SERPER_API_KEY }}
          APIFY_API_KEY:         ${{ secrets.APIFY_API_KEY }}
          TRIGIFY_API_KEY:       ${{ secrets.TRIGIFY_API_KEY }}
          ANTHROPIC_API_KEY:     ${{ secrets.ANTHROPIC_API_KEY }}
          SUPABASE_PROJECT_REF:  ${{ secrets.SUPABASE_PROJECT_REF }}
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_ANON_KEY:     ${{ secrets.SUPABASE_ANON_KEY }}
        run: python3 orchestration/run_pipeline.py --max-rows 500
```

The `concurrency` block gives you the same overlap-safety `flock` gives cron. The 20-minute
timeout is a guardrail — a healthy tick finishes in seconds-to-minutes because it only touches
the new rows.

### Signal-driven ticks (the real-time path)

The 15-minute cron handles the **batch** spine (00 → 01 → 02 → 05 → 06). The **signal** spine
(03/04) is better driven by **Trigify webhooks**: configure a Signal Created action to POST to
your endpoint, which inserts a signal row (keyed, idempotent) and optionally triggers an
out-of-band `run_pipeline.py --stages 05,06` for just that account. That way a hot signal reaches
outreach in minutes without waiting for the next cron tick, while the cron still sweeps up
anything the webhook missed. Same engine, two clocks.

---

## 7. Operating cheat-sheet

```bash
# See what each stage has left to do (counts of un-NULL rows) — read-only, run anytime
python3 orchestration/run_pipeline.py --status

# Run the full chain once, bounded to 500 rows per stage (the normal manual tick)
python3 orchestration/run_pipeline.py --max-rows 500

# Run only the LLM qualification stage, e.g. after you added new TAM rows
python3 orchestration/run_pipeline.py --stages 01

# Re-run a stage from scratch on a subset: clear its verdict in SQL, then run the stage.
#   UPDATE accounts SET qualify_verdict = NULL WHERE created_at > '2026-01-01';
# Dry run — print what WOULD happen, touch nothing
python3 orchestration/run_pipeline.py --dry-run
```

Nothing here is destructive by default. Every "redo" is expressed as `SET <verdict> = NULL` in
SQL, which puts rows back in a queue the engine already knows how to drain.
