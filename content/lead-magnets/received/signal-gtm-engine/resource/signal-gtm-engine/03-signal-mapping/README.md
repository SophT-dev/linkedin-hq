# Stage 03 — Signal Mapping

> Goal: attach **8–15 defensible buying-signal columns** to every account in your
> system of record (Stage 02), so that Stage 05 (scoring) has real evidence to
> rank on instead of firmographic guesses.

A signal is **evidence that a company feels your pain right now**. Not "they
*could* be a fit" (that's ICP, Stage 01). A signal answers: *what changed, what
are they doing, or what are they saying that means the cost of ignoring
`<YOUR_PRODUCT>` just went up for them this week?*

Firmographics tell you **who** to sell to. Signals tell you **when** and **why
now** — and "why now" is the line in your first message that earns a reply.

---

## The mental model: signals are small, versioned specs

The mistake teams make is treating "signal" as a vibe ("they seem like they're
growing"). That doesn't survive contact with a sceptical AE who asks *"why is
this account on my list?"*

So we define every signal as a **spec** — a tiny YAML file (see
`signals.example.yaml`) with:

- a **name** (`signal_hiring_ai_eng`) — becomes a column in your account table
- a **source** (where the evidence comes from: job posts, homepage, DNS, Trigify, Serper)
- a **method** (how we detect it — one of the 5 methods below)
- **params** (the keywords / thresholds / vendor map / geo gate)
- a **verify** rule (the second source that confirms it — kills false positives)
- a **weight** (how much this signal matters; consumed downstream in Stage 05)
- a **version** (`v1`, `v2`…) — because signal definitions drift, and a stale
  keyword list silently rots your whole pipeline

Versioning matters because the *definition* is the asset. When reply rates drop,
you don't want to ask "did the market change or did our detection break?" — you
want a git diff of `signal_hiring_ai_eng` from `v1` to `v2`.

Keep each spec **small and single-purpose.** One signal = one observable fact.
"They're hiring AND in the US AND on a competitor tool" is **three** signals you
stack later, not one mega-signal. Small signals are debuggable, reusable across
clients, and independently weightable.

---

## Two families of signal

### 1. Static / inferred signals (computed from data you already store)

These run over the company rows already in your system of record — homepage
text, job-post text, headcount, location, tech stack. They're cheap, batch-y,
and rerunnable. Methods 1–5 below produce these. Script:
[`write_signals.py`](./write_signals.py).

Examples:
- `signal_hiring_ai_eng` — job posts mention "machine learning engineer"
- `signal_uses_<category>_tool` — DNS CNAME resolves to a known vendor
- `signal_geo_us` — HQ country is in the allowed set
- `signal_scaling_team` — headcount or open-role count over a threshold
- `signal_homepage_mentions_pain` — homepage copy names your problem space

### 2. Social / live buying signals (captured from the SIGNAL LAYER — Trigify)

These are **time-sensitive human behaviour** — a person at a target account
posting about your problem, engaging with relevant content, changing roles, or
the company starting to hire. You can't compute these from stored data; you have
to **listen** for them. **Trigify is the signal layer** that monitors 11+ social
platforms and emits these events.

Examples Trigify surfaces (person-level): *posted about a tracked topic*,
*engaged competitor/relevant content*, *changed role*, *changed company*,
*started hiring*, *buying-window signal (topic + role match)*. Company-level:
*expansion / new location*, *funding*, *tool-stack move*.

The pattern: a **broad search** casts the net (Boolean keywords across LinkedIn /
X / Reddit / YouTube), a **workflow** does precision filtering + enrichment, and
the result is **routed back as a signal column** on the matching account. See
[`verify_pattern.py`](./verify_pattern.py) for how a raw social hit gets
confirmed and written, and Stage 04 for signal-*led* discovery (going from a
signal to brand-new accounts you didn't have yet).

> Why route social signals into the *same* account table as the static ones? So
> Stage 05 scores them on one surface. A `signal_posted_about_pain=true` that
> lands on an account already carrying `signal_uses_<category>_tool=true` is a
> far hotter row than either alone — but only if they live side by side.

---

## The 5 detection methods

Every static signal uses one of these. Pick the cheapest method that produces
defensible evidence.

### Method 1 — Keyword scan (job posts + homepage)

Scan stored text (homepage copy, job-post descriptions) for a curated keyword
set. Produces a boolean + the matched snippet as evidence.

- **Strength:** cheap, transparent, the matched phrase *is* your proof.
- **Trap:** naive substring matching. `"no machine learning here"` matches
  `"machine learning"`. Mitigate with word-boundary matching and a
  `keywords_not` negative list. Keep keyword lists in the spec, versioned.

### Method 2 — DNS CNAME vendor probe

Resolve a subdomain (e.g. `email.<domain>`, `careers.<domain>`,
`<domain>` MX/CNAME) and map the CNAME target to a known vendor. If
`careers.acme.com` is a CNAME to a known ATS host, Acme uses that ATS — a
high-confidence tech-stack signal that needs no scraping. Pure-Python, stdlib
only. Script: [`cname_probe.py`](./cname_probe.py).

- **Strength:** near-zero false positives — DNS doesn't lie about who hosts a
  subdomain. No API cost.
- **Trap:** absence of a CNAME is **not** absence of the vendor (they may
  self-host or use a root-domain setup). Treat a miss as *unknown*, never as
  *negative*.

### Method 3 — Geo gate

Pass/fail on HQ country / region. Often not a standalone "buying" signal but a
**qualifier** that gates other signals (e.g. only count `signal_hiring_*` when
`signal_geo_us=true` because your motion only serves the US). Implemented as a
simple allow-set check in `write_signals.py`.

### Method 4 — Threshold (headcount / job-count / age)

Numeric gate: headcount in a band, ≥N open engineering roles, founded after
year Y. Produces a boolean **and** keeps the raw number as evidence so Stage 05
can scale on it.

- **Trap:** thresholds encode an assumption ("50–500 employees is our sweet
  spot"). Put the number in the spec and version it; don't bury it in code.

### Method 5 — TWO-SOURCE verification (the false-positive killer)

**This is the most important method and the reason your list will be trusted.**

A single source is a *proxy*. A proxy fires false positives — a job post that
mentions "Kubernetes" once in a benefits blurb is not evidence of a platform
team. So we **never mark a signal confident on one source.** We require a
**second, independent source** to confirm before flipping the column to a
confident `true`.

Pattern (see [`verify_pattern.py`](./verify_pattern.py)):

1. **Proxy fires** — cheap source suggests the signal (homepage keyword,
   Trigify post hit, a single job listing).
2. **Confirm** — query a second, independent source (Serper job search, a DNS
   probe, an enrichment call, a second platform on Trigify).
3. **Decide** — both agree → `confidence: confirmed`. Only one → `confidence:
   proxy` (kept, but weighted lower in Stage 05). Disagree → drop / flag.

The output is not a naked boolean — it's `{value, confidence, source_a,
source_b, evidence}`. Confidence is a *first-class column.* "We saw it twice,
here are both URLs" is what survives an AE's scrutiny and a prospect's
"how did you know that?".

---

## How the methods map to tools (all complementary — no overlap with Trigify)

| Method | Primary source | Tool / env key |
|---|---|---|
| Keyword scan | Stored homepage + job text | computed locally; refresh text via Firecrawl (`FIRECRAWL_API_KEY`) |
| DNS CNAME probe | Public DNS | stdlib (`cname_probe.py`); optional richer tech data via Blitz (`BLITZ_API_KEY`) |
| Geo gate | Stored firmographics | computed locally (Prospeo/AI Ark fields from Stage 00–01) |
| Threshold | Stored counts | computed locally; live job-count via Serper (`SERPER_API_KEY`) |
| Two-source verify | Any second source | Serper (`SERPER_API_KEY`), Firecrawl, DNS, or Trigify |
| **Social / live buying signals** | **Trigify (the signal layer)** | **`TRIGIFY_API_KEY`** |

Prospeo, Blitz, AI Ark, Parallel, Firecrawl, Serper, Apify, Supabase are
**enrichment / data / scrape** tools — they feed evidence into signals. Trigify
is the **listening layer** for live social/buying signals. They sit at different
layers and do not compete.

---

## Concrete walk-through (generic)

Say `<YOUR_PRODUCT>` is a developer-productivity tool. Your ICP (Stage 01) is
"mid-market software companies, US, 50–500 employees." That's *who* — now attach
*why now*:

1. **`signal_hiring_ai_eng`** (Method 1, keyword scan) — their stored job posts
   mention `["machine learning engineer","ML platform","LLM"]`. Proxy fires off
   one listing.
2. **Verify it** (Method 5) — `verify_pattern.py` runs a Serper job search
   `site:boards.greenhouse.io "acme" "machine learning"`. Second source agrees →
   `confidence: confirmed`. Now it's defensible.
3. **`signal_uses_<category>_tool`** (Method 2, CNAME) — `cname_probe.py`
   resolves `careers.acme.com` → a known ATS host. They run a real hiring
   pipeline. High confidence, zero API cost.
4. **`signal_geo_us`** (Method 3, geo gate) — HQ country is `US`. Gates the
   hiring signal so non-US noise doesn't score.
5. **`signal_scaling_team`** (Method 4, threshold) — `open_roles >= 5`. Keep the
   raw `5` as evidence.
6. **`signal_posted_about_pain`** (Trigify, social) — a director of engineering
   at Acme posted on LinkedIn about exactly the problem `<YOUR_PRODUCT>` solves.
   Trigify's keyword search caught it; a workflow enriched the person and
   confirmed they work at Acme; the event is routed onto Acme's row with the
   post URL as evidence.

Acme now carries 6 signal columns, each with evidence and a confidence. Run the
same recipe across the whole account table → 8–15 columns per account, every one
traceable to a source. That's the deliverable of this stage.

---

## Files in this stage

| File | What it does |
|---|---|
| [`signals.example.yaml`](./signals.example.yaml) | The signal-spec template — copy per signal, version it, keep it small |
| [`write_signals.py`](./write_signals.py) | Bulk-compute static signal columns (keyword / threshold / geo) over stored company rows → writes `signal_*` columns |
| [`cname_probe.py`](./cname_probe.py) | DNS CNAME lookup → vendor map (Method 2), pure stdlib |
| [`verify_pattern.py`](./verify_pattern.py) | The two-source verification pattern (Method 5) — proxy → confirm → write with confidence |

### Run order

```bash
cp .env.example .env          # at repo root; fill in YOUR keys
# 1. define your signals (edit / add specs)
$EDITOR 03-signal-mapping/signals.example.yaml
# 2. compute static signals over your stored rows
python3 03-signal-mapping/write_signals.py --in data/accounts.jsonl --specs 03-signal-mapping/signals.example.yaml --out data/accounts_signals.jsonl
# 3. add tech-stack signals from DNS
python3 03-signal-mapping/cname_probe.py --in data/accounts_signals.jsonl --out data/accounts_signals.jsonl
# 4. promote proxy signals to confirmed via a second source
python3 03-signal-mapping/verify_pattern.py --in data/accounts_signals.jsonl --signal signal_hiring_ai_eng --out data/accounts_signals.jsonl
```

(`data/` is gitignored — your run data never lands in this public template.)

---

## Anti-patterns (don't ship these)

- **One mega-signal.** Stack small signals at scoring time, not at detection time.
- **Boolean with no evidence.** Always store the matched snippet / URL / number.
- **One source = confident.** A proxy is a hypothesis. Confirm it (Method 5).
- **Treating a CNAME miss as a negative.** Miss = *unknown*.
- **Hardcoding keyword lists / thresholds in code.** They belong in versioned specs.
- **Letting a signal rot.** When a keyword list ages, bump the spec version and
  diff it. The definition is the asset.
- **Naming a competing signal/intent tool.** Trigify is the signal layer here.
```
