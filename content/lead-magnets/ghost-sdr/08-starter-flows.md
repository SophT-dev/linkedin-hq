# Bonus: 5 Starter Flows You Can Build This Weekend

**Everything in this kit comes together in small, buildable pieces. You do not need our stack, a big budget, or a team to start. Below are five mini-builds you can assemble with generic, publicly available tools over a single weekend. Each one is useful on its own, and together they are the skeleton of a self-running system. For every flow: what it is, why it works, how to build it, and a starter template to fill in.**

Pick one. Ship it. Then come back for the next.

---

### 1. The Signal Watcher

**What it is.** A small automation that watches public event sources for your trigger and, when it fires, drafts an opener that *references* the signal. Sources include launch directories, job boards, funding filings, company news, and public social engagement (likes, comments, reshares on relevant posts).

**Why it works.** Fresh signals live in event-native sources, and they decay fast. In our testing, the signals worth chasing are under about 90 days old *(directional: verify for your setup)*, and the freshest live where the event actually happened, not in a stale database. A first line that *references* a real, recent event is worth far more than a generic one, because it proves you are a human who noticed something, not a list that bought an address.

**How to build it.**
1. Pick ONE trigger you can act on (a new funding round, a specific new hire, a product launch, a public post on a topic you solve).
2. Point a scheduled job (a no-code automation tool, a cron script, or an RSS/alert feed) at the public source that publishes that event.
3. On each new match, pass the event details to a mid-tier model with a prompt that writes a one-line opener referencing the signal.
4. Drop the draft into a review queue. You approve before anything sends.

```
SIGNAL WATCHER: SETUP

Trigger signal:        ________________________________
Public source(s):      ________________________________
Freshness cutoff:      _______ days (drop anything older)
Check frequency:       ________________________________

OPENER PROMPT (fill the blanks):
"This lead just [SIGNAL: __________]. Write ONE opening line
that references it naturally, in plain spoken English, no
buzzwords, under 20 words. Do not pitch. Just show you noticed."
```

---

### 2. The Data-Minimum Gate

**What it is.** A pre-enrichment step that dedupes and ICP-gates your raw list *before* you spend on the first paid data column.

**Why it works.** Most people enrich first and filter later, which means they pay to enrich people they were never going to email. Flip the order. Filtering before you pay cuts credit burn by roughly 50 to 70 percent *(directional: verify for your setup)* and stops you wasting money on out-of-ICP rows. Every paid column you buy should only touch a row that already passed your basic checks.

**How to build it.**
1. Load the raw list into a sheet or a no-code table.
2. Dedupe on email and on domain, so one company does not slip through five times.
3. Apply your hard ICP filters with free logic: geography, obvious industry mismatch, role/title keywords, company-size proxy.
4. Only the survivors move to the paid enrichment step. Log how many rows you dropped so you can see the savings.

```
DATA-MINIMUM GATE: CHECKLIST

Dedupe key(s):         email  /  domain  /  ____________
Hard EXCLUDE rules (free, before paid enrichment):
  - Region not in:     ________________________________
  - Title NOT matching: _______________________________
  - Industry excluded:  _______________________________
  - Company-size proxy: _______________________________
Rows in: ______   Rows passed gate: ______   Dropped: ______%
```

---

### 3. The Saturation Register

**What it is.** Your own living, date-stamped list of phrases that now read as templated, re-checked every month.

**Why it works.** AI models default to phrasing that scored well 12 to 24 months ago, because that is what their training data rewarded. But the inbox moves faster than the training data. A line that felt fresh last year ("I came across your profile...", "I'll keep this short...") is now an instant spam-flag to a buyer who has seen it 500 times. The data shows the industry saturates a good line quickly, so you need a written record of what has gone stale, or your AI will keep reaching for it.

**How to build it.**
1. Start a simple dated document or sheet.
2. Every time you spot a line that everyone is now using (in your own inbox, in communities, in the openers you receive), add it with the date.
3. Feed this list into your generation prompt as a "banned phrases" block.
4. Re-read the list monthly and prune or add. Saturation is a moving target.

```
SATURATION REGISTER

Date added | Banned phrase / pattern        | Why it's dead
-----------|--------------------------------|------------------
           |                                |
           |                                |
           |                                |

(Paste the "banned phrase" column into every generation prompt:
"Never use any of these phrasings: __________________________")
```

---

### 4. The Reply-Rate Truth Dashboard

**What it is.** A tiny tracker of only two numbers per campaign: reply rate and bounce rate.

**Why it works.** Open rate is dead. Privacy features like Apple Mail Privacy Protection auto-open messages, so your "opens" are inflated and meaningless. Sending-platform placement and warmup scores also lie; they are estimates, not truth. Reply rate and bounce rate are the only two signals that reflect what actually happened: did a real inbox accept your mail (low bounce), and did a real human care enough to write back (reply). Track those two and ignore the vanity metrics.

**How to build it.**
1. One row per campaign in a sheet.
2. Log only: emails sent, replies, bounces. Compute reply rate and bounce rate.
3. Set a bounce ceiling. If bounce climbs past your line, pause and fix deliverability before anything else.
4. Compare campaigns on reply rate only. That is your one score for copy and targeting.

```
REPLY-RATE TRUTH DASHBOARD

Campaign | Sent | Replies | Reply % | Bounces | Bounce % | Verdict
---------|------|---------|---------|---------|----------|--------
         |      |         |         |         |          |
Bounce ceiling: ______%  (over this = STOP, fix deliverability)
Reply floor to scale: ______%
```

---

### 5. The Voice-Match Second Pass

**What it is.** A light editing step that takes AI-written lines and fixes only the sentences a human would never say out loud.

**Why it works.** AI personalization beats no personalization, but raw AI output has a tell: the em dashes, the buzzwords, the tidy four-sentence robotic shape. In our testing, a 10-second human-sounding pass is what separates a reply from a delete. You are not rewriting. You are removing the three or four giveaways that scream "a machine wrote this."

**How to build it.**
1. Take the AI draft.
2. Run a short second-pass prompt (or your own eyes) that strips only the robotic tells.
3. Read the line out loud. If you would never say it to a person, cut it.
4. Keep it short. Over-editing rebuilds the robot; the goal is a light touch.

```
VOICE-MATCH SECOND PASS: PROMPT

"Rewrite this so it sounds like a real person typed it fast.
Rules:
 - Remove every em dash. Use a period or a comma.
 - Kill buzzwords: ______, ______, ______ (your banned list).
 - Break the 4-sentence robotic shape. Vary length.
 - Keep the meaning. Do NOT add new claims.
 - If a line would sound weird said out loud, cut it.
Draft: ____________________________________________"
```

> 💡 Build these in order and you will feel the system click together: the Watcher finds a reason to reach out, the Gate keeps your spend honest, the Register keeps you fresh, the Dashboard tells you the truth, and the Second Pass makes it sound human. None of it requires a fancy stack. It requires shipping one flow this weekend.
