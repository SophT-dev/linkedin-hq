# Winner-Rate Playbook — making Taha a cold-email celebrity, fast

> How we lift the share of Taha's LinkedIn posts that hit **winner** — and, bigger picture,
> how we make him a recognised cold-email authority as fast as humanly possible.
> Built 2026-07-11 from real data: the Posts tab + a **deep mine of Taha's scraped corpus of
> 11 top creators (6,642 tagged posts)** at `campaign-master/knowledge-base/learning-center`.
> Re-run the scripts in §8 to refresh the numbers.

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

**Comments are worth 3× likes.** 20 likes + 20 comments = 80 (winner). Comment-driving beats
like-farming, every time. The whole content strategy below is bent toward *comments*.

---

## 2. The baseline (as of 2026-07-11)

Only **one** post is tracked with real stats — the TAM post: 8 likes, 5 comments, 157 views →
**score 23, neutral** (winner bar = 80). There is no meaningful "winner rate" yet — it's 0-of-1.
Step zero is post volume + stats tracking so the rate becomes measurable.

**Diagnosis: this is a REACH problem, not a content problem.** The TAM post's 5 comments on 8
likes = 0.6 comment-to-like ratio — *stronger* than josh-braun's 4,442-like viral posts (~0.05).
Taha's engagement rate is already good; what's tiny is reach (157 views). At his current ratio,
~600 views (4× reach) clears 80. **The game is distribution, not writing harder.**

---

## 3. Deep research — what 11 top creators actually did to get where they are

Mined from 6,642 tagged posts (likes, content-type, tools, and extracted "intuition" per post).

### 3a. Who wins, and the surprising format truth

| creator | posts | median likes | max | what they're known for |
|---|---|---|---|---|
| **michel-lieben** (ColdIQ, $7M ARR, 65K followers) | 332 | **273** | 2,794 | tech-stack listicles, funnel teardowns, LinkedIn-growth how-tos |
| charles-tenot (Smartbound/lemlist) | 270 | 130 | 1,325 | contrarian sales/leadership takes, prospecting teardowns |
| outboundphd | 349 | 84 | 342 | Clay/Claude-Code tactical teardowns |
| kenny-damian (Head of GTM, ColdIQ) | 125 | 78 | 1,267 | "I built X with Claude Code / n8n" build-in-public |
| **josh-braun** (Sales guru) | 3,500 | 56 | **4,442** | emotional personal stories + sales contrarian takes |
| nick-abraham (Leadbird) | 544 | 53 | 1,257 | agency-scale stories, free lead-magnet doc drops |

**The format finding that corrects our earlier advice.** By *median likes across the whole corpus*:

| content-type | median likes | # posts | verdict |
|---|---|---|---|
| announcement | **78** | 587 | launches, "we hit $X", new build — WINS |
| case-study | **76** | 289 | client results with numbers — WINS |
| story | 60 | 1,320 | narrative, personal — strong |
| tactic | 60 | 250 | one concrete how-to — strong |
| teardown | 58 | 788 | dissect a funnel/email/system — strong |
| listicle | 56 | 702 | strong when it's a stack/checklist |
| personal | 55 | 2,273 | strong |
| framework | 47 | 816 | mid |
| **contrarian-take** | **43** | **3,131** | **most-used, lowest median — overused hot-take tax** |
| engagement-bait | 37 | 747 | low on its own |

> **Contrarian-take is the single most-posted format (3,131 posts) but the lowest median.**
> Everyone reaches for the hot take, so it's commoditised. **Announcements (build/launch/milestone)
> and case-studies (client results) are what actually pull.** Same holds *within* LinkedIn-growth
> posts specifically: tactic (61) and announcement (61) and teardown (58) beat contrarian (32).

### 3b. Michel Lieben's growth mechanics (the corpus's clearest teacher)

He grew ColdIQ to $7M ARR / 65K followers and 20M+ impressions in a year, and he *documents the
exact levers* repeatedly. These are direct, high-signal, and copy-pasteable:

**Content craft**
- **Reverse-engineer winning formats.** He uses Taplio's inspiration feed to find viral formats in
  the niche, then reverse-engineers the *hook + structure + CTA* and replays the winning format over
  and over. → **We don't need Taplio: we already have the 6,642-post corpus + `FORMAT-LIBRARY.md`
  built from it.** That's the exact capability, free.
- **Visuals multiply reach 3–10×.** "A great visual on a text-only post can 5× reach." "Posts with
  nice designs get pushed to 3–5× more people." **Spend more time on the visual than the copy.**
- **Hit the character limit.** His best posts for *both* reach and conversion max out the character
  count — depth wins over one-liners.
- **Repurpose winners = restructure, not copy-paste.** Every couple months, take the best posts and
  rewrite them slightly better. Winners get re-run.
- **Video + motion for dwell time.** AI-edited short videos got him 50K+ views; sped-up soundless
  <30s screen recordings raise dwell time → reach.

**The algorithm game (engagement ritual)**
- **LinkedIn pushes you more when you actively comment on others' posts.**
- **The 30/30 rule:** spend ~30 min engaging with other creators *before* you post, then **reply to
  every comment in the first 30 minutes** after posting.
- Dwell time is a ranking input — visuals and depth buy dwell.

**Distribution as a system**
- **Sync 3 channels:** Outbound + LinkedIn Content + LinkedIn Ads. Adding the content engine
  "got us much better cold-email results without changing the emails — just from social proof."
  Prospects started saying *"we see you guys everywhere."*
- **The content→pipeline loop that ties LinkedIn to revenue:** team/influencer posts → scrape the
  post's *engagers* → push to a Clay table via n8n → tier/segment/dedupe with LLMs → multichannel
  outreach. This booked ColdIQ **138 meetings in one month** and **1,127 meetings** over a run.
  **This is the move that makes LinkedIn a lead engine, not vanity** — and Bleed AI already runs
  Clay + n8n + the campaign-master stack.
- **Employee-led branding beats founder-only.** ColdIQ turned 24 employees into LinkedIn influencers
  with prizes + training + making posting effortless → **+$153K MRR in <90 days.**

**Consistency philosophy**
- "It was putting in the reps every single day. Getting 1% better. Not letting myself give up."
  A failed 0-lead posting streak became clients + ARR purely through consistency.

### 3c. Josh Braun's counter-model (the other proven path)

The biggest virals in the *entire* corpus are his (4,442 / 3,608 / 3,213 likes) and they are
**emotional personal stories** (a father-son Porsche memory, a child ordering at a restaurant,
burnout, empathy) — *not* tactical cold-email posts.

- **Stop chasing the algorithm.** "Write about what lights you up. Say it the best way you know how.
  Don't care about likes or reach." Authenticity is his entire engine.
- **The offer beats the copy.** "Most cold emails get ignored because of the *offer*, not the writing
  or personalization. What if you changed the offer?"
- **Show the tiny version.** "Stop describing the thing. Show the thing" — the "tiny sandwich" version
  a prospect can see, not a description of your service.

### 3d. The current wave: "I built my GTM with Claude Code" (2026)

`claude code` (168 mentions) + `claude` (114) + `claygent` (119) are now among the most-mentioned
tools in the corpus, behind only Clay/lemlist/instantly. kenny-damian, sacha-martinot, outboundphd
and michel are all riding it *right now*:
- kenny's Claude Code cheat-sheet: 1,033 likes. His "6 n8n AI agents" build: 1,267 likes.
- **sacha built a LinkedIn Content Hub with Claude Code, posted twice, and got 1,000 followers in
  5 days.** outboundphd open-sourced a Claude-Code cold-email repo; "doubled response rates in one week."

> **This is Taha's single biggest unfair advantage.** He is *literally building a GTM brain in
> Claude Code right now* (this whole Second Brain OS). The niche is starving for exactly this content,
> and Taha has the real thing to show — not a demo. Build-in-public the actual system = ride the
> highest-momentum vein in the niche with proof nobody else has.

### 3e. The lead-magnet mechanic (proven)

nick-abraham's repeatable growth loop: give away a genuinely useful doc/tool, "**Comment EMAIL and
I'll DM you the link (must be connected)**." The "must be connected" clause grows his network on every
post. This is exactly our comment-to-DM engine — keep it on every post.

### 3f. Three outreach stat-nuggets worth their own posts (Michel, from 100K+ conversations)

- Messages **under 150 characters got 22% more replies**.
- Sequences with **2+ follow-ups got 42% more replies** than single-shot.
- Connection requests sent right after a profile-view / like / follow → **+30.2% acceptance**.

(These are lead-magnet-grade facts — turn each into a post/carousel with a comment-CTA.)

---

## 4. Posting cadence — the real numbers (11 experts, last 6 months)

Run: `node linkedin-hq/scripts/analyze-posting-cadence.mjs`

- Serious players cluster at **3–6 posts/week**; the comment-magnet winners (michel 3.3, kenny 2.2)
  sit *lower* → **consistency drives winners, not raw volume.** (josh's 41.7/wk is an outlier —
  reposts/comments leaking in; ignore it.)
- **Tue / Wed / Thu** are the top-3 days for almost every expert (Mon a close 4th). Weekends dead.

---

## 5. The revamped strategy — Taha → cold-email celebrity, as fast as possible

> 📍 **Superseded by the canonical strategy in [STRATEGY.md](STRATEGY.md)** (decided pillars + contrarian
> bank + SMPV positioning) and [JULY-2026-STRATEGY.md](JULY-2026-STRATEGY.md) (this month's execution).
> This section is kept for the corpus-diagnosis reasoning; the pillar decisions above now live in STRATEGY.md.

The bottleneck is reach + reps, and the two proven models are **Michel** (systematic, build-in-public,
visual, comment-driven) and **Josh** (authentic story). Taha's fastest path fuses them, anchored to
the one thing nobody else can copy: **he's building a real GTM engine in Claude Code.**

### The 5 pillars

**1. Ride the Claude-Code-GTM wave with real proof (his unfair advantage).**
Turn the actual Second Brain / campaign-master build into a content series: "I automated ICP scoring
with a Claude skill," "my n8n follow-up watchdog," "the Clay + Claude enrichment waterfall we run."
This is announcement + case-study + teardown — the three highest-median formats — *and* the hottest
niche wave. sacha got 1K followers in 5 days on a weaker version of this.

**2. Lead with announcements & case-studies, not hot takes.**
Default the calendar to: **client-result case-studies** ("how we booked X meetings for [client]"),
**build/milestone announcements**, and **teardowns** (dissect a real cold email / funnel). Ration
contrarian-takes — they're commoditised and lowest-median. Reserve 1 slot/week for a Josh-style
**authentic personal story** (his biggest virals prove it travels furthest of all).

**3. Make the visual the point, every time.** 3–10× reach multiplier and the most under-used lever
we control. We already built the visual pipeline (`content/`, VISUAL-TOOLKIT.md). No post ships
without a strong 1080×1350 visual or a <30s sped-up screen-recording of the actual system running
(dwell-time gold, and on-brand for the Claude-Code angle).

**4. Run the engagement ritual religiously (the reach unlock).**
- 30 min commenting on the 11 tracked experts + ICP creators **before** posting.
- Post **Tue/Wed/Thu**, 3×/week to start → ramp to 4–5.
- **Reply to every comment in the first 30 minutes.** Each reply = another comment (3× score) + algo ping.
- Comment-to-DM lead magnet on **every** post ("comment KEYWORD, must be connected").

**5. Close the loop to revenue (so this isn't vanity).**
Stand up Michel's content→pipeline loop with our existing stack: scrape post engagers → Clay via n8n →
tier with LLMs → warm multichannel outreach. This turns every winner post into booked meetings and
proves ROI. (Build after cadence is consistent; needs Sophiya's sign-off on the n8n/Clay automation.)

### First 30 days (concrete)
- **Week 0:** turn on `sync-post-stats` (needs Apify key + sign-off) so every post gets a verdict.
  Pull 5 winning formats from `FORMAT-LIBRARY.md` to seed the calendar.
- **Weeks 1–4:** 3 posts/week, Tue/Wed/Thu. Mix per week = 1 Claude-Code build case-study + 1
  announcement/teardown + 1 authentic story. Every post: strong visual + comment-CTA + 30/30 ritual.
- **End of month:** review the Posts tab. Now we have a real winner rate and can name Taha's own
  winning hooks/formats instead of extrapolating.

**One-liner:** his content is fine, his reach is starving it. Post 3×/week Tue–Thu with a killer
visual, lead with build-in-public case-studies (not hot takes), run the 30/30 comment ritual, and
put a comment-to-DM magnet on everything — then wire the engagers into Clay so it pays for itself.

---

## 6. Open decisions / flags

- **Carousels:** Michel says LinkedIn pushes carousels more; our current real-pattern note in the
  content system says "no carousels." Worth a controlled test before adopting — don't just flip it.
- **Employee-led branding:** Michel's biggest lever (+$153K MRR) was the *team* posting, not just the
  founder. Primary focus stays Taha-as-celebrity, but Shahwaiz/team posting is a phase-2 multiplier.
- **No new paid tools** (standing rule): we replicate Taplio's "inspiration feed" with our own corpus.

---

## 7. What changed from the first version of this doc (2026-07-11)

- **Corrected the format advice.** v1 said "contrarian-take is the workhorse" (that was frequency,
  from the cadence script). The likes data says contrarian is the *lowest-median* format; announcements
  and case-studies win. Strategy now leads with those.
- Added the full corpus deep-research (§3) and rebuilt the strategy (§5) around build-in-public +
  visuals + the engagement ritual + the revenue loop.

---

## 8. Scripts that feed this doc

- `scripts/analyze-posting-cadence.mjs` — cadence table (reads the local expert corpus).
- `scripts/sync-post-stats.mjs` — the scoring rule + pulls live stats into the Posts tab.
- The tagged corpus itself: `../campaign-master/knowledge-base/learning-center/_tagged.jsonl`
  (6,642 posts; fields: likes, content_type, tools_mentioned, metrics_mentioned, abstract, intuition).
  Ad-hoc analysis scripts used to build §3 were one-offs — re-derive from the jsonl as needed.
- `playbook/FORMAT-LIBRARY.md` — our own reverse-engineered winning formats (the free Taplio).
