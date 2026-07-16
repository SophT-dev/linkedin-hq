# Knowledge Base: List Building & Data

**What belongs here:** ICP sourcing methods, enrichment/waterfall strategy, Clay cost optimization,
catch-all/email-verification hygiene, intent/signal data providers — the "who do we send to, and
how do we find them cheaply and accurately" layer, upstream of both copy and infrastructure. 207
tagged posts in the corpus under `domain_primary: list-building-data` — currently the thinnest of
the 7 "meaty" domains getting a KB file, likely to stay a single file for a long time.

## Sources ingested
- **Corpus:** not yet extracted. Run `node scripts/extract-domain-synthesis-source.mjs --domain
  list-building-data --top 50` for the source dump when writing the real synthesis pass.
- **Received lead magnets** (`content/lead-magnets/received/`, remapped 2026-07-10 — see
  `scripts/remap-leadmagnet-domains.mjs`):
  - "ALL Enrichment Tools" (slug `all-enrichment-tools`) — LeadMagnets sheet row only, no local
    swipe file captured
- **INSIDER-RESEARCH.md items folded in** (retired doc, see `CLAUDE.md`; caveat carried over
  verbatim: "most numbers are vendor-blog sourced (directional, not audited). The *directions* are
  corroborated across sources. Verify before quoting hard."):
  - BYOK is the real Clay cost lever — plug your own Prospeo/Findymail/OpenAI keys in, save
    70-95% vs Clay credits, not waterfall ordering. (Source: vendor blog, directional —
    https://blog.gtm-engineering.io/blog/how-to-save-clay-credits)
  - ICP-gate + dedupe BEFORE the first paid column cuts credit burn 50-70% — people enrich 10k
    rows when 40% are out of ICP. (Source: vendor blog, directional —
    https://outboundrepublic.com/blog/how-to-optimize-your-clay-workflow-to-cut-costs-without-losing-data-quality/)
  - Cap waterfalls at 2-3 providers, cheapest-first — past the third is a few % more coverage at
    full cost. (Source: vendor blog, directional —
    https://www.growthtoday.co/blog/best-email-enrichment-providers)
  - Email hit rates: single-source 50-60%, waterfall 85-98% — no universal winner, rankings flip
    by method/geo. (Source: vendor blog, directional — https://www.clay.com/blog/best-b2b-email-list-providers)
  - Phone lookups are geography-bound (Datagma = EU direct dials, Prospeo = S. Europe + LatAm) —
    reusing your email-waterfall order for phones tanks connect rates. (Source: vendor blog,
    directional — https://www.syncgtm.com/blog/best-waterfall-phone-finders)
  - Catch-alls are the silent list-killer (30-50% of B2B lists), SMTP verifiers lie (return 250 OK
    to everything), catch-alls bounce 27x — segment + warm, don't trust "valid." (Source: vendor
    blog, directional — https://mailvalid.io/blog/catch-all-domains-email-verification-hidden-variable)
  - Cookieless scraping = zero ban risk; cookie-based tools (PhantomBuster, Dux-Soup) get accounts
    restricted in days. (Source: vendor blog, directional —
    https://www.vayne.io/en/blog/linkedin-scraping-guide-2026)
  - The new intent stack is modular: RB2B (person-level site deanonymization), Common Room (dark
    social), Trigify (LinkedIn engagement signals) — person-level + fast-decay beats account-level
    Bombora surges. (Source: vendor blog, directional — https://leadiq.com/blog/rb2b)
  - The Claude for Outreach Playbook: 3 Workflows to Fill Your Pipeline Without Living in Your
    Inbox — Eva (Growth Corp)
    (content/lead-magnets/received/claude-for-outreach-playbook/notes.md, captured 2026-07-16)

## Inbox (unprocessed takeaways)
(folded in by /lm-intake; synthesize into the main body during the next deliberate synthesis pass)

### The Claude for Outreach Playbook: 3 Workflows to Fill Your Pipeline Without Living in Your Inbox — Eva (Growth Corp)
- Reply rates die at the list stage, not the copy stage — build a per-account 'why now'
- First-message goal is a low-friction 60-second yes (audit/teardown/benchmark), not a call ask
- Competitor audiences are pre-educated, pre-unhappy demand — win with stronger proof, never a
  callout
- Mandatory manual QA before send: targeting, offer friction, does-this-sound-human — Claude gets
  80-90%, judgment the rest
- Openers: under 60 words, no 'hope this finds you well', lead with them not you, 3 versions per
  angle
