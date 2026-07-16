---
title: "Cold Email at Scale: System Overview"
slug: "floxform-cold-email-at-scale"
source_person: "Tim Scheuer (Oxygen)"
source_person_url: "https://www.linkedin.com/in/tim-scheuer-91b005237"
source_post_url: ""
post_likes: 0
post_comments: 0
captured_at: "2026-07-16"
domain: "deliverability-infra"
starred: false
# --- CONTENT ---
content_style: ""
format_tag: ""
structure_tag: ""
cta_keyword: ""
tools_mentioned: ["Cloudflare Registrar", "Apollo/Boomerang", "MillionVerifier", "BounceBan", "OpenRouter", "ZapMail", "Oxygen", "Claude Code", "Blitz API"]
people_tagged: []
# --- VISUAL ---
visual_type: "none"
visual_files: []
# --- LEAD MAGNET ---
lm_form: "notion"
lm_type: "educational-doc"
resource_archived: "full"
resource_link: "https://floxform.notion.site/Cold-email-that-gets-results-at-scale-38e2c8bff8c181b5b066f510b974d0dc"
drive_link: ""
---

> ✅ ARCHIVE COMPLETE (2026-07-17 browser pass): all 6 email template code blocks captured verbatim in `resource/email-templates.md`. Also surfaced the outbound starter repo github.com/OXYGEN-CRO/gtm-vault.

# Cold Email at Scale: System Overview

## Source post
Source post unknown — resource link dumped directly (DM'd lead magnet). Book a call cal.com/tim-scheuer-mxbib9/45.

## CONTENT breakdown
Source post not captured (bare DM link, no post context). COMPETITIVE SIGNAL: Oxygen = "Clay, but for Claude Code", AI-native cold-outbound infra, same buyer audience as Bleed AI (they sell SaaS/CLI, we sell done-for-you) — watch closely. "floxform" subdomain is a hosting slug, NOT the brand.

## VISUAL breakdown
None.

## LEAD MAGNET breakdown
- Case studies: 32,100 emails -> 13.9% reply -> 849 opportunities -> $477,396 pipeline (German therapist vertical); 23 calls in one week (fundraising)
- Full cost breakdown: one-off setup vs monthly recurring at 220-inbox scale
- Infra stack: Cloudflare Registrar -> ZapMail inboxes -> Oxygen (sourcing/verification/personalization/sequencing/CRM) orchestrated via Claude Code
- 6-step process: domain/inbox setup, sourcing, waterfall verification, AI personalization, sequencing/split-testing, CRM/analytics
- 6 email template skeletons — bodies FULLY captured verbatim (`resource/email-templates.md`)

Quality note: COMPETITIVE SIGNAL: Oxygen = "Clay, but for Claude Code", AI-native cold-outbound infra, same buyer audience as Bleed AI (they sell SaaS/CLI, we sell done-for-you) — watch closely. "floxform" subdomain is a hosting slug, NOT the brand.

## Key takeaways
- Capacity formula: domains x inboxes-per-domain x 25 = emails/day (75 x 3 x 25 = ~5,600/day = ~100k/mo)
- Limits: 20-25/inbox/day, 50/50 Google/Microsoft split, 2-3 inboxes/domain, warm 2-4 weeks, never send from main domain
- Waterfall verification: MillionVerifier generalist pass + BounceBan (~$0.0034/email) on catch-alls only, 80-90% coverage target
- Unit costs: ~$300/100k leads (Apollo via Boomerang), ~$72 verification, ~$32 AI personalization (~$0.0008/msg via OpenRouter BYOK)
- Monthly at 220 inboxes: ~$660 ZapMail + $99-250 Oxygen platform

## Repurpose notes
