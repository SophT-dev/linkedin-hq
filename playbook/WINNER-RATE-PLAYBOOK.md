# Winner-Rate Playbook — how to make more of Taha's posts hit "winner"

> How we lift the share of Taha's LinkedIn posts that hit **winner** status.
> Built 2026-07-11 from real data (Posts tab + the 11 tracked experts' corpus). Re-run the
> scripts below and update this doc when we have more tracked posts.

---

## 1. How "winner" is defined (the scoring rule)

From `linkedin-hq/scripts/sync-post-stats.mjs`:

```js
function workedVerdict({ likes, comments }) {
  const score = (likes || 0) + (comments || 0) * 3;
  if (score >= 80) return "winner";
  if (score <= 15) return "flop";
  return "neutral";
}
```

**Comments are worth 3× likes.** A post with 20 likes + 20 comments scores 80 (winner);
a post with 80 likes + 0 comments also scores 80. Comment-driving beats like-farming, every time.

---

## 2. The baseline (as of 2026-07-11)

Only **one** post is tracked with real stats — the TAM post:

| metric | value |
|---|---|
| likes | 8 |
| comments | 5 |
| views | 157 |
| **score** | 8 + 5×3 = **23** |
| verdict | neutral (winner bar = 80) |

**There is no meaningful "winner rate" yet — it's 0-of-1.** Step zero is post volume +
turning on stats tracking so the rate becomes measurable.

---

## 3. The diagnosis: this is a REACH problem, not a content problem

The TAM post got **5 comments on 8 likes = 0.6 comment-to-like ratio.** For comparison:
- josh-braun's 4,442-like viral post ran ~0.05 c/l
- kenny-damian's build-in-public posts ~1.7 c/l

Taha's *engagement rate is already strong.* What's tiny is the **reach: 157 views.**
Because comments count triple, the math is friendly: at his current ratio, **~600 views
(4× his reach) would clear 80 and make it a winner.** The whole game is getting more
eyeballs on posts he's already good at.

---

## 4. Posting cadence — the real numbers (11 tracked experts, last 6 months)

Run: `node linkedin-hq/scripts/analyze-posting-cadence.mjs`

| expert | posts/week | top days | top content types |
|---|---|---|---|
| josh-braun | 41.7 ⚠️ outlier (reposts/comments leaking in — ignore) | Thu, Tue, Wed | contrarian, personal, story |
| nick-abraham | 6.6 | Wed, Tue, Thu | contrarian, personal, framework |
| richard-illingworth | 6.0 | Wed, Fri, Mon | contrarian, announcement, personal |
| atishay-hyperke | 5.1 | Wed, Mon, Tue | contrarian, case-study, announcement |
| aidan-collins | 4.5 | Tue, Wed, Mon | contrarian, announcement, listicle |
| outboundphd | 4.1 | Tue, Mon, Wed | teardown, contrarian, announcement |
| charles-tenot | 3.4 | Wed, Fri, Mon | contrarian, announcement, personal |
| michel-lieben | 3.3 | Tue, Wed, Thu | announcement, listicle, case-study |
| kenny-damian | 2.2 | Mon, Thu, Tue | announcement, framework, teardown |
| nikita-maildoso | 2.2 | Thu, Fri, Mon | contrarian, engagement-bait, personal |
| sacha-martinot | 1.8 | Thu, Tue, Wed | announcement, teardown, personal |

**Reading it:**
- Serious players cluster at **3–6 posts/week**. The comment-magnet winners (michel, kenny)
  sit *lower* (2.2–3.3) → **consistency drives winners, not raw volume.**
- **Tue / Wed / Thu** are the top-3 days for almost every expert (Mon a close 4th).
  Weekends are dead across the board.
- **contrarian-take is the #1 content type for 7 of 11 experts** — the workhorse format.

---

## 5. The plan (ranked by leverage)

**1. Fix distribution — the actual bottleneck.**
- Win the **first 60–90 minutes**: line up 5–8 real comments in the first hour (Connects tab +
  manual comment system) and **reply to every comment** (each reply = another comment + algo ping).
- **Comment on the 11 tracked experts daily** to borrow their ICP audience (`capture-connects` tooling).
- **Consistency: 3 posts/week to start, ramp to 4–5.** Post **Tue / Wed / Thu only.**

**2. Milk the comment mechanic (comments = 3×).**
Every post ends with "comment KEYWORD → I'll send it" (the lead-magnet CTA). This is the correct
engine — it's why michel/kenny score thousands of comments. Keep the pinned meme comment.

**3. Content bets grounded in what wins.**
Default frame = **contrarian-take (F8)**; rotate in **personal story (F6)** and **case-study**.
Put Taha's real client wins into F1 (Big Number) / F8 shapes.

**4. Turn on measurement.**
Run `/linkedin-post` consistently + activate `sync-post-stats` (needs Apify key + Sophiya's
sign-off) so every post gets a verdict and the winner rate becomes real. Two weeks of that →
we can name the exact hooks/formats that win *for Taha specifically*.

**One-liner:** his content is fine, his reach is starving it. Post 3×/week Tue–Thu, engineer
the first-hour comments, keep the comment-to-DM magnet on every post — the 3× weighting does the rest.

---

## 6. Scripts that feed this doc

- `scripts/analyze-posting-cadence.mjs` — cadence table above (reads the local expert corpus).
- `scripts/sync-post-stats.mjs` — the scoring rule + pulls live stats into the Posts tab.
- The `/lead-magnets` app page + LeadMagnets Sheet tab — our published magnets (the comment-CTA payloads).
