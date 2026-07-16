# Knowledge Base: AI & Automation Tooling

**What belongs here:** AI agents/skills that run parts of the business, prompt systems, GPT/Claude
workflows for content or outreach, no-code automation stacks (n8n/Make/Cursor+Supabase) — the
"what runs the machine" layer, as distinct from the sending/warmup infrastructure that lives in
`deliverability-infra.md`. 321 tagged posts in the corpus under `domain_primary:
ai-automation-tooling`.

## Sources ingested
- **Corpus:** not yet extracted. Run `node scripts/extract-domain-synthesis-source.mjs --domain
  ai-automation-tooling --top 50` for the source dump when writing the real synthesis pass.
- **Received lead magnets** (`content/lead-magnets/received/`, remapped 2026-07-10 — see
  `scripts/remap-leadmagnet-domains.mjs`):
  - `get-ai-to-write-emails-for-your-b2b-lead-list.md`
  - `automated-linkedin-content-creation-with-gpt-4-and-dall-e-fo.md`
  - `apollo-ai-ai-gtm-to-automate-your-lead-gen.md`
  - `how-to-actually-personalize-your-cold-emails.md`
  - `my-secret-prompt-system-for-viral-linkedin-posts-in-10-mins.md`
  - `amplify-personal-brand-gpt-guide.md`
  - "Your AI Copywriter Toolkit" (slug `your-ai-copywriter-toolkit`) — LeadMagnets sheet row only,
    no local swipe file captured
  - The Reddit AEO Skill-Pack — Guillaume Ang (Psyke)
    (content/lead-magnets/received/the-reddit-aeo-skill-pack/notes.md, captured 2026-07-16)
  - Signal-Led TAM Engine (signal-gtm-engine) — Sachin Jha (OneGTMLab)
    (content/lead-magnets/received/signal-gtm-engine/notes.md, captured 2026-07-16)
  - Claude Code Hooks for GTM (go-to-market-orchestrator) — Jan Rasmussen
    (content/lead-magnets/received/go-to-market-orchestrator/notes.md, captured 2026-07-16)
  - The 1,000+ Hour Claude Code Setup Checklist — Aidan (surname unknown)
    (content/lead-magnets/received/1000-hour-claude-code-setup-checklist/notes.md, captured
    2026-07-16)
  - How to book 2-5 meetings a day on LinkedIn with Claude Sonnet 5 — Ilan Asseo (Kakiyo)
    (content/lead-magnets/received/kakiyo-claude-sonnet-5/notes.md, captured 2026-07-16)
  - 10 Claude Code Marketing Workflows for Google and Meta Ads — Angrez Aley (Ryze AI)
    (content/lead-magnets/received/ryze-claude-code-marketing-workflows/notes.md, captured
    2026-07-16)
  - Claude Fable 5 is BACK and here's how to book 2-5 meetings a day on LinkedIn with it — Ilan
    Asseo (Kakiyo) (content/lead-magnets/received/kakiyo-claude-fable-5-back/notes.md, captured
    2026-07-16)

## Inbox (unprocessed takeaways)
(folded in by /lm-intake; synthesize into the main body during the next deliberate synthesis pass)

### The Reddit AEO Skill-Pack — Guillaume Ang (Psyke)
- AEO thesis: Reddit is #2 most-cited source in ChatGPT and #1 domain in Perplexity — AI answers
  surface Reddit threads over brand homepages
- Sequential method: Subreddit Mapper -> Query Finder -> Post Writer -> Reply Writer ->
  Thread-to-Content + Answer Analyzer to close the loop
- Write for the exact buyer question, not upvotes — one specific trustworthy thread stays cited
  for months at zero ad spend
- 5 citation signals: intent match, first-hand specificity, recency, social proof, model-liftable
  formatting
- Authenticity constraints enforced: real experience only, product mentions disclosed +
  minimized, marketing language stripped

### Signal-Led TAM Engine (signal-gtm-engine) — Sachin Jha (OneGTMLab)
- Fit != intent as architecture: binary ICP gate stored separately from decayed intent score —
  never fuse, or you can't diagnose failed campaigns
- Recency decay: decay = 0.5 ** (age_days / half_life), default half-life 30 days, hard max-age
  cutoff
- Stacking rewards distinct signal TYPES co-occurring: 1 + STACK_BONUS x (distinct_types - 1),
  capped — 3 different signals beat 10 of the same
- Domain (never company name) is the single dedup/join key everywhere
- Not-ICP graveyard + Parked lot are permanent queryable tables, not deletes — bounds
  re-qualification cost
- Suppression double-gated right before send: duplicate send is worse than a missed one

### Claude Code Hooks for GTM (go-to-market-orchestrator) — Jan Rasmussen
- Three-layer model to steal: Skills = what, Agents = who, Hooks = when, Orchestrator = how it
  reaches external tools
- dispatch.py pattern: every hook shells into ONE dispatcher reading stdin, merging
  payload['action'], exec'ing the matching service handler — one contract, 17 integrations
- DRY_RUN=1 makes every handler print-and-exit — cheap safety net before touching Slack/CRM/
  outbound for real
- 5-stage outbound pipeline has an explicit human-review pause after auto-enrichment, before
  scoring
- Instantly + Smartlead + Clay handlers already exist — direct overlap with Bleed AI's live stack

### The 1,000+ Hour Claude Code Setup Checklist — Aidan (surname unknown)
- Plan in plan mode (read the plan!), execute in auto mode — the highest-leverage habit
- Karpathy rule 3 'surgical changes' stops Claude editing files you didn't ask about
- Community skills without YOUR context get deleted — skills only stick carrying your frameworks
- Fresh sessions burn 5-15% context before you type — audit and clear at 35-40%
- A second brain is just markdown files in folders referenced by name — not a fancy tool

### How to book 2-5 meetings a day on LinkedIn with Claude Sonnet 5 — Ilan Asseo (Kakiyo)
- The 8-prompt chain is a full agentic LinkedIn outreach system usable without Kakiyo
- Anti-AI-tell rules in every prompt: no em dashes, never start with a verb, ban
  impressed/inspiring/admire/noticed, under 30 words, mirror prospect language
- Objection prompt decodes the REAL objection ('too expensive' = no perceived value) and always
  ends with a soft question
- Close-timing classifier: calendar link only on real buying signals (price/timeline asks), not
  politeness
- Revival logic: diagnose why the thread died, match nudge to cause, never 'just following up'

### 10 Claude Code Marketing Workflows for Google and Meta Ads — Angrez Aley (Ryze AI)
- Prompt specificity is the lever — exact fields, thresholds, output format = first-try success
- Reusable defaults: 115%/85% pacing bands, 2 stdev anomaly (2.5 noisy), $50-spend/zero-conv
  negative filter, run reports after 10am
- Ad naming convention (angle_format_offer_version) is a prerequisite for creative grouping
- Same pattern maps onto campaign-master: anomaly detection, weekly auto-reports, negative mining

### Claude Fable 5 is BACK and here's how to book 2-5 meetings a day on LinkedIn with it — Ilan Asseo (Kakiyo)
- META-LESSON for us: Kakiyo runs ONE templatized lead-magnet campaign and re-skins it per
  trending model release (sonnet-5, fable-5-back) — newsjack format worth copying
- Same anti-AI-tell + objection/closing/revival prompt rules as sibling (see
  kakiyo-claude-sonnet-5)
- Two-CTA structure: product signup with utm per campaign + founder Cal.com call
