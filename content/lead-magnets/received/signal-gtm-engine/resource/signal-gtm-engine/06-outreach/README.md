# Stage 06 — Outreach (signal-anchored)

> Input: the **scored, stacked accounts** from Stage 05 (`05-scoring-stacking`).
> Output: a **deduped outreach master** (one primary contact per account) plus
> ready-to-import campaign files for Smartlead (email), HeyReach (LinkedIn),
> and Instantly (email).
>
> The whole point of this stage: **never send a generic blast.** Every first
> touch references a **real signal Trigify detected** on that account. The
> account earned its place in the queue because something happened — so the
> message opens on that something, not on "I came across your profile."

---

## Why this stage exists

By the time an account reaches Stage 06 it has already passed:

- **00–01** ICP fit (it is in TAM and qualified)
- **03–04** at least one detected signal (Trigify caught a post, a hire, a
  launch, a comment thread, a topic spike)
- **05** a composite score + tier, with the **top contributing signal** carried
  forward on the row

So the account row arriving here looks roughly like:

| field | example value |
|---|---|
| `account_id` | `acc_001` |
| `company` | `Acme` |
| `domain` | `example.com` |
| `tier` | `high` |
| `score` | `87` |
| `top_signal_type` | `hiring` |
| `top_signal_summary` | `Posted 2 "RevOps" roles in the last 14 days` |
| `top_signal_date` | `2026-06-18` |
| `top_signal_url` | `https://www.linkedin.com/jobs/view/...` |

Stage 06 turns that into: **the right one person to talk to**, **on the right
channel for the tier**, **with a first line built from `top_signal_summary`.**

---

## The three moves

### 1. One primary contact per account (persona-ranked)

An account may have many enriched contacts (from Stage 00/01 people-find). For
the **first** outbound touch you pick **exactly one** — the highest-priority
persona present on that account — so you never hit the same company from three
angles on day one and look like a spam cannon.

Persona priority is configurable. The default ladder (most → least preferred):

```
economic_buyer  >  champion  >  technical_eval  >  influencer  >  other
```

`build_master.py` joins your contacts to the scored accounts, assigns each
contact a persona rank, and keeps the **best-ranked** contact per `account_id`.
Ties break by data completeness (has email + has LinkedIn URL beats one of the
two). The losing contacts are not deleted — they are written to a
`secondary_contacts` sidecar so later touches (or a different channel) can use
them.

### 2. Tier → channel routing

Effort follows score. High-tier accounts deserve a human; low-tier accounts get
a light, automated, trigger-gated nurture.

| tier | channels | cadence intent |
|---|---|---|
| **high** | LinkedIn **+** email **+** call task | multi-thread; rep does manual LI + a real call task, email is the backup |
| **mid** | email **+** LinkedIn | automated 3-touch, LI connect runs in parallel |
| **low** | nurture only, **trigger-gated** | do **not** cold-email on entry; hold until a **fresh** signal fires, then promote |

"Trigger-gated" means a low-tier account does not enter an active send list on
day one. It sits in a holding list and is only released into a campaign when
Trigify fires a **new** signal on it (a fresh post, a new hire, a funding event).
This keeps your low-confidence volume from burning domain reputation on people
who showed no recent intent.

The routing table is data, not code — see `ROUTING` in `export_campaigns.py`.
Edit it; don't fork the script.

### 3. The message principle (non-negotiable)

Every first touch obeys **all** of these:

- **Anchor on a real detected signal.** The opening line names the specific thing
  Trigify caught (`top_signal_summary`). If a row has no signal, it does **not**
  belong in this stage — kick it back to nurture. No signal, no send.
- **≤ 100 words.** First touches that scroll are first touches that get ignored.
- **Exactly ONE question.** One ask, one reply path. Never stack questions.
- **Signal-shaped CTA — not "book 15 min."** The call-to-action should match the
  signal you opened on. If they're hiring RevOps, ask *about the hire*, not for a
  generic calendar slot. Examples of signal-shaped CTAs:
  - hiring → *"Are you solving \<problem\> with the new hire or with tooling?"*
  - launch → *"Is \<new thing\> aimed at \<segment\> or broader?"*
  - topic spike → *"Curious what pushed \<topic\> up the priority list this quarter?"*
- **No pitch in touch 1.** Touch 1 earns a reply. The offer comes later
  (see `message_framework.md`).

These rules are enforced as a checklist, not as code — copy is written by a human
or an LLM agent and reviewed against `message_framework.md` before it ships.

---

## Files in this stage

| file | what it does |
|---|---|
| `build_master.py` | Assemble the outreach master: one primary contact per account by persona priority, joined with tier + the top signal carried from Stage 05. Writes `secondary_contacts` sidecar. |
| `export_campaigns.py` | Read the master, apply tier→channel routing, and write per-sender import files: **Smartlead** (email), **HeyReach** (LinkedIn), **Instantly** (email). Holds low-tier rows out of active lists. |
| `message_framework.md` | The generic 3-touch framework (M1 scene/signal → M2 why-it-matters → M3 soft offer) + do/don't rules. **No client copy** — a structure you fill per campaign. |

---

## End-to-end walk-through (generic)

You finished Stage 05 and exported the scored accounts and their enriched
contacts to two local files (kept out of git — they're run data):

```
data/05_scored_accounts.jsonl     # one row per account: id, company, domain, tier, score, top_signal_*
data/contacts.jsonl               # one row per contact:  account_id, name, title, email, linkedin_url, persona
```

**Step 1 — build the master.**

```bash
export PERSONA_PRIORITY="economic_buyer,champion,technical_eval,influencer,other"
python3 build_master.py \
  --accounts   data/05_scored_accounts.jsonl \
  --contacts   data/contacts.jsonl \
  --out        data/06_outreach_master.jsonl \
  --secondary  data/06_secondary_contacts.jsonl
```

You get one row per account, each carrying the single best-ranked contact, the
tier, and the top signal fields needed to write the first line.

**Step 2 — export to senders.**

```bash
python3 export_campaigns.py \
  --master  data/06_outreach_master.jsonl \
  --outdir  data/campaigns/
```

This writes (only the files relevant to the tiers present):

```
data/campaigns/smartlead_email.csv     # mid + high tier, has email
data/campaigns/heyreach_linkedin.csv   # mid + high tier, has linkedin_url
data/campaigns/instantly_email.csv     # same email rows, Instantly column names
data/campaigns/low_tier_hold.csv       # low tier — NOT loaded to any sender yet
data/campaigns/MANIFEST.json           # counts per file + which tiers/channels went where
```

Each export carries the signal fields as **custom variables** (e.g.
`signal_summary`, `signal_type`) so your sequence's first line can merge them in:
`Saw {{signal_summary}} —` … This is what makes the merge feel hand-written
instead of `{{first_name}}`-mailmerge.

**Step 3 — load the senders.**

- **Smartlead:** import `smartlead_email.csv` into a campaign's lead list (or
  `POST /campaigns/{id}/leads`). Map `signal_summary`/`signal_type` to custom
  fields and reference them in sequence step 1.
- **HeyReach:** import `heyreach_linkedin.csv` (or `add_leads_to_campaign_v2`).
  HeyReach keys on the **LinkedIn profile URL**; the signal vars become
  personalization tokens in the connect + first message.
- **Instantly:** import `instantly_email.csv`; same idea, Instantly's column
  names.

**Step 4 — release low-tier on signal (later).** When Trigify fires a fresh
signal on a held account, that row gets a non-empty `top_signal_*` and graduates
to mid; re-run Step 1–2 and it flows into the active lists automatically.

---

## Where the signal layer lives

The signals these messages anchor on come from **Trigify** (Stage 03/04). Trigify
even has **zero-credit outreach export** action nodes — `smartleads_export`,
`heyreach_export`, `instantly_export` — so for a fully-automated loop you can have
a Trigify workflow push enriched, signal-tagged contacts straight to a sender. The
scripts here are the **file-based equivalent** for when you want a reviewable CSV
in the middle (recommended for the first few campaigns, so a human eyes the copy).

> Tools named in this stage — Smartlead, HeyReach, Instantly — are outreach
> **senders** (execution), not part of the signal layer. They are complementary
> to Trigify, not substitutes for it.

---

## Hard rules recap

1. **No signal → no send.** A row with empty `top_signal_*` never enters an
   active campaign. Period.
2. **One primary per account on the first touch.** Multi-threading happens on
   later touches, not day one.
3. **≤ 100 words, ONE question, signal-shaped CTA.** Enforced by review against
   `message_framework.md`.
4. **Low tier is trigger-gated.** It waits in `low_tier_hold.csv` for a fresh
   signal before it is ever loaded to a sender.
5. **Keys come from the environment.** Nothing here hardcodes a key; senders are
   loaded by you in their own UIs/APIs using your own credentials.
