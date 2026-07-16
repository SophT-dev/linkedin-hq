# Proven Combos — the combination matrix

**What this file is:** the canonical list of *proven combinations* — one row per format ×
structure × visual × lead-magnet-type × CTA mechanic that a real post has actually used to win.
FORMAT-LIBRARY.md catalogs content angles (F1-F13) and POST-STRUCTURE-LIBRARY.md catalogs layouts
(S1-S5) separately; this file records the specific *combinations of both* (plus the visual and the
lead-magnet delivery) that pull together, with the evidence attached. It's the missing middle layer:
when we repurpose a magnet, we copy a proven *combination*, not just a format.

**Who maintains it (not you, Sophiya):**
- **`/lm-repurpose`** appends evidence to the matching row every run (Phase 2 DECONSTRUCT), or adds a
  new `proven-by-others` row when it deconstructs a vault item whose combo isn't here yet. When our
  own repurposed version gets scheduled, it flips that row's status to `testing`.
- **`/lm-intake`** may also add rows when a captured magnet reveals a new proven combination.
- Every row cites its evidence (creator + post + engagement) so nothing here is a guess.

**Promotion rule:** when one of OUR posts using a combo scores **≥80** (likes + comments×3 — the
house winner threshold from CLAUDE.md's Posts-tab scoring), promote that row from `testing` to
**`validated-by-us`**. This is checked **manually during the `sync-post-stats.mjs` review ritual**
(the same moment a post's `worked` verdict gets read), not auto-flipped — a human confirms the post
actually used the combo before it earns the badge.

**Status values:** `proven-by-others` (external creator evidence only) · `testing` (we have a
version scheduled/live, no score yet) · `validated-by-us` (one of our posts hit ≥80 with it).

**Column key:**
- `visual_type` — one of the vault's values: `infographic | screenshot | gif | video | carousel |
  ai-image | personal-photo | none`.
- `lm_type` — one of: `educational-doc | claude-skills | commands | prompts | free-tool | n8n-flows |
  claude-system-folders | other | none`.
- `cta mechanic` — `comment-keyword` (comment-to-DM, our default per pinned-comment-meme.md) ·
  `bookmark/save` · `soft-CTA` · `none`.
- A `*` on a structure = best-fit approximation (the source is a short teaser/gated post where the
  body layout isn't a clean S1-S5); a `—` = no structure cleanly identifiable from the source.

---

## The matrix

| combo_id | format | structure | visual_type | lm_type | cta mechanic | evidence (creator · post · engagement) | status | last_updated |
|---|---|---|---|---|---|---|---|---|
| C01 | F3 Free Giveaway | S3* | infographic | claude-system-folders | comment-keyword | Divyanshi Sharma · "Holy sh*t, I made the Ultimate AI outbound setup" → 9-part Claude+Apollo OS shown as one file-tree image, comment "LEADS" · **361 likes / 1,254 comments** (3.5 c/l — firing comment-gate) | proven-by-others | 2026-07-16 |
| C02 | F3 Free Giveaway | S2* | none | educational-doc | comment-keyword | Eva Banzeraite · "You're using maybe 5% of what Claude can actually do for outreach" → "Claude for Outreach Playbook", comment "OUTREACH" · **38 likes / 175 comments** (4.6 c/l) — F8 contrarian hook fused onto the F3 gate | proven-by-others | 2026-07-16 |
| C03 | F13 N-Things-Run-My-Workflow | S3 | infographic | claude-skills | comment-keyword | Ira Bodnar · "10 Claude skills that run my entire paid-ads workflow" → comment "skills" · **149 likes / 641 comments** (4.3 c/l — the comment-DM engine fork) | proven-by-others | 2026-07-16 |
| C04 | F13 N-Things-Run-My-Workflow | S3 | infographic | free-tool | bookmark/save | Divyanshi Sharma · "10 GitHub repos that quietly run my daily life and save me $2,000 a year" (each item = tool + the paid SaaS it replaces + $/mo) · **306 likes / 38 comments** — the save/reach fork of F13 | proven-by-others | 2026-07-16 |
| C05 | F2 Tool Stack of $X Co | S3 | infographic | educational-doc | comment-keyword | Michel Lieben · "Every tool that runs a $50,000,000 ARR SaaS" (**306**) · Kenny Damian · "These 6 APIs turn Claude Code into a Cold Email engine… $7m ARR agency" (**233**) — S3's "Tools used:" list is the native payoff | proven-by-others | 2026-07-16 |
| C06 | F1 Big Number + How | S1 | screenshot | educational-doc | comment-keyword | Michel Lieben · "We manage > $300k/mo in ad spend via Claude Code. These Skills 2x'd our output" · **score 2649** (our #1 scraped post) · also "4,000 cold emails → $4M+ ARR" (2794 likes / 801 comments, an S1 body) | proven-by-others | 2026-07-16 |
| C07 | F4 Numbered Playbook (top 1%) | S1 | infographic | educational-doc | comment-keyword | Michel Lieben · "How to run LinkedIn Outreach like the top 1% (Based on 100,000+ conversations analyzed in Expandi)" · **score 407** | proven-by-others | 2026-07-16 |
| C08 | F4 Numbered Playbook (benchmark) | S4 | infographic | educational-doc | comment-keyword | Michel Lieben · "How to do LinkedIn Outreach like the top 1%" — every point an X > Y comparison with a real % lift · **420 likes / 131 comments**, reused 3× with different stats (deliberate template) | proven-by-others | 2026-07-16 |
| C09 | F8 Hard-Truth Contrarian | S4 | screenshot | educational-doc | comment-keyword | Richard Illingworth · "STOP wasting time trying to write better cold email copy. 75% of your cold emails land in spam regardless" · **score 147** — S4 fits when the contrarian point is "X beats Y, here's the data" | proven-by-others | 2026-07-16 |
| C10 | F5 Case-Study Reversal | S5 | screenshot | educational-doc | soft-CTA | Michel Lieben · "Max rebuilt his entire lead gen dept on OpenClaw. Then he ditched it and moved to Hermes Agent. Here's why." · **score 390** | proven-by-others | 2026-07-16 |
| C11 | F6 Emotional Personal Story | S2 | personal-photo | none | none | Josh Braun · "I went to the cemetery to bury my mom. My dad's there too…" · **score 242** — NO lead magnet by design (keep these pure); one-thought-per-line cadence | proven-by-others | 2026-07-16 |
| C12 | F7 Build-in-Public | S3 | gif | claude-skills | comment-keyword | Kenny Damian · "I just built an entire outbound campaign from scratch using Claude Code. Campaign live in Instantly" (**124**) · Sacha Martinot · "I just built an AI Agent that scrapes the best Claude Code Skills 24/7" (**277**) — terminal/screen-recording visual | proven-by-others | 2026-07-16 |
| C13 | F10 Live Event Teaser + Recap | S1 | screenshot | educational-doc | comment-keyword | Michel Lieben · "Can you run your entire GTM with Claude Code? … Live." (774 likes / **2846 comments**) + next-day recap "Yesterday, >1400 people watched Kenny Damian build an entire outbound campaign" (752 likes / 1857 comments) — two posts, one investment | proven-by-others | 2026-07-16 |
| C14 | F11 News Reaction + Insider Verdict | S1 | screenshot | educational-doc | comment-keyword | Michel Lieben · "Anthropic just released Claude Design. Our designer Pilar says it's nowhere near Claude Code… 70+ infographics, ~100,000 organic impressions" · **1039 likes / 3196 comments** (highest combined engagement in our scrape) | proven-by-others | 2026-07-16 |
| C15 | F12 Synthesis / Mega-Playbook | S1 | infographic | educational-doc | comment-keyword | Richard Illingworth · "i charge for a cold email infrastructure audit. but f*ck it. here's everything I know for free." · **115 likes / 430 comments** (highest comment count of any single-expert post in the deliverability-infra domain) | proven-by-others | 2026-07-16 |

---

## How to read a row when repurposing

Pick the row whose **format + lm_type** matches the vault item you're repurposing, then keep its
`structure`, `visual_type`, and `cta mechanic` — that's the whole proven combination, not just the
angle. Our substance goes in (Bleed AI cold-email / AI-automation), the *mechanics* stay. Never copy
the source post's wording; copy the shape. Every one of our repurposes traces back to a row here in
its internal notes ("mechanics from &lt;creator&gt;, &lt;post url&gt;").

*Seeded 2026-07-16 from FORMAT-LIBRARY.md's proven examples + POST-STRUCTURE-LIBRARY.md's
format→structure pairings + the received-magnet vault. All 15 seed rows are `proven-by-others` —
nothing here is `validated-by-us` yet because no Bleed AI post has logged a score against a combo.*
