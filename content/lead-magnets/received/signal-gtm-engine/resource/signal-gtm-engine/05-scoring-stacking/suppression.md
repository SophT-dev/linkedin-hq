# Suppression — rules & maintenance

Suppression is the **safety rail** on the work queue. It guarantees that certain accounts never get handed to outreach (Stage 06) no matter how high their intent score climbs. Scoring is about *who's hot*; suppression is about *who's off-limits*. They are independent — a closed-won account can have a screaming-hot intent score and still must be suppressed.

> **Mental model:** score everything, then subtract the untouchables. Suppression runs *after* scoring (so the score is preserved for analytics) and *before* anything reaches outreach (so the untouchables can't leak through).

---

## The suppression categories

| Category | Why it's suppressed | Owner / where it comes from |
|---|---|---|
| **Closed-won** | Already bought. Re-pitching a buyer as if they're net-new is embarrassing and damages trust. | CRM "Closed Won" stage |
| **Existing customer** | Active account owned by CS / AM, not new-business outreach. Outbound here steps on the relationship. | CRM customer/account object, billing system |
| **Competitor** | Never pitch a competitor. Also avoids leaking your positioning into their hands. | Manual competitor blocklist (curated) |
| **Already-in-sequence** | Being actively worked right now. Double-sequencing burns the lead, confuses the prospect, and tanks sender reputation. | Outreach platform (Smartlead / HeyReach / Instantly) — active-sequence membership |
| **Do-not-contact (DNC) / opt-out** | Legal (GDPR/CAN-SPAM unsubscribes), explicit "do not contact" requests, manual exclusions. | Suppression list / unsubscribe table |

The first four are the non-negotiable spec categories. DNC is an optional fifth that almost every real motion needs.

---

## How suppression is applied

Each account gets two output fields:

- `suppressed` — boolean.
- `suppression_reason` — the **first** matching category (priority order below), or empty.

Priority order (most-binding first), so the reason is the most important one when several apply:

```
1. dnc            (legal / opt-out always wins)
2. closed_won
3. customer
4. competitor
5. in_sequence
```

A suppressed account **keeps** its `intent_score` and `intent_tier` for reporting, but is **excluded from the work queue**:

```
work_queue = (fit_tier in A,B) AND (intent_tier in A,B) AND (suppressed == False)
```

Why keep the score on a suppressed row? Because suppression categories are also *signal*. If your closed-won accounts are lighting up with intent, that's an **expansion / upsell** play for CS — different team, real money, surfaced only because you scored before you suppressed.

---

## Where the lists live

Suppression is driven by an **account-status feed** keyed by `account_id`. Each account resolves to at most one status from the union of these sources:

| Source | Provides | How it's pulled |
|---|---|---|
| CRM (e.g. via an export or API) | `closed_won`, `customer` | Stage 02 system-of-record sync, or a periodic CRM export → status table |
| Outreach platform | `in_sequence` | Active-sequence membership from Smartlead / HeyReach / Instantly (per-platform API) |
| Curated competitor list | `competitor` | Hand-maintained list of competitor domains (see below) |
| DNC / unsubscribe table | `dnc` | Unsubscribe webhooks + manual additions |

The script reads this as a single normalized feed: `account_id, status`. **You own the join** that produces it — `# TODO: customize` markers in `score_stack.py` show where to wire your CRM / outreach-platform pulls.

---

## Matching: how an account is identified

Accounts must be matched **consistently** across signal data and suppression sources or suppression leaks. Recommended key precedence:

1. **`account_id`** — your internal canonical id (best; assign one in Stage 02).
2. **Normalized root domain** — `example.com` (strip `www.`, scheme, path; lowercase). Good fallback when ids aren't shared across systems.
3. Company name — **last resort only**; fuzzy and error-prone. Never use name alone for the competitor or DNC list.

> **Normalize domains the same way everywhere.** A common leak: the CRM stores `www.Example.com/`, the signal feed stores `example.com`. They don't match, the suppression misses, and a closed-won account gets emailed. Pick one normalization and apply it in *every* source.

---

## Maintaining the lists

Suppression rots if you don't maintain it. Keep these fresh:

- **Closed-won / customer** — re-sync from CRM on every scoring run (these change constantly). Stale customer lists are the #1 cause of "we cold-emailed our own customer."
- **In-sequence** — re-pull from the outreach platform on every run; sequence membership changes daily. An account that finished a sequence and went cold can legitimately re-enter later (so don't permanently blocklist on `in_sequence` — it's a *live* status, recomputed each run).
- **Competitor list** — review monthly. Add new competitors as the market shifts; this one is manual and worth the discipline. Keep it as a simple newline list of normalized domains, version-controlled *outside this public template* (it's client data — never commit the actual list here).
- **DNC / opt-out** — append-only and **permanent**. Once someone opts out they stay out. Wire unsubscribe webhooks straight into this table; never let it be overwritten by a fresh CRM export.

### Idempotency & safety

- Suppression must be **idempotent** — re-running the scorer must produce the same suppression result for unchanged inputs. The script recomputes `suppressed` from the status feed every run; it never relies on a previous run's flag.
- Suppression is **fail-closed by default for permanent categories**: if the status feed can't be loaded, the script aborts rather than silently emitting an empty suppression set (which would dump customers and opt-outs into the queue). This behavior is controlled by `--require-status` (on by default when `--from-supabase`).
- **`in_sequence` is fail-recompute, not fail-closed** — it's a live, transient status, so a stale value is corrected on the next run.

---

## Example status feed (shape only — no real data)

`examples/account_status.example.csv`:

```csv
account_id,status
acct_0001,closed_won
acct_0002,customer
acct_0003,competitor
acct_0004,in_sequence
acct_0005,dnc
```

Any account not present in the feed is treated as **not suppressed** (status = open). That's the safe default *for the transient categories* but the dangerous one for permanent categories — which is exactly why permanent-category sources (CRM closed-won/customer, DNC) must be loaded successfully or the run aborts. See `--require-status`.

---

## Checklist before you trust the queue

- [ ] Customer + closed-won re-synced from CRM **this run**.
- [ ] In-sequence membership re-pulled from the outreach platform **this run**.
- [ ] Competitor domains reviewed within the last 30 days.
- [ ] DNC table is append-only and wired to unsubscribe events.
- [ ] Domain normalization identical across CRM, signal feed, and suppression sources.
- [ ] `--require-status` on for any run that feeds Stage 06.
- [ ] Spot-check: pick 5 known customers — confirm all 5 come out `suppressed=true`.
