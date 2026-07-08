---
number: 1
title: List Building & Data Sourcing
subtitle: Your list is 80% of your outcome — everything else is downstream of this
---

## The one rule everything else depends on

> "Your list is roughly 80% of your outcome with cold email."
> — Richard Illingworth, 2026-05-23 · [source](https://www.linkedin.com/posts/richard-illingworth_i-scraped-10000-contacts-off-apollo-for-activity-7463951901026406400-TR-_)

This is the most important idea in the whole course, which is why we start here instead of with copywriting. Most people who fail at cold email blame the email. Operators who scale blame the list first. Richard: "I'd rather have 100 leads showing intent signals than 10,000 contacts." Volume without relevance is spam with extra steps.

## Concept 1 — Buying a list vs. building one

Two fundamentally different approaches:

- **Buying/pulling from a database** (Apollo, ZoomInfo, Sales Nav) — fast, cheap, generic. Everyone else is emailing the same people from the same database.
- **Building it yourself** — scraping a primary source (Google Maps, company sites, job boards, tech-stack detectors) so the list contains information nobody else's list has.

> "I scrape the entire United States off Google Maps for $19 a category... you have to build the list yourself."
> — OutboundPhD, 2026-06-29 · [source](https://www.linkedin.com/posts/outboundphd_i-scrape-the-entire-united-states-off-google-activity-7477405549056425984-3UVi)

> "We built the whole database ourselves by scraping Google Maps and mining the website for emails." Three levels of personalization, starting with analyzing Google reviews for complaints about a particular service — converted at **1 positive response for every 90 contacts.**
> — OutboundPhD, 2026-06-04 · [source](https://www.linkedin.com/posts/outboundphd_1-positive-response-for-every-90-contacts-activity-7468374845337026560-bRQP)

1-in-90 is exceptional for cold email — and it wasn't the copy that did it. The list was pre-qualified around a real, provable pain point.

## Concept 2 — Quality beats quantity, provably

> "A 5,000-row Apollo list with 2,000 bad fits performs like a 3,000-row list dragging 2,000 pieces of dead weight."
> — Atishay (Hyperke), 2026-06-15 · [source](https://www.linkedin.com/posts/atishay-hyperke_a-5000-row-apollo-list-with-2000-bad-fits-activity-7472305729098407936-Wgas)

His fix, worth stealing directly: ask an AI (he uses Claude Code) to randomly sample 1% of the list against your ICP definition before sending anything. A high bad-fit rate in the sample means the whole list needs re-qualifying — found out in 20 minutes, not after burning sender reputation.

> "Run ICP validation on the list to remove companies that got miscategorized or don't actually fit."
> — Nick Abraham, 2026-06-08 · [source](https://www.linkedin.com/posts/nick-abraham_i-get-at-least-2-cold-emails-per-week-from-activity-7469840681503739904-s8WM)

## Concept 3 — Signals over static data (the biggest 2026 shift)

Static firmographic data (industry, headcount, location) is table stakes. What separates a mediocre list from a great one is **intent signals** — real-time events indicating a company needs what you sell right now.

> "Here are 17 signals you can track to send more relevant emails (and where to find each)."
> — Atishay (Hyperke), 2026-06-29 · [source](https://www.linkedin.com/posts/atishay-hyperke_ive-sent-more-than-30-million-cold-emails-activity-7477360261536854016-E3zj) — tools: Apify, Firecrawl, Prospeo, BuiltWith, Semrush, RB2B, SEC Edgar, SAM.gov

> "Take company domain list and filter for employee start date being within the last 60 days... merge CSVs to add the new hire(s) as a column in your lead list. With this CSV, you can write an email to the CHRO saying [reference the new hire]."
> — Nick Abraham, 2026-06-04 · [source](https://www.linkedin.com/posts/nick-abraham_heres-a-very-clever-way-to-make-a-dynamic-activity-7468285354752770048-BMNW)

A new-hire trigger is one of the cheapest, highest-relevance signals to build — it's an obvious, provable, timely fact, not a guess.

> "Make the list do more of the work... at this point, you're not pushing an idea. You're joining an existing conversation. Let relevance carry the weight."
> — Josh Braun, 2026-05-28 · [source](https://www.linkedin.com/posts/josh-braun_heres-how-to-improve-cold-outreach-response-activity-7465741286210273281-XcnE)

This is the psychological core of why signal-based outbound works — and it is the same principle behind viral LinkedIn hooks (Lesson 3+): join a conversation already happening in the reader's head, don't manufacture one.

## Concept 4 — Verification is non-negotiable

Every high-signal post on list-building mentions verification. Bad emails (bounces, spam-trap hits) are the #1 killer of domain reputation (Lesson 2).

> "Fix: Million Verifier on every list."
> — Richard Illingworth, 2026-05-23

> "We hit 90%+ email coverage by trusting five enrichment tools, not one... different email finders use different data sources, so Prospeo might find 68% of your list. Stack them together? You're hitting 91%+ coverage."
> — Kenny Damian, 2026-06-01 · [source](https://www.linkedin.com/posts/kenny-damian-90aba221a_we-hit-90-email-coverage-by-trusting-five-activity-7467209815841357824-g5lU) — waterfall: Prospeo → LeadMagic → Wiza → Hunter → FullEnrich, stacked in Clay.

## Concept 5 — Arbitrage exists, and it moves fast

> "You run an Apollo URL search, push it through Boomerang, you get a 600% increase for the same price."
> — Richard Illingworth, 2026-05-25 · [source](https://www.linkedin.com/posts/richard-illingworth_spoke-with-a-founder-last-week-paying-for-activity-7464676749214408704-7xwi)

The meta-lesson isn't "use Boomerang" — the specific tools rotate constantly. It's that the smartest operators are always hunting for arbitrage between what a data provider charges and what it's worth, and they combine sources rather than trusting one.

> "Every paid API and every AI call in a pipeline should have to justify why a free, deterministic step couldn't do it first."
> — OutboundPhD, 2026-05-27 · [source](https://www.linkedin.com/posts/outboundphd_we-crawled-thousands-of-websites-for-this-activity-7465390129390538752-AxE5)

## The stack, as it actually exists across these operators

| Step | Tools mentioned | Purpose |
|---|---|---|
| Primary scraping | Google Maps (Apify/RapidAPI), Firecrawl, ZenRows | Build a list nobody else has |
| Base data | Apollo, Sales Nav, ZoomInfo, OpenMart | Firmographic starting point |
| Signals/triggers | RB2B, BuiltWith, Semrush, SEC Edgar, SAM.gov | Intent + timing |
| Enrichment (waterfall) | Prospeo, LeadMagic, Wiza, Hunter, FullEnrich, Clay | Stack sources for coverage |
| Verification | Million Verifier, Reoon | Protect deliverability pre-send |
| ICP QA | Claude/Claude Code + Discolike, sampling | Catch bad-fit rows before send |

## Key takeaway

Spend effort on the list before the copy. A great email to the wrong person gets ignored or reported as spam; a mediocre email to the exact right person at the exact right moment gets a reply. Every operator in this corpus, independently, arrived at the same conclusion.

## Questions for you (Sophiya)

1. For Bleed AI's own outbound right now — are we buying lists (Apollo/ZoomInfo pulls) or building any of them ourselves from a primary source? If buying, which ICP segment would benefit most from a self-built list?
2. Do we currently run any ICP-sampling QA step (the "sample 1%, check against ICP" technique) before a list goes live in a campaign, or does a list go straight from sourcing to send?
3. Which intent signal would be cheapest for us to start tracking this month — new-hire triggers, tech-stack detection (BuiltWith), or something industry-specific to our ICPs?

## Questions you should be asking (that we haven't yet)

- What's our current email-coverage rate per list (the % of rows where we actually find a verified email), and is it above or below the ~90% waterfall-enrichment benchmark these operators cite?
- Are we single-sourcing verification (one tool) or waterfalling multiple verifiers the way Kenny Damian describes? Single-sourcing is the more common silent failure mode.
- Do we have a "graveyard" of dead/duplicate data sources we're still paying for that a tool-adoption audit (Lesson 8 territory) would catch?
- Should Bleed AI build one proprietary, durable database (the way OutboundPhD keeps ~15M Clay-enriched companies in Supabase) instead of re-pulling fresh lists per client engagement?

## Beyond the corpus — additional 2026 context

- **The corpus is already remarkably current** (posts through 2026-06-29), so this isn't stale — but a few things worth flagging that sit slightly outside what got tagged high-signal:
  - **First-party signal data (website visitor de-anonymization)** tools like RB2B are graduating from "nice signal" to "table stakes" for anyone selling into companies with meaningful web traffic — worth a direct evaluation against our own site traffic, not just cold lists.
  - **LLM-based list QA (the Claude Code sampling trick) generalizes beyond ICP-fit** — the same pattern (sample 1%, ask an LLM to score against a rubric, extrapolate) works for flagging duplicate companies, dead domains, and wrong-language contacts before a send, not just ICP mismatch.
  - **Waterfall enrichment cost is falling faster than the corpus reflects** — new entrants undercutting Prospeo/LeadMagic on price appear every few months; worth a standing quarterly check rather than treating any tool list as fixed (this is exactly what Suggested Action #3 in the learning-center — tool-adoption radar vs our own stack — is built to catch on a recurring basis).

---

*Sources: outboundphd, atishay-hyperke, nick-abraham, kenny-damian, richard-illingworth, josh-braun — LinkedIn, scraped 2026-07-04, learning-center corpus (`campaign-master`).*
