---
name: daily-tldr
description: A calm daily reading digest — highlights from tracked LinkedIn creators, r/coldemail, and subscribed newsletter emails (starting with the TLDR newsletter) — written in simple, 6th-grade-reading-level language, grouped by topic, posted to the "TLDR" Slack channel and archived as clean rows in the DailyReports tab. Use when the user says /daily-tldr, "give me today's TLDR", "run the daily digest", or similar. NOT the same thing as linkedin-health-check.mjs (that's an internal content-ops status report for COOKED's check-in, a different tool).
---

# daily-tldr skill

You are running the Daily TLDR — a personal-reading digest, not a status report. The reader
(Sophiya) wants to open Slack, read a few short items, and be caught up. Model the tone and
shape directly on the real TLDR newsletter she referenced: a bold linked headline, then 2-4
plain sentences, grouped under simple category headers. Not fancy. Easy to skim.

**Standing rule: write every summary at a 6th-grade reading level.** Short sentences. Common,
everyday words. If a smart 12-year-old would have to look up a word, use a simpler one. This
applies to every summary in every category — no exceptions, no jargon left unexplained.

## Sources (this build — MVP)

1. **LinkedIn creators + Reddit (r/coldemail)** — already flowing into the Intel tab, no new
   scraping needed.
2. **Newsletter emails** — starting with the real TLDR newsletter (`dan@tldrnewsletter.com`)
   only. More senders get added the same way once this is proven.

**Not in this build (v2, deferred — see the plan file):** X/Twitter, Substack. Don't try to pull
these; they need new infrastructure not built yet.

## Protocol

### Phase 1 — figure out the window
Read the most recent date in the `DailyReports` tab: `node scripts/read-tab.mjs --tab
"DailyReports" --range A1:A500` (dedupe, take the max date). If there's no prior date, default to
the last 24 hours. This is "since last time," never a fixed re-scan.

### Phase 2 — refresh + pull LinkedIn + Reddit
```bash
curl -s -X POST "${LINKEDIN_HQ_BASE_URL:-https://linkedin-hq.vercel.app}/api/intel/refresh"
node scripts/read-tab.mjs --tab "Intel" --range A1:N500
```
Filter to rows with `pulled_at` after the window from Phase 1, and either `starred=TRUE` or a
real signal (score ≥ 30 is a reasonable bar — adjust down if that's returning nothing on a quiet
day, don't force items that aren't there).

### Phase 3 — pull the newsletter
Use `mcp__claude_ai_Gmail__search_threads` with query `from:dan@tldrnewsletter.com after:{window
start date, YYYY/MM/DD}`. For each new thread/message not already reflected in a prior
`DailyReports` row (check by URL/subject — newsletters don't repeat, so this is mostly about not
double-processing the same day's email twice), pull the body with
`mcp__claude_ai_Gmail__get_message`.

### Phase 4 — synthesize (you do this yourself — never a script)
Read everything from Phases 2-3 together. Decide what's actually worth including — skip
anything thin or off-topic, don't force a quota. For each item you keep, write:
- `category` — a short, sensible group name (e.g. "Cold Email & Deliverability", "AI & Tools",
  "Tech News"). Group similar items together; don't invent a new category per item.
- `headline` — short, specific, in plain words.
- `summary` — 2-4 sentences, 6th-grade language (see the standing rule above), says what
  happened and why it might matter to Sophiya (cold email / AI agency operator).
- `source_type` — `linkedin` | `reddit` | `newsletter`
- `source_name` — the person / subreddit / newsletter name
- `url` — the real link. Never invent one.

Write this out as a JSON array matching that shape.

### Phase 5 — save to the Sheet
Write the JSON array to a temp file (scratchpad directory), then:
```bash
node scripts/save-daily-report.mjs --date <today, YYYY-MM-DD> --items-file <path>
```
Idempotent — safe to re-run for the same day.

### Phase 6 — post to Slack
The "TLDR" channel is set up and confirmed working (2026-07-08): it's private, the bot **Ava**
(`ava`, user `U0AM08T3GMT`) was manually added to it by Sophiya (private channels need a manual
add — Ava's bot scopes only cover auto-joining *public* channels), and its channel ID
(`C0BFW65FB1C`) is saved as `TLDR_SLACK_CHANNEL_ID` in `linkedin-hq/.env.local`.

`post-tldr-to-slack.mjs` needs `SLACK_BOT_TOKEN` in the environment — that secret lives in
**campaign-master's** Doppler config (`bleedai`/`prd`), not `linkedin-hq/.env.local` (single
source of truth, not duplicated):
```bash
SLACK_BOT_TOKEN=$(cd ../campaign-master && doppler secrets get SLACK_BOT_TOKEN --plain --project bleedai --config prd) \
  node scripts/post-tldr-to-slack.mjs --date <today> --items-file <path>
```
(Channel ID is picked up automatically from `.env.local`'s `TLDR_SLACK_CHANNEL_ID` — no
`--channel` flag needed unless posting somewhere else.)

If Sophiya ever recreates the channel or the ID changes, get the new one via: `TOKEN=$(doppler
secrets get SLACK_BOT_TOKEN --plain --project bleedai --config prd); curl -s
"https://slack.com/api/conversations.list?types=private_channel,public_channel&limit=200" -H
"Authorization: Bearer $TOKEN"` and find the `tldr` entry — Ava must already be a member to see
it (invite her first if she isn't).

### Phase 7 — confirm
Tell her how many items got posted, and show a one-line preview of each category so she doesn't
have to open Slack just to check it worked.

## Guardrails

- Never invent a stat, quote, or link. If something's thin, leave it out rather than pad it.
- Never post an empty digest — if Phase 4 produces zero real items, say so and skip Phase 6.
- This is a **manual command for now** (Sophiya's call, 2026-07-08) — you do not schedule this to
  run automatically. Only convert to a scheduled cloud routine once she's run this by hand
  several times and is happy with the output (see the plan file's "Approach" section).
