# Knowledge Base: Deliverability & Infrastructure

**What this is:** philosophy #1 ("synthesis over volume") in action — one condensed mega-playbook
built from the 202 high-signal `deliverability-infra` posts in the tagged corpus (top 25 by likes,
spanning 8 experts, read in full), so drafting a post or lead magnet on this topic means reading
one doc instead of 200. Modeled on what Richard Illingworth did compressing three Hormozi books
into one playbook — same move, applied to our own corpus. Part of the `playbook/knowledge/`
Knowledge Base doc set (formerly called "Domain Synthesis" — renamed, see `CLAUDE.md`).

**Source note (show the work):** every claim below is cited to the specific post and expert it
came from — real engagement numbers included so you can judge how much consensus actually backs
it, not just this doc's word for it. Nothing here is invented. Full source dump (all 50 posts,
not just what made the final cut): `.scratch-synthesis/domain-deliverability-infra.txt` at the
workspace root (outside any repo, not tracked by git — regenerate with `node
scripts/extract-domain-synthesis-source.mjs --domain deliverability-infra --top 50` from
`linkedin-hq/` if it's gone).

**Experts represented (actually cited below):** Michel Lieben, OutboundPhD (Growth Engine X),
Kenny Damian, Richard Illingworth, Nick Abraham, Atishay (Hyperke), Nikita Maildoso.

---

## 1. The consensus stack (what nearly every top post agrees on)

### Infrastructure — never send from your primary domain
- Buy secondary domains that forward to your main site/domain — never send cold volume from the
  brand's actual domain. (Michel Lieben, 237 likes/143 comments; Kenny Damian, 183 likes/65
  comments; Nick Abraham, 100 likes/33 comments)
- 2-3 mailboxes per domain, unique IPs, roughly 50/50 split between Google Workspace and
  Microsoft 365/Outlook. (Kenny Damian, 120 likes/55 comments; Michel Lieben, 139 likes/94
  comments)
- Full authentication on every domain: SPF, DKIM, DMARC. Non-negotiable, cited in nearly every
  post in this set.
- Rotate/retire domains every 9-12 months even if nothing's gone wrong yet. (Kenny Damian, 183
  likes/65 comments)
- Buy domains from Porkbun or Dynadot (regular cheap sales — $2-7/domain), not GoDaddy.
  (OutboundPhD, 198 likes/36 comments; 97 likes/18 comments)
- Use a done-for-you inbox provider so you get admin console access: Zapmail.ai (Google) or
  Hypertide.io (Outlook) are the two named repeatedly across experts. ColdIQ also named as a
  premium/managed option. (Michel Lieben; OutboundPhD, multiple posts)

### Warmup — 2-4 weeks minimum, no shortcuts
- 14-30 day warmup before any real sending, gradually increasing volume. Numbers cited: "2-week
  minimum" (Kenny Damian, 120 likes), "30-day minimum" (Michel Lieben's 2026 post, 225
  likes/144 comments), "3 weeks" (Michel Lieben, 139 likes/94 comments).
- Platforms with built-in warmup: Instantly.ai, Smartlead, lemlist, Woodpecker.co, MailReach —
  named across nearly every post as the standard tool layer.
- **Keep warming permanently, not just pre-launch.** Nick Abraham: "Keep it on at all times" even
  after a domain is active (77 likes/36 comments).

### Sending limits — lower than you'd guess, and volume isn't linear
- 20-30 emails per mailbox per day is the consensus range (not higher) — cited as 20-25 (Kenny
  Damian, twice), 15-30 (OutboundPhD, 132 likes/34 comments), 25 as an "arbitrary but working"
  number (Michel Lieben, 139 likes/94 comments).
- **Real experiment, not a guess:** OutboundPhD ran 50-60 emails/day after a 2-week warmup vs. the
  usual 30/day — results looked fine for 2-3 days, then completely dropped off, where the 30/day
  inboxes lasted 2-3 weeks. Direct quote: "it doesn't work" (117 likes/36 comments).
- Scale by adding more mailboxes/domains, never by raising the per-mailbox ceiling. Repeated
  across nearly every infrastructure post in this set.
- **This isn't a universal ceiling, though** — OutboundPhD separately ran a real test sending
  1,000 emails from one inbox in a single day (a warm list, spam-tested before/after, 100% inbox
  both times) and argues the real constraint is spam complaints, not a fixed number: "you could
  send 100k emails a day from Mailchimp and get in the inbox if no one marked your emails as spam"
  (79 likes/27 comments). Treat 20-30/day as the safe default, not a law of physics.

### List hygiene — validate before you send, always
- Bounces are the single biggest signal that tells ESPs you're sending cold/unsolicited mail —
  every bounce hurts the whole domain's reputation, not just that one send. (Michel Lieben, two
  posts, 163 and 161 likes)
- Validate every email before sending. Tools named repeatedly: LeadMagic, FullEnrich, Prospeo.io,
  Icypeas, MillionVerifier.
- Separate "catch-all" addresses (unverifiable) into their own campaign, never mix with verified
  sends — cited in both Nick Abraham's 21-question checklist (100 likes/33 comments) and his
  27-point version (90 likes/19 comments).
- Auto-pause a campaign once bounce rate crosses ~2%. (Nick Abraham, 83 likes/20 comments; 77
  likes/36 comments)

### Copy rules that affect deliverability (not just persuasion)
- Plain text, no HTML formatting, minimal or zero links, no attachments.
- Spintax (randomized wording variation) on subject line, body, **and signature** — Nick Abraham
  built an entire signature-variance framework (sign-off / name format / title format all spun
  independently) specifically to avoid fingerprinting at 10,000+ sends/month (90 likes/36
  comments).
- **2026 update — spintax alone isn't enough anymore.** OutboundPhD: a client's reply rate held
  flat between two identical sending days except for a subject-line change — bounces spiked to
  10% on the "same" day, dropped back to normal once 10 new subject-line variants went in. Cites
  Nikita Maildoso's theory that "copywriting is going to spam before a domain actually is" (101
  likes/21 comments).
- **A single word can break deliverability.** Nick Abraham: a real-estate campaign with a strong
  offer got 0% replies for 24 hours; changing only the word "free" to "complimentary" produced a
  reply within hours of the next send. His conclusion: spam filters are now AI-based and score
  individual words, not just sender patterns — check copy before touching infrastructure (90
  likes/19 comments).
- Turn off open-rate tracking — considered unreliable and possibly harmful to placement by
  multiple experts independently. OutboundPhD ran this as a real A/B test for 4-6 weeks and saw
  positive replies drop on days tracking was on (95 likes/29 comments).
- ESP/provider matching — send to Gmail recipients from a Gmail mailbox, Outlook from Outlook.
  Instantly.ai and Smartlead both have this as a built-in feature. (Michel Lieben, two posts)

### Monitoring & rotation — treat inboxes like a fleet, not a set-and-forget
- Run daily automated inbox-placement tests (Primary/Promotions/Spam) and cut inboxes landing in
  spam on a fixed schedule (Tue/Fri, in OutboundPhD's case), replacing with pre-warmed reserves
  (94 likes/21 comments).
- Keep 50-100% *extra* sending capacity warming in reserve at all times — "insurance" inboxes, not
  active ones — so a bad week never leaves a customer with zero healthy inboxes. Cited by both
  OutboundPhD (98 likes/39 comments; 95 likes/29 comments) and Kenny Damian (183 likes/65
  comments) independently.
- Score domain/inbox health continuously and automate the "cancel vs. keep vs. insurance"
  decision rather than eyeballing a spreadsheet — OutboundPhD's Cursor+Smartlead-API+Supabase
  build is the most detailed version of this in the set (95 likes/29 comments; 129 likes/117
  comments).
- Ignore open rate and click-through rate as health metrics — track reply rate and **positive**
  reply rate instead. Benchmarks repeated near-identically by both Kenny Damian posts: reply rate
  industry avg 1-5%, good 10%+, great 25%+; positive reply rate industry avg 0.1-0.5%, good 1-3%.

---

## 2. The 2026 shift — AI-based filtering changes the game

This is the most recent and highest-signal material in the set, worth calling out separately
since it contradicts some of the older "just follow the checklist" consensus above:

- **Filtering is no longer just domain/IP reputation — it's AI scoring the content and behavior
  in real time.** Richard Illingworth (115 likes/430 comments) frames it as a "4-checkpoint
  pre-send evaluation": authentication, trust scoring, behavioral analysis, identity validation —
  all running invisibly before a send even leaves the platform. His "two-lane provider strategy"
  (running 70/30 or 50/50 splits across two providers, not relying on one) is the proposed fix for
  "silent throttling" where deliverability degrades with zero warning.
- Enterprise targets add a second layer: security gateways like Barracuda and Proofpoint
  auto-filter before the recipient's own inbox rules even apply. Atishay/Hyperke's fix is a
  domain-aging strategy specifically to get past a ~90-day security-flag window (122
  likes/306 comments).
- **Contrarian, worth flagging rather than treating as settled:** Nikita Maildoso argues private
  SMTP infrastructure (their own product, so read with that in mind) consistently outperforms
  Google/Microsoft mailboxes, and that warmup-tool vendors have a financial incentive to push
  everyone toward Google because that's their business model (87 likes/78 comments). Also
  disclosed a real incident: shared Cloudflare/DNS infrastructure across many client domains
  created enough "correlation data" for blacklist operators to treat unrelated domains as one
  sender, causing a mass blacklisting event — fixed by moving to near-total infrastructure
  isolation per domain (88 likes/42 comments). Worth citing as a cautionary/insider-knowledge
  example even without endorsing the product pitch.
- **Scale changes the problem, not just the size of it.** Atishay/Hyperke: going from 10K to
  100K+ sends/month doesn't scale linearly — relative reply rates fall as absolute profit rises,
  fingerprinting becomes a real risk because ESPs start pattern-matching your copy across volume,
  and lead lists have to support reuse/multi-tier targeting because you can't source fresh
  contacts fast enough at that scale (100 likes/208 comments).

### Corroborating vendor stats (folded in from the retired `INSIDER-RESEARCH.md`, 2026-06-22)
**Caveat carried over verbatim: most numbers below are vendor-blog sourced (directional, not
audited). The *directions* are corroborated across sources. Verify before quoting hard.**

- Gmail ~87% vs Microsoft ~75.6% inbox placement — most B2B inboxes are M365, where placement is
  ~12pts worse and IP-driven. (Source: vendor blog, directional —
  https://puzzleinbox.com/blog/cold-email-infrastructure-types-guide/)
- **~35 emails/day is the real per-inbox ceiling** for indefinite good reputation on Google —
  50-80/day degrades you to "Medium" in 30-45 days even on a clean list; the "50-100/day" advice is
  a slow bleed. (Source: vendor blog, directional —
  https://litemail.ai/blog/cold-email-inbox-limit-per-day-google-vs-microsoft-2026)
- **Pre-2022 warmup pools now HURT you.** Gmail flags artificial warmup as suspicious instead of
  ignoring it — only genuine human engagement helps. (Source: vendor blog, directional —
  https://litemail.ai/blog/does-email-warmup-work-2026)
- "Premium" reseller inboxes (Maildoso/Zapmail) ride contaminated pools — Maildoso network spam
  rate ~5% (May 2026), so you inherit the neighbor's reputation. (Source: vendor blog, directional
  — https://coldemailkit.com/tools/maildoso)
- **Bulk-sender status is permanent.** Cross 5,000 Gmail recipients in 24h once and the tag never
  comes off (since Nov 2025, permanent 550 rejections). (Source: vendor blog, directional —
  https://firstsales.io/blog/google-bulk-sender-rules-2026/)
- 0.30% spam complaint rate = blocking; <0.10% is the real target — Postmaster lags 24-48h, so
  you're blind during the damage. (Source: vendor blog, directional —
  https://coldreach.ai/blog/gmail-spam-rules)
- Sudden domain death is one event, not decay — a single recycled spam-trap hit (-30% placement)
  or a >30-50% day-over-day volume jump on a <90-day inbox. (Source: vendor blog, directional —
  https://reachkit.ai/blog/domain-burnout-cold-outreach)
- Kill open tracking — post-MPP it's noise, and the pixel triggers Gmail's "images hidden /
  suspicious" banner; keep a custom tracking domain for isolation, disable the pixel. (Source:
  vendor blog, directional — https://prospeo.io/s/gmail-open-tracking-changes)
- The links rule is engagement-gated: first touch plain text, ≤1 link, no images; after they
  reply, links/images are fine. (Source: vendor blog, directional —
  https://www.mailpool.ai/blog/cold-email-attachments-vs-links-whats-safe-in-2026-and-whats-not)
- In-body "reply remove" opt-out cuts complaints 20-40% vs header-only — the human path beats the
  spam button. (Source: vendor blog, directional — https://powerdmarc.com/bulk-email-sender-requirements/)
- BIMI is a trap for cold: ~$1,500/yr, 2-6% open lift, Outlook still ignores it (May 2026) — just
  take the DMARC enforcement it forces instead. (Source: vendor blog, directional —
  https://puzzleinbox.com/blog/bimi-cold-email-setup-worth-it-2026)

---

## 3. Steal-this checklist (condensed from Nick Abraham's two published QA checklists)

Nick Abraham publishes a full pre-launch QA checklist his agency runs on every campaign — 21
questions in one post (100 likes/33 comments), refined to 27 in a later one (90 likes/19
comments). Condensed to the non-redundant set:

**Infrastructure:** Google + Microsoft mix in place? Two-week minimum warmup done? Inbox
placement test comes back clean? Domains redirecting properly? DNS records verified?

**List:** Catch-alls separated into their own campaign? Leads scored, best-fits at the top?
Everyone actually in the ICP? Validated through a third-party tool (e.g. MillionVerifier)?
Company names/titles formatted correctly?

**Copy:** Subject line reads as internal, not marketing? Spintax present? Under 75-100 words?
Free of links/attachments? Free of spam trigger words? Would you actually say this to someone in
person? (If it could be sent to any random industry unchanged — don't send it, it's too generic.)
Signature free of links, images, phone numbers?

**Campaign settings:** Sending in the recipient's own time zone? Volume per inbox as low as
possible? Open tracking off? ESP matching on (Gmail→Gmail, Outlook→Outlook)? Plain text sending
on? Campaign start times rotating daily, not fixed?

---

## 4. Tool stack cited across this domain (for a "what the top agencies actually run" post)

- **Sending/sequencing platforms:** Instantly.ai, Smartlead, lemlist, Woodpecker.co
- **Inbox/infrastructure providers:** Zapmail.ai (Google), Hypertide.io (Outlook), ColdIQ
  (managed/premium), Maildoso (private SMTP)
- **Warmup:** MailReach, plus built-in warmup on Instantly/Smartlead/lemlist
- **List validation/enrichment:** LeadMagic, FullEnrich, Prospeo.io, Icypeas, MillionVerifier,
  Scrubby, Clay (waterfalls)
- **Domain registrars:** Porkbun, Dynadot (cited repeatedly for sale pricing vs. GoDaddy)
- **Ops/automation:** Cursor + Supabase (domain health scoring, automated rebatching), n8n + Make
  (GTM workflow automation)
- **Spam-word/copy checking:** Folderly, Mailmeteor

---

## 5. How to use this doc

- **As a post source:** any single numbered section above (the sending-limit experiment, the
  "free → complimentary" word-swap story, the 2026 AI-filtering shift, the steal-this checklist)
  is a complete post on its own — cite the source post's engagement numbers as your proof the
  claim is real, per philosophy #2 ("show the work").
- **As a lead magnet source:** section 3 (the condensed QA checklist) is close to lead-magnet-ready
  as-is — a "cold email pre-launch checklist" PDF, built the same way Richard Illingworth's own
  infra checklist post (cited above, 115 likes/430 comments) worked as *his* lead magnet.
- **Referenced in:** `FORMAT-LIBRARY.md`'s new Synthesis/Mega-Playbook format entry (Stage 3) uses
  this doc as the worked example.

## Sources ingested
- **Corpus:** top 25 by likes of 202 high-signal `deliverability-infra` posts (out of 470 total
  tagged posts in this domain), snapshot taken 2026-07-08 — see the header note above for the
  regeneration command.
- **Received lead magnets** (`content/lead-magnets/received/`, remapped 2026-07-10 — see
  `scripts/remap-leadmagnet-domains.mjs`):
  - `inbox-breakthrough.md`
  - `deliverability-masterclass-smartservers-smartsenders-smartde.md`
  - `set-up-smartlead-ai-email-warm-up.md`
  - `secrets-to-64-reply-rates-in-2025.md`
  - `7-ways-to-transform-your-cold-email-campaigns.md`
  - "Premium Playbook" (slug `premium-playbook`) — LeadMagnets sheet row only, no local swipe file
    captured
  - "Infrastructure Blueprint" (slug `infrastructure-blueprint`) — LeadMagnets sheet row only, no
    local swipe file captured
  - Cold Email at Scale: System Overview — Tim Scheuer (Oxygen)
    (content/lead-magnets/received/floxform-cold-email-at-scale/notes.md, captured 2026-07-16)
  - Cold Email at Scale for SMBs: 1200-1500 leads every month — Atishay Jain (Hyperke); presented
    at a Smartlead-hosted ("SL") webinar
    (content/lead-magnets/received/sl-webinar-cold-email-at-scale-smbs/notes.md, captured
    2026-07-16, creator confirmed 2026-07-17)
- **INSIDER-RESEARCH.md items 1-11 folded into §1/§2 above** (retired doc, see `CLAUDE.md`).

## Inbox (unprocessed takeaways)
(folded in by /lm-intake; synthesize into the main body during the next deliberate synthesis pass)

### Cold Email at Scale: System Overview — Tim Scheuer (Oxygen)
- Capacity formula: domains x inboxes-per-domain x 25 = emails/day (75 x 3 x 25 = ~5,600/day =
  ~100k/mo)
- Limits: 20-25/inbox/day, 50/50 Google/Microsoft split, 2-3 inboxes/domain, warm 2-4 weeks, never
  send from main domain
- Waterfall verification: MillionVerifier generalist pass + BounceBan (~$0.0034/email) on
  catch-alls only, 80-90% coverage target
- Unit costs: ~$300/100k leads (Apollo via Boomerang), ~$72 verification, ~$32 AI personalization
  (~$0.0008/msg via OpenRouter BYOK)
- Monthly at 220 inboxes: ~$660 ZapMail + $99-250 Oxygen platform

### Cold Email at Scale for SMBs: 1200-1500 leads every month — Atishay Jain (Hyperke), Smartlead-hosted webinar
- PCPL (Prospects Contacted Per Lead) target: 500 or less
- Minimum reply rate benchmark: 2%; show-up rate goal: 70%
- 20 emails/day/inbox cap for deliverability
- Two-touch max, then 60-90 day cooldown with a new angle
- 'Stop tracking open rates. They don't work anymore, period.'
