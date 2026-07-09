# Knowledge Base: Copywriting

**What belongs here:** hooks, subject lines, email/post structure and psychology, framework
templates (Direct, Poke The Bear, Diagnosis, Case Study, etc.), pronoun/CTA rules — anything about
*how the words are put together* to get a reply or a read. 841 tagged posts in the corpus under
`domain_primary: copywriting` (largest single domain after the two content-format buckets we skip
— see `CLAUDE.md`), so this is a likely candidate to outgrow the per-file ceiling and split into a
subfolder (`playbook/knowledge/copywriting/` — `hooks.md`, `ctas.md`, `objections.md` +
`_index.md`) once it does. Don't pre-split now.

**Not the same doc as `playbook/COPYWRITING-BIBLE.md`** — the Bible is book-sourced craft
principles (Ogilvy/Sugarman); this file is corpus-cited real-post consensus (what our own tracked
experts' top posts actually do). Cross-linked, not merged — raid the Bible for craft mechanics,
raid this file for "here's the real post that proves it."

## Sources ingested
- **Corpus:** not yet extracted. Run `node scripts/extract-domain-synthesis-source.mjs --domain
  copywriting --top 50` for the source dump when writing the real synthesis pass.
- **Received lead magnets** (`content/lead-magnets/received/`, remapped 2026-07-10 — see
  `scripts/remap-leadmagnet-domains.mjs`):
  - `cold-email-frameworks.md` (source: Litehouse)
  - `proven-cold-email-framework-vault.md` (source unknown)
  - "Attention Hooks" (slug `attention-hooks`, source: Premium Inboxes) — LeadMagnets sheet row
    only, no local swipe file captured; link was dead when checked
  - "50 Openers" (slug `50-openers`, source unknown) — LeadMagnets sheet row only, no local swipe
    file captured
- **INSIDER-RESEARCH.md items folded in** (retired doc, see `CLAUDE.md`; caveat carried over
  verbatim: "most numbers are vendor-blog sourced (directional, not audited). The *directions* are
  corroborated across sources. Verify before quoting hard."):
  - The "I saw you raised a Series A" opener is dead — instantly pattern-matched. What wins:
    signal → *implication* → proof ("saw X, from work with [logo] that usually means [costly
    consequence]") — the diagnosis, not the data point. (Source: vendor blog, directional —
    https://charlesandsystems.substack.com/p/steal-eric-nowoslawskis-cold-email)
  - 2026 benchmarks: avg reply 3.43% (down from ~5.1% in 2024), top quartile 5.5%+, elite 10.7%+ —
    optimize **positive** reply rate, not raw. (Source: vendor blog, directional —
    https://instantly.ai/cold-email-benchmark-report-2026)
  - Soft/interest CTA beats meeting-ask ~3:1 on cold (Gong, 304k emails: 12% reply/68% positive vs
    meeting-ask); once warm, direct calendar ask converts 2.5x better — sequence CTA to
    temperature. (Source: vendor blog, directional —
    https://growleads.io/blog/interest-based-ctas-vs-meeting-requests-study/)
  - Length sweet spot 50-125 words — 2.4x the reply of 200+ word, 1.6x the reply of sub-50 word;
    "3 sentences max" is wrong for high-ticket. (Source: vendor blog, directional —
    https://leadhaste.com/blog/cold-email-length-best-practices-2026)
  - Lowercase subjects beat Title Case 21% (12M emails); 4-5 words wins. (Source: vendor blog,
    directional — https://www.sendr.ai/blog/cold-email-subject-lines-open-rates-2026)
  - Personalization is now binary: first-name/company tokens do nothing (~3%), genuine
    business-context relevance jumps to 15-30% — no middle of the curve. Winning recipe = AI +
    real signal + human edit. (Source: vendor blog, directional —
    https://www.saleshandy.com/blog/cold-email-statistics/)
  - The operator hierarchy (Michel Lieben, $6M ARR): Infrastructure → List quality → Offer (80% of
    effort) — copy isn't top 3. "Your lead magnet IS your offer." Give 3x, ask once. (Source:
    corpus post, directional —
    https://www.linkedin.com/posts/michel-lieben_how-it-started-4000-cold-emails-sent-1-activity-7320031280744603648-aMPN)
  - 58% of replies from email #1, 42% from follow-ups — optimal: 4-7 touches, 3-4 days apart, each
    adding NEW value, not "just bumping." (Source: vendor blog, directional —
    https://instantly.ai/cold-email-benchmark-report-2026)
  - Multichannel on the SAME signal: Email+Call = 2.5x positive reply vs email alone; Email+
    LinkedIn = 1.9x — same trigger echoed across channels compounds, random multichannel doesn't.
    (Source: vendor blog, directional — https://leadhaste.com/blog/outbound-sales-benchmarks-2026)
