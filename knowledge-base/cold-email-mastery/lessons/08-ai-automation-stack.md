---
number: 8
title: AI & Automation Stack
subtitle: "The winners don't add AI to outbound — they rebuild the machine around it, then make every AI call earn its keep."
---

## Build a system, not a pile of skills

> "If you want to use Claude Code for cold email without it breaking...STOP building skills.Instead, build a system."
> — Atishay (Hyperke), 2026-06-04 · [source](https://www.linkedin.com/posts/atishay-hyperke_if-you-want-to-use-claude-code-for-cold-email-activity-7468300616717516800-LIB0)

The rookie move in 2026 is bolting one clever agent onto one step and calling it done. The operators who actually win think in **orchestration, not gadgets** — a chain of narrow skills, each doing one job, wired together so a whole campaign flows end to end. Nick Abraham runs Leadbird's entire outbound this way.

> "Build a separate Claude skill for every part of the campaign curation process: offer design, copywriting, list building, etc.Connect all your skills into a single orchestrator that runs through them in sequence so the whole campaign flows from one step to the next."
> — Nick Abraham, 2026-04-15 · [source](https://www.linkedin.com/posts/nick-abraham_claude-code-now-runs-our-entire-outbound-activity-7450162050217070592-t2xc)

And before you get excited: AI is an amplifier, not a rescue. Nick is blunt that it fixes nothing upstream.

> "Claude won't fix a bad offer, bad deliverability, or lack of product-market fit. You still need fundamentals in place before any of this works."
> — Nick Abraham, 2026-04-15 · [source](https://www.linkedin.com/posts/nick-abraham_claude-code-now-runs-our-entire-outbound-activity-7450162050217070592-t2xc)

## What an "agent" actually is (most people don't have one)

> "Most teams think "adding AI" means dropping ChatGPT into one workflow and moving on.That is not an agentic system."
> — Kenny Damian, 2026-04-09 · [source](https://www.linkedin.com/posts/kenny-damian-90aba221a_ive-built-dozens-of-ai-agents-across-our-activity-7448018926166380544-4yN2)

Kenny runs 37 agents at ColdIQ, so his definition is worth memorizing. A real agent is **always-on, trigger-based, making decisions, and taking actions** — not a chatbot you paste a prompt into. The gap between "we use AI" and "we run agents" is the gap between a copilot and an employee. Which brings us to how OutboundPhD frames the whole thing.

> "If you aren't using AI as an employee in your business, you just haven't put the energy in to get it done."
> — OutboundPhD, 2026-06-05 · [source](https://www.linkedin.com/posts/outboundphd_just-gave-a-talk-about-how-to-turn-codex-activity-7468651616347459585-_pRb)

## Claude Code as the spine, not a fifth subscription

> "the standard 2026 cold email stack is 5 subscriptions.That's like five places where the data has to be re-mapped between steps.i ran the whole thing through claude code instead, end to end."
> — Richard Illingworth, 2026-06-26 · [source](https://www.linkedin.com/posts/richard-illingworth_ive-sent-50m-cold-emails-over-the-last-activity-7476280354983710721-GG0n)

Richard has sent 50M+ cold emails, and his 2026 insight is about **friction, not features**: every hand-off between five tools is a place data gets re-mapped, breaks, or leaks. Collapsing the pipeline into one agent that calls each API directly kills the duct tape. In practice that means Claude does research in parallel and writes copy straight off the enrichment it just pulled — no CSV round-trips.

> "Claude scrapes the website, pulls active job listings, and checks recent news in PARALLEL via multiple agents."
> — Richard Illingworth, 2026-06-09 · [source](https://www.linkedin.com/posts/richard-illingworth_i-automated-almost-my-entire-cold-email-activity-7470122066764238849-erl0)

## Clay is the orchestration hub, now driven from chat

> "Clay MCP turns Claude and ChatGPT into a live prospecting terminal.Reps run them from chat.Ops never loses control."
> — Kenny Damian, 2026-04-30 · [source](https://www.linkedin.com/posts/kenny-damian-90aba221a_everything-you-should-know-about-clays-mcp-activity-7455619649418825728-Fdpu)

This is the shape of the modern stack: Clay stays the enrichment and scoring engine, but the **interface becomes a chat terminal** — a rep asks a question, the agent runs the waterfall, ops keeps the guardrails in the Clay tables. Sacha Martinot's team squeezes the credits hard the same way, routing every question through a Claude Code plugin built from 500+ enrichment workflows so paid integrations only fire when a free formula can't answer.

> "Most Clay accounts waste half their credits. Ours doesn't, because we run a Claude Code plugin built from 500+ enrichment workflows."
> — Sacha Martinot, 2026-05-04 · [source](https://www.linkedin.com/posts/sacha-martinot-392005235_most-clay-accounts-waste-half-their-credits-activity-7457069906535055360-x17X)

## The judgment layer is where the money is

> "The actions that I see actually hurt campaign performance is NOT the sending.It's the judgment that runs on TOP of the sending."
> — Atishay (Hyperke), 2026-06-10 · [source](https://www.linkedin.com/posts/atishay-hyperke_the-cost-of-running-cold-email-agent-loops-activity-7470507236285640704-Eenq)

Everyone points AI at *sending* — the cheap, deterministic part. The leverage is in *judgment*: qualifying fit, scoring signals, deciding who's worth a personalized angle. Atishay calls scoring the single cheapest lever you have, because a list full of bad fits doesn't just waste sends, it actively drags your metrics down.

> "A 5,000-row Apollo list with 2,000 bad fits performs like a 3,000-row list dragging 2,000 pieces of dead weight."
> — Atishay (Hyperke), 2026-06-15 · [source](https://www.linkedin.com/posts/atishay-hyperke_a-5000-row-apollo-list-with-2000-bad-fits-activity-7472305729098407936-Wgas)

Kenny's team turned that scoring into a ranked, signal-tagged table — the output you actually want from an agent, not a wall of enrichment.

> "Claude returned a ranked table. 8 HOT. 6 WARM. Each HOT account had a one-line outreach angle tied to the specific signal."
> — Kenny Damian, 2026-06-10 · [source](https://www.linkedin.com/posts/kenny-damian-90aba221a_lushapartner-activity-7470476849987526656-6sYy)

## Prove the prompt before you trust it at scale

> "The rule that makes it work: it does not get to run across the full dataset until it shows me 10 companies with zero edits from me, three times in a row.One edit anywhere and the counter resets."
> — OutboundPhD, 2026-05-28 · [source](https://www.linkedin.com/posts/outboundphd_i-dont-write-prompts-for-list-qualification-activity-7465756271334371328-I875)

This is the discipline most people skip. You don't guess whether a qualification prompt is good — you **prove it on real rows from your actual list** before it touches all 80,000. Ten companies, zero edits, three clean rounds in a row, or the counter resets. It's cheap insurance against an agent confidently mis-tagging your whole database.

## Automation must justify itself vs. a cheaper step

> "The general rule: every paid API and every AI call in a pipeline should have to justify why a free, deterministic step couldn't do it first."
> — OutboundPhD, 2026-05-27 · [source](https://www.linkedin.com/posts/outboundphd_we-crawled-thousands-of-websites-for-this-activity-7465390129390538752-AxE5)

This is the most important principle in the lesson, so read it twice. An LLM call is not free and not always better — sometimes it's slower, pricier, and *worse* than a keyword match. OutboundPhD's cost-ordered pipeline is the template: cheap and deterministic first, agent judgment in the middle, paid batch API only for the remainder.

> "So the order of operations isn't "AI." It's:1. Free, deterministic checks first: a Python script reading obvious signals off the page.2. Coding-agent task sub-agents for the judgment calls: included in usage you're already paying for.3. The paid batch API only for what's left, when the volume truly justifies it."
> — OutboundPhD, 2026-05-22 · [source](https://www.linkedin.com/posts/outboundphd_the-biggest-cost-hack-in-list-building-right-activity-7463574704591728640-CU1e)

And the punchline that proves the principle: in one head-to-head test, the free path beat every paid enrichment API outright.

> "The winner wasn't a paid API.It was scraping the business's own website with an open-source library and reading it with a local LLM."
> — OutboundPhD, 2026-06-30 · [source](https://www.linkedin.com/posts/outboundphd_i-ran-a-test-to-find-local-business-owners-activity-7477718864844206082-Eso_)

## Make the machine compound

> "instead of running a loop every 5 minutes to try to improve an outcome, we can run it every week on the data from cold email campaigns in order to increase positive response rates."
> — OutboundPhD, 2026-06-02 · [source](https://www.linkedin.com/posts/outboundphd_we-launched-a-fully-ai-managed-campaign-for-activity-7467595535072276483-2NmD)

The frontier isn't a one-shot campaign — it's a loop that reads last week's reply data and writes the next test itself, the way a Meta ad pixel improves on its own. But there's a critical guardrail from the same run: never let the agent make a **"game-time decision."**

> "you never want to have what I call a "game-time decision." For it to say, "Hey I want to run an experiment with this data point," you need to give it all the data points it might use so that it's not inventing ways to pull that data that you don't approve."
> — OutboundPhD, 2026-06-02 · [source](https://www.linkedin.com/posts/outboundphd_we-launched-a-fully-ai-managed-campaign-for-activity-7467595535072276483-2NmD)

Give it every data point it's allowed to touch up front, lock the CTA, and let it optimize inside the fence. That's an auto-improving machine you can actually trust to run unattended.

## The stack, as it actually exists

| Tool | What it does in the pipeline | Mentioned by |
|---|---|---|
| **Claude Code** | The spine/orchestrator — runs research, enrichment, copy, and sending end to end from the terminal | Richard Illingworth, Atishay, Nick Abraham, Kenny Damian, Sacha Martinot, Michel Lieben, OutboundPhD |
| **Clay + Clay MCP** | Enrichment & scoring hub; MCP turns it into a chat-driven prospecting terminal | Kenny Damian, Sacha Martinot, Atishay, Michel Lieben |
| **Claygent** | In-Clay web-research agent for pulling & classifying data points | Sacha Martinot, Kenny Damian, OutboundPhD |
| **Apollo / Sales Navigator** | Primary contact & account databases feeding the list | Richard Illingworth, Atishay, Kenny Damian, Michel Lieben |
| **Prospeo / FullEnrich / CompanyEnrich** | Email & company enrichment waterfall providers | Kenny Damian, Sacha Martinot, Michel Lieben |
| **Instantly.ai / Smartlead / lemlist** | Sending, sequencing, inbox placement, and post-launch stats | Richard Illingworth, Kenny Damian, Michel Lieben |
| **Codex** | Alternate coding agent for sub-agent list-cleaning at scale | OutboundPhD |
| **Local / cheap models** (Gemma, GPT-5 nano, Ollama) | Deterministic-adjacent parsing that undercuts paid APIs | OutboundPhD |
| **PredictLeads / Trigify / Lusha Signals** | Buying-signal and trigger data for HOT/WARM scoring | Kenny Damian, Michel Lieben |
| **n8n / Supabase** | Workflow glue and data store behind the agents | Sacha Martinot, OutboundPhD, Michel Lieben |
| **Openmart** | SMB data source that collapses several scattered tools into one | Kenny Damian, Michel Lieben |

## Key takeaway

The 2026 stack isn't a longer list of subscriptions — it's a **single orchestrated system** where Claude Code is the spine, Clay is the enrichment and scoring hub, and cheap local models do the grunt work. The operators winning right now don't ask "where can I add AI?" They ask the opposite: "can a free, deterministic step do this first?" Every paid API and every LLM call has to earn its place, the judgment layer (scoring, qualification, angle-picking) gets the real intelligence, and prompts get proven on real rows before they touch the full list. Build the machine, fence it, then let it compound.

## Questions for you (Sophiya)

1. Bleed AI is already Claude-Code-native and runs Clay + Instantly + Supabase + Prospeo + Apify. Are those five wired into **one orchestrator** (campaign-master skills chaining end to end), or are they still five hand-offs where a human re-maps data between steps — the exact friction Richard says to kill?
2. Where's your **judgment layer**? Atishay says scoring is the cheapest lever and Kenny wants a ranked HOT/WARM table with a one-line angle per account. Does the campaign-master pipeline score fit + signal and output that table, or is it still enriching everything and sending to the whole list?
3. Do we apply OutboundPhD's "prove it on 10 rows, three clean rounds" gate before any qualification prompt runs across a real list — or do we trust the prompt and find out at scale?

## Questions you should be asking (that we haven't yet)

- What's our **cost-per-lead by pipeline step**? Without OutboundPhD's "free deterministic first → agent judgment → paid batch API last" ordering, we can't tell whether an Apify scrape or a Prospeo call is a paid API firing where a free Python check would've done the job.
- Should the reply data from Instantly feed a **weekly auto-improve loop** (like the Meta-pixel model) that writes the next test — and if so, what are the locked constraints (CTA, approved data points) so it never makes a "game-time decision"?

## Beyond the corpus — additional 2026 context

- The corpus is unanimous that Claude Code is the orchestration layer, but MCP is the connective tissue that makes it real — Clay, Apollo, HubSpot, Supabase and hundreds more expose MCP servers, so an agent can call them natively without you writing glue code. Bleed AI already has Clay + Gmail + Slack + Drive on MCP; the leverage is treating every new provider as "does it have an MCP server?" before building a custom integration.
- "Automation must justify itself" scales down as well as up: for genuinely deterministic tasks (dedup, domain validation, keyword matching), a plain script or a nano/local model is faster, cheaper, and more reliable than a frontier model — reserve Opus-class reasoning for the actual judgment calls (fit scoring, angle selection, copy), which is exactly where it pays for itself.

---

*Sources: OutboundPhD, Richard Illingworth, Atishay (Hyperke), Nick Abraham, Kenny Damian, Sacha Martinot, Michel Lieben — LinkedIn, scraped 2026-07-04, learning-center corpus (`campaign-master`).*
