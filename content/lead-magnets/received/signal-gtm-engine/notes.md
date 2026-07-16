---
title: "Signal-Led TAM Engine (signal-gtm-engine)"
slug: "signal-gtm-engine"
source_person: "Sachin Jha (OneGTMLab)"
source_person_url: "https://www.linkedin.com/in/jha-sachin/"
source_post_url: ""
post_likes: 0
post_comments: 0
captured_at: "2026-07-16"
domain: "ai-automation-tooling"
starred: false
# --- CONTENT ---
content_style: ""
format_tag: ""
structure_tag: ""
cta_keyword: ""
tools_mentioned: ["Prospeo", "Blitz", "AI Ark", "Firecrawl", "Serper", "Trigify", "Supabase", "Smartlead", "HeyReach", "Instantly", "Claude"]
people_tagged: []
# --- VISUAL ---
visual_type: "none"
visual_files: []
# --- LEAD MAGNET ---
lm_form: "git-repo"
lm_type: "other"
resource_archived: "full"
resource_link: "https://github.com/onegtmlab/signal-gtm-engine"
drive_link: ""
---

# Signal-Led TAM Engine (signal-gtm-engine)

## Source post
Source post unknown — resource link dumped directly (DM'd lead magnet). No CTA on the repo itself; homepage onegtmlab.com.

## CONTENT breakdown
Source post not captured (bare DM link, no post context). Resource is a full git repo (626KB), cloned into `resource/signal-gtm-engine/`.

## VISUAL breakdown
None.

## LEAD MAGNET breakdown
- Python pipeline + prompts + orchestrator for signal-led TAM building; designed to be stood up by Claude Code ("replicate in one prompt")
- 00-tam-build (Prospeo/Blitz/AI Ark pulls) -> 01-account-qualify (Firecrawl + LLM ICP verdict) -> 02-system-of-record (Supabase DDL + dedupe rules)
- 03/04 signal mapping + expansion (Trigify social signals, Serper news triggers; signals ADMIT net-new accounts, not just rank)
- 05-scoring-stacking (recency-decayed stacked intent scoring, A-D tiers, suppression) -> 06-outreach (Smartlead/HeyReach/Instantly export)
- orchestration/run_pipeline.py: resumable, idempotent, stage-gated (DB column = cursor)

Quality note: Well-architected reference, maps onto campaign-master's stack (Supabase/Prospeo/Instantly); fills a real gap — continuous signal-led TAM expansion vs one-time list building; Trigify layer is paid with no free substitute.

## Key takeaways
- Fit != intent as architecture: binary ICP gate stored separately from decayed intent score — never fuse, or you can't diagnose failed campaigns
- Recency decay: decay = 0.5 ** (age_days / half_life), default half-life 30 days, hard max-age cutoff
- Stacking rewards distinct signal TYPES co-occurring: 1 + STACK_BONUS x (distinct_types - 1), capped — 3 different signals beat 10 of the same
- Domain (never company name) is the single dedup/join key everywhere
- Not-ICP graveyard + Parked lot are permanent queryable tables, not deletes — bounds re-qualification cost
- Suppression double-gated right before send: duplicate send is worse than a missed one

## Repurpose notes
