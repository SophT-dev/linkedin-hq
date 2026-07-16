# Source

- URL: https://floxform.notion.site/Cold-email-that-gets-results-at-scale-38e2c8bff8c181b5b066f510b974d0dc
- Notion page title (as rendered): "Cold Email at Scale: System Overview"
- Notion hosting subdomain: floxform.notion.site (appears to be a generic Notion-site slug — NOT the creator's brand; see Creator section below)
- Fetched: 2026-07-16, via r.jina.ai render proxy (raw WebFetch on the notion.site URL returned only the string "Notion" — client-rendered page, no browser MCP session available to extract further)
- Archive completeness: PARTIAL — all prose, stats, cost tables, and process steps captured; the six email template/skeleton code blocks did NOT render (Notion lazy-loads code blocks as embedded JS — proxy returned "Loading JavaScript code…" placeholder in place of template body text). Template *names/approaches* were recoverable, not the verbatim copy.

---

# Content (as extracted, two independent passes — consistent across both)

## Cold Email at Scale: System Overview

This guide details Oxygen's cold email infrastructure, designed to maximize personalization while maintaining cost efficiency.

## Key Results

The system has generated measurable outcomes: a therapist-targeting campaign in Germany produced 32,100 emails with a 13.9% reply rate, generating 849 opportunities worth $477k in pipeline. A fundraising service booked 23 sales calls in one week using the same approach.

(First-pass extraction render of the same section gave matching figures with slightly fuller phrasing:)
- Therapists in Germany campaign: 32,100 emails sent · 13.9% reply rate · 849 opportunities generated · $477,396 pipeline value
- Fundraising service campaign: 23 sales calls booked in one week
- Scale claim: "~100k personalised emails / month, all from Claude Code"

## Cost Structure

**One-off setup costs:**
| Layer | Tool | Cost |
|---|---|---|
| Domains (~75) | Cloudflare Registrar | ~$750/year |
| Lead list | Apollo via Boomerang | ~$300 per 100k leads |
| Email verification | MillionVerifier + BounceBan | ~$72/list |
| AI personalisation | OpenRouter (BYOK) | ~$32/list |

**Monthly recurring:**
| Layer | Tool | Cost |
|---|---|---|
| Inboxes (220) | ZapMail | ~$660 |
| Data, enrichment, sequencer, CRM | Oxygen | $99–$250 |

## Infrastructure Components

The stack comprises three primary tools: Cloudflare for domain registration, ZapMail for inbox management, and Oxygen handling sourcing, verification, personalization, sequencing, and CRM functions — all orchestrated through Claude Code.

## Process Framework

**1. Domain & Inbox Setup**
- Buy burner domains at cost via Cloudflare (never send from the main domain)
- 50/50 Google/Microsoft (Gmail/Outlook) inbox split
- 2–3 inboxes per domain
- Warm inboxes 2–4 weeks before cold sending
- Max 20–25 emails per inbox per day
- Capacity formula: "domains x inboxes per domain x 25 = emails / day" (example: 75 × 3 × 25 = ~5,600/day = ~100k/month)

**2. Lead Sourcing**
- Scrape TAM from Apollo via Boomerang (~$3/1,000 leads)
- Alternative: native Blitz API inside Oxygen
- Filter to verified emails before export
- Maintain narrow ICP focus

**3. Verification & Enrichment**
- Waterfall enrichment in Oxygen (80–90% coverage target)
- MillionVerifier: generalist pass on all records
- BounceBan: specialist pass on catch-alls only (~$0.0034/email)

**4. Personalization**
- Generate AI variables in Oxygen from real lead insights
- Process through OpenRouter (BYOK model)
- Cost: ~$0.0008 per personalized message

**5. Sequencing & Testing**
- Use Oxygen's native sequencer (no separate tool)
- Split-test one variable at a time
- Track variants for system learning

**6. CRM & Analytics**
- Built-in Oxygen CRM captures replies, contacts, opportunities
- No separate HubSpot seat required
- Data feeds back into the next campaign cycle

## Six Email Templates/Frameworks (names only — body text not recoverable, see note above)

1. Lead magnet + same-industry case study
2. One-line free-work offer
3. Guarantee / risk reversal
4. Pain question, then solution
5. Signal touchpoint, pain, quick fix
6. Touchpoint + unique market insight

(Page notes these are shown as code-block "skeletons, not finished copy.")

## Key Principles Emphasized

- "Not the cheapest. The most optimised."
- Never send from the main domain
- Waterfall verification catches more than all-in-one tools
- Split-testing is where "the money leaks" if ignored
- Quality-first infrastructure design
- One sharp message to one coherent audience

## Contact / Attribution on page

- Tim Scheuer — tim@oxygen-agent.com
- Calendar link: cal.com/tim-scheuer-mxbib9/45

---

# Creator research

- **oxygen-agent.com** (company site) describes itself as: "AI GTM infrastructure engineered to 10x revenue" / a "GTM CLI for Claude Code, Codex & MCP agents" — an AI-native GTM workspace combining lead management, sequences, workflows, CRM, and 50+ data-provider integrations. Contact found on site: philipp@oxygen-agent.com (co-founder/team, alongside Tim).
- **Tim Scheuer** — leads the Oxygen team. LinkedIn posts confirm: "Introducing OXYGEN for GTM Engineers," described by him as "we built Clay, but for Claude Code instead [of GTM Engineers]." LinkedIn profile (from post URL slugs): linkedin.com/in/tim-scheuer-91b005237. Also surfaced: Tim Scheuer is Co-Founder of Prospera.ai (AI agent for agencies/sales teams doing personalized multichannel follow-ups) — likely an earlier/related venture.
- **"floxform"** — the notion.site subdomain slug does not match "Oxygen" as a brand. Web search shows floxform.notion.site independently exists as a generic "AI workspace" Notion template/homepage, and other unrelated entities (a German 3D-printing business, a Notion consulting partner) also use the "floxform" name. Working conclusion: floxform.notion.site is most likely a Notion consulting/agency's client-site slug (or a reused free subdomain) used to host this particular lead magnet for Oxygen — NOT Oxygen's own branded domain. Treat "Oxygen" / Tim Scheuer as the actual creator/brand of record, not "Floxform."
