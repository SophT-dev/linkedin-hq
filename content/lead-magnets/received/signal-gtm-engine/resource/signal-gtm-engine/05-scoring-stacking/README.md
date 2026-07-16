# Stage 05 — Scoring & Stacking

> **Intent scoring lives here. Fit scoring does not.**
> Stage 01 (`01-account-qualify`) already answered *"should this account exist in my world at all?"* — that is **fit**. This stage answers a different question: *"of the accounts that already fit, which ones are showing buying behavior RIGHT NOW, and how strong is the case?"* — that is **intent**.

Keeping the two separate is the whole point. A perfect-fit account with zero signals is not a priority. A weak-fit account with five fresh, stacked signals usually isn't either. The accounts you want are the ones where **fit is already true** AND **intent is rising**. This stage produces the second number, then lets you stack it on top of fit so you only ever work the intersection.

---

## Fit vs. Intent — why they are different scores

| | **Fit** (Stage 01) | **Intent** (this stage) |
|---|---|---|
| Question | Is this the kind of account I sell to? | Is this account in-market *now*? |
| Inputs | Industry, size, geo, tech stack, business model | Signals: hiring, funding, leadership change, social engagement, content interaction, web/research activity, product usage triggers |
| Time behavior | Slow-moving, mostly static | **Decays.** A signal from 90 days ago is worth a fraction of the same signal from yesterday |
| Failure mode if you merge them | You promote a great-fit account with no activity and waste a rep's week, OR you chase a noisy account you can't actually sell to | — |
| Output | `fit_tier` (e.g. A/B/C) | `intent_score`, `intent_tier`, `suppressed` |

**Never collapse fit into intent.** Store them in separate columns. The reason is operational: when a campaign underperforms you need to know *which* number was wrong. If they're fused you can't tell whether you targeted the wrong companies (fit) or the right companies at the wrong time (intent).

The final work-queue rule is a simple AND:

```
work_now  =  fit_tier in (A, B)  AND  intent_tier in (A, B)  AND  NOT suppressed
```

---

## The five things this stage does

1. **Composite signal score** — combine every signal on an account into one weighted number.
2. **Recency decay** — down-weight old signals so the score reflects *current* intent, not historical noise.
3. **Stacking** — reward accounts where *multiple distinct* signal types fire together; conviction from a stack beats conviction from a single loud signal.
4. **Tiering** — bucket the continuous score into A/B/C/D so reps and sequences can act on a label, not a decimal.
5. **Suppression** — guarantee that closed-won, current customers, active competitors, and already-in-sequence accounts never re-enter the outreach queue.

And one thing it records for later:

6. **Source attribution** — tag which signal *type* first sourced (and which ones boosted) each account, so that 60 days from now you can kill the signal types that never convert.

---

## 1. Composite signal score

Each signal has:

- a **base weight** — how much this *kind* of signal is worth (a Series-B funding round is worth more than a single LinkedIn like),
- a **strength** in `[0,1]` — how strong this particular instance is (engaged with 3 posts > liked 1 post),
- an **age in days** — how long ago it fired.

The contribution of a single signal is:

```
contribution = base_weight × strength × decay(age_days)
```

The raw composite is the sum of all contributions on the account, then a **stacking multiplier** (below) is applied, then the result is normalized to `[0,100]`.

Base weights are **config**, not code. They live in `signal_weights.json` (a template ships in this folder) so you can re-tune without touching the script. Starting point you should override for `<YOUR_PRODUCT>`:

```json
{
  "funding_round":        10.0,
  "leadership_hire":       8.0,
  "headcount_growth":      6.0,
  "hiring_for_role":       7.0,
  "social_engagement":     3.0,
  "content_interaction":   4.0,
  "web_research_activity": 5.0,
  "product_trigger":       9.0
}
```

> **Where signals come from.** In this engine the signal layer is **Trigify** (Stage 03 / Stage 04). It captures social engagement, keyword/topic listening, competitor-audience and content-interaction signals and writes them to the system of record (Stage 02, Supabase). This stage is **source-agnostic** — it reads normalized signal rows out of the system of record and scores them. Funding / hiring / leadership signals can be sourced via Serper (news + ATS detection) or other complementary tools and written into the same signal table. As long as a signal row has `signal_type`, `strength`, and `occurred_at`, this stage will score it.

---

## 2. Recency decay (signals expire)

This is the single most important idea in the stage. **Intent is perishable.** Someone hiring a "Head of RevOps" two weeks ago is a live opening; the same posting from eight months ago is filled and cold. If you score by raw signal count you will keep surfacing stale accounts forever.

We use **exponential decay** with a configurable **half-life** (default 30 days):

```
decay(age_days) = 0.5 ** (age_days / half_life_days)
```

| Age of signal | Weight retained (half-life = 30d) |
|---|---|
| 0 days (today) | 100% |
| 15 days | 71% |
| 30 days (one half-life) | 50% |
| 60 days | 25% |
| 90 days | 12.5% |

Set the half-life per signal *class* if you want — fast-moving signals (a social like) should decay faster than slow ones (a funding round still matters 60 days out). The script supports a per-type `half_life_days` override in `signal_weights.json`; if absent it falls back to the global default.

A signal older than `MAX_SIGNAL_AGE_DAYS` (default 120) is dropped entirely before scoring — past a point a signal is just history.

---

## 3. Stacking (combining signals raises conviction)

One signal is a guess. Three *different kinds* of signal firing on the same account in the same window is a pattern. Stacking encodes that: an account with `funding_round` + `hiring_for_role` + `web_research_activity` should outrank an account with three social likes, even if the raw sum is similar.

We reward **distinct signal types**, not raw volume (10 likes from one bot is not 10 signals). The stacking multiplier:

```
distinct_types = number of DISTINCT signal_type values with a live (non-expired) signal
stack_multiplier = 1 + STACK_BONUS × (distinct_types - 1)     # capped at STACK_CAP
```

With `STACK_BONUS = 0.25`, `STACK_CAP = 2.0`:

| Distinct signal types | Multiplier |
|---|---|
| 1 | 1.00× |
| 2 | 1.25× |
| 3 | 1.50× |
| 4 | 1.75× |
| 5+ | 2.00× (capped) |

The cap stops a single account from running away just because it touches many channels. Tune `STACK_BONUS` / `STACK_CAP` in env.

---

## 4. Tiers (A / B / C / D)

The continuous `[0,100]` score is bucketed into intent tiers via configurable thresholds (env-driven defaults shown):

| Tier | Score band | Meaning | Action |
|---|---|---|---|
| **A** | ≥ 70 | Hot — fresh, stacked intent | Route to outreach (Stage 06) immediately |
| **B** | 45–69 | Warm — real but thinner | Queue / nurture; re-score weekly |
| **C** | 20–44 | Low — a flicker | Hold; let signals stack or decay |
| **D** | < 20 | Cold — noise floor | Do not work on intent alone |

Thresholds are **not universal** — recalibrate them to your own signal volume once you have a few weeks of data (see "Calibration" below). The bands above are a starting template.

---

## 5. Suppression (the queue's safety rail)

Some accounts must **never** enter outreach no matter how hot their intent score is:

- **Closed-won** — they already bought; re-pitching is embarrassing.
- **Existing customers** — owned by CS/AM, not new-business outreach.
- **Active competitors** — never sell to / pitch a competitor.
- **Already-in-sequence** — they're being worked right now; double-sequencing burns the lead and the sender reputation.
- (optional) **Hard exclusions / do-not-contact** — legal, opt-out, manual blocklist.

Suppression is a **hard gate**, applied *after* scoring (so you still record the score for analytics) but *before* anything is handed to Stage 06. A suppressed account keeps its `intent_score` and `intent_tier` for reporting but carries `suppressed = true` and a `suppression_reason`, and is excluded from the work queue.

Full rules and how to maintain the lists: **[`suppression.md`](./suppression.md)**.

---

## 6. Source attribution (so you can kill dead signal types)

Every account records:

- `primary_signal_source` — the signal type that contributed the **most** to the final score (the dominant reason this account is here),
- `contributing_signal_types` — the full set of distinct types that fired.

Why: in 60 days you'll run a cohort report — *"of accounts whose primary source was `social_engagement`, what % became opportunities vs. accounts sourced by `funding_round`?"* If a signal type sources lots of accounts but none convert, you **lower its base weight or drop it**. Attribution is what makes that feedback loop possible. Without it, you're tuning blind.

---

## Inputs / Outputs

**Input** — normalized signal rows from the system of record (Stage 02, Supabase). One row per signal:

```
account_id, signal_type, strength (0..1), occurred_at (ISO8601), source (tool/string)
```

Plus an account-status feed for suppression (account_id → status: customer / closed_won / competitor / in_sequence / dnc).

**Output** — one scored row per account, written back to the system of record (and/or a local CSV for inspection):

```
account_id, intent_score, intent_tier, distinct_signal_types,
primary_signal_source, contributing_signal_types,
suppressed, suppression_reason, scored_at
```

> Stage 06 (`06-outreach`) consumes only rows where `intent_tier in (A,B)` AND `NOT suppressed` AND (joined on fit) `fit_tier in (A,B)`.

---

## How to run

```bash
# 1. Copy & fill the repo-root env template (one level up)
cp ../.env.example ../.env        # then edit ../.env

# 2. (optional) Tune the signal weights / half-lives
cp signal_weights.json signal_weights.local.json   # edit, then point SIGNAL_WEIGHTS_PATH at it

# 3. Dry run on the bundled example CSVs (no DB writes).
#    `examples/` holds committed sample fixtures; `data/` is gitignored output.
python3 score_stack.py --signals-csv ./examples/signals.example.csv \
                       --status-csv  ./examples/account_status.example.csv \
                       --out-csv     ./data/scored.csv \
                       --dry-run

# 4. Or run against the system of record (reads + writes Supabase via REST)
python3 score_stack.py --from-supabase --to-supabase
```

Everything is env / flag / config driven — no data is hardcoded. See the `# TODO: customize` markers in `score_stack.py` for the spots you must adapt to your own schema and signal taxonomy.

---

## Calibration (do this after ~2–4 weeks of live data)

1. **Decay half-life** — pull the age distribution of signals on accounts that *converted*. If conversions cluster around signals 0–10 days old, shorten the half-life. If intent stays warm for months in your motion, lengthen it.
2. **Base weights** — run the source-attribution cohort report. Re-weight by *observed conversion per signal type*, not gut feel.
3. **Tier thresholds** — set tier A so it captures roughly the volume your reps can actually work in a week. Tiers are a throughput control, not a law of nature.
4. **Stack bonus** — if single-signal A-tier accounts convert as well as stacked ones, lower `STACK_BONUS`. If stacks dramatically out-convert, raise it (and the cap).

The whole stage is a feedback loop: **score → outreach → outcome → re-weight → score**.

---

## Files in this folder

| File | What it is |
|---|---|
| `README.md` | This document — the why + how. |
| `score_stack.py` | Runnable template: weighted composite score, recency decay, stacking, tiering, suppression flags, source attribution. Env/config-driven, stdlib + `requests`. |
| `suppression.md` | The suppression rules and how to build / maintain the suppression lists. |
| `signal_weights.json` | Config template: per-signal-type base weights and optional per-type half-lives. |
| `examples/` | Committed sample fixtures (`signals.example.csv`, `account_status.example.csv`) for the dry-run walk-through. `data/` is the gitignored output dir. |
