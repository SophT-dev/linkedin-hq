# ⚖️ Fable 5 vs GPT-5.6 Sol: The Cold Email Guide

Everyone's fighting about which one is "smarter." Wrong question. Here's the one you actually care about: which one should do which job in your business, and what does it cost you?

No sponsor. No favorite. Every number sourced.

> 🎯 **The 30-second answer:** Fable 5 is the sharper thinker, but it's slow and pricey. Sol is the faster, cheaper worker that shows up every time. Your winning move probably isn't picking one. It's running Fable as your *manager* (strategy, review) and Sol as your *worker* (writing at volume).

**What's inside:**

- The 30-second verdict
- The full spec sheet
- An aspect-by-aspect breakdown (8 things you care about, each with a winner)
- The real test data
- Which model to use for which cold-email job
- 6 long, ready-to-run prompts
- 4 tests you can run on your own leads this week

---

## 1. The 30-second verdict

Neither one wins everything. Think of them as two people you'd hire for very different jobs.

- **Fable 5 is the sharper thinker.** Better writing, better planning, and it catches its own mistakes. But it's slow, and you'll pay 2 to 5x more than Sol for the same job.
- **Sol is the faster, cheaper worker.** A hair less sharp, but for the stuff you do all day, like a cold email, it's nearly as good for a quarter of the price.
- **Fable has one problem you can't ignore in sales:** it sometimes just doesn't deliver. In a 260-call test, 1 in 5 of its runs failed. It refused, timed out, or got cut off. Sol delivered every time. You probably can't build a pipeline on a tool that ghosts you 1 in 5 times, and Anthropic themselves admitted they set the safety filters too high for launch.
- **Your move isn't "pick one."** Use Fable as your manager and Sol as your worker. You get 92 to 96% of Fable's quality for less than half the cost, and that's Anthropic's own recommended setup.

| Claude Fable 5 (The Manager) | GPT-5.6 Sol (The Worker) |
| --- | --- |
| Better at judgment, strategy, creative writing | Fast, cheap, and it shows up every time |
| Great at reviewing work and catching problems | Follows instructions without overthinking them |
| Slow, and expensive per email | A little less creative and strategic |
| Sometimes refuses safe sales copy | Built for hundreds of emails a day, not planning the campaign |

---

## 2. The spec sheet

Straight from each company's own pricing pages. "MTok" just means per million tokens.

| Spec | Claude Fable 5 | GPT-5.6 Sol |
| --- | --- | --- |
| Cost to read text (input) | $10.00 / MTok | $5.00 / MTok |
| Cost to write text (output) | $50.00 / MTok | $30.00 / MTok |
| How much it reads at once | 1,000,000 tokens | ~1,050,000 tokens |
| Longest single reply | 128,000 tokens | 128,000 tokens |
| "Thinking" before it answers | Always on. Can't turn off, only pick depth | Optional. Off, or none to max |
| Time to first word | ~109 to 160 sec | ~2.7 sec |
| Cheaper sibling models | None. One size | Terra ($2.50/$15), Luna ($1/$6) |
| Best at (verified) | Coding, math, careful reasoning | Speed, tool use, exact instructions |

---

## 3. The breakdown, aspect by aspect

Eight things you probably actually care about. Each gets a winner and the number that proves it.

| # | Aspect | Winner | The proof |
| --- | --- | --- | --- |
| 3.1 | Pricing | **Sol** | Exactly half the price, and it uses fewer words to finish. Your real gap is often 2 to 5x. |
| 3.2 | Speed | **Sol** | Sol answers in ~2.7 sec. Fable can make you wait over 2 min. |
| 3.3 | Reliability | **Sol** | The one that probably matters most for a business. Sol delivered 100% of the time. Fable failed 1 in 5 runs. |
| 3.4 | Raw intelligence | **Near-tie** | 0.982 vs 0.966 when both answered. A coin flip. Fable only pulls ahead on your hardest problems. |
| 3.5 | Creativity & writing | **Fable** | Testers call it more "strategic," but the gap is closing. Sol tied it on a design task. |
| 3.6 | Following instructions | **Sol** | Does exactly what you say, no extra flourishes. Great for volume work. |
| 3.7 | Tool & computer use | **Sol** | Clicking apps, uploading, scheduling. Sol is faster and cheaper. |
| 3.8 | Pushing back | **Fable** | Acts like a consultant. If your plan has a hole, it tells you. |

---

## 4. The proof (real tests)

Not vibes. Here's what happened when real creators ran both side by side and tracked time, cost, and pass/fail.

**Two building tests:** On a small game, Fable's version was better but cost **$14.22 vs Sol's $4.50**. On an interactive website, Fable won again, at **$19.24 vs Sol's $1.00**. That's roughly a 19x gap. Fable is better on hard builds. It is probably not 19x better.

**The big test: 260 scored calls across 53 graded contests.** 130 calls per model. Short, real tasks, the kind that maps to cold email.

- Record: **Sol 24-3** (26 ties)
- Total spend: **$16.07 vs $63.40**
- Delivery rate: **100% vs 78%**

> **The number that changes everything.** Quality got scored two ways, and the gap between them is the whole story.

| How you measure it | Sol | Fable |
| --- | --- | --- |
| When it answered (pure skill) | 0.982 | 0.966 |
| As deployed (a fail counts as zero) | 0.982 | **0.751** |

On pure skill, it's a coin flip. But 1 in 5 of Fable's runs never delivered. Count those as zeros, which is what you actually get as a paying customer, and its score drops to 0.751. Same brain, very different reliability. A model that ghosts you 1 in 5 times is probably not something you want to build your pipeline on.

**To be fair to Fable:** all 3 of its wins came on the hardest tasks, and Sol's rare misses were dumb slips. So don't read this as "Fable is worse." They're near-equal in skill, Sol just delivers every time for a quarter of the cost. A second tester (Peter Yang) agreed and added two things: Sol has closed the writing and design gap Claude used to own, and Sol is clearly better at computer use. One caveat for both: the writing got a touch worse as both chased coding. So always read your actual copy before you trust it.

---

## 5. How to use it in your business

The part you'll run your outbound on: the big idea, how it maps to a real stack, and who does which job.

### 5.1 The one idea: manager and worker

Several independent testers landed on this exact framing the same week, without talking to each other. And Anthropic publishes an official pattern that works the same way. When the people who built the model tell you not to run everything through it, you should probably listen.

| Fable, the "Manager" | Sol, the "Worker" |
| --- | --- |
| Strategy & ICP | Per-lead research |
| Positioning & angles | Writing emails at volume |
| Reviewing the output | Sorting replies |
| Diagnosing what's broken | Spam / deliverability checks |

> **Anthropic's own recipe proves it.** *Advisor pattern:* a cheaper model works and only asks Fable when it's stuck. That gets you 92% of the quality for 63% of the cost. *Orchestrator pattern:* Fable plans and hands tasks to cheaper models. That gets you 96% of the quality for 46% of the cost. Same lesson twice: use Fable to think, not to type.

### 5.2 How this maps to our stack

At our agency we already run outbound on Clay (for leads and enrichment) and Instantly or Smartlead (for sending). The models slot right in, and one tester (Brock Mesarich) built almost this exact flow live, so I'm not handing you theory. Here's how you'd wire it up:

- **Fable plans (once per campaign):** your ICP, the buying signals to target, the positioning, and 3 angles to test. A judgment call you make once, so it's worth the sharper brain.
- **Build an "email voice" skill (once):** point the model at about 25 of your past sent emails so it learns your greetings, your tone, your phrasing. Now every draft sounds like you, not like AI. This is probably the real unlock here. You build it once and reuse it forever.
- **Sol does the volume:** it pulls your leads from Clay, researches each one, and drafts personalized emails at scale using that voice profile. Into your drafts, held for your approval.
- **Fable reviews before send:** one QA pass on the batch to catch anything templated, off-claim, or spammy.

Here's how we're testing it, and how I'd tell you to test it too: take one real campaign, split it in half (Fable-written vs Sol-written, same list, same offer), and compare your actual reply rates over two weeks. That's the only test that measures the thing you get paid on.

### 5.3 Which model for which job

| The job | Use | Why |
| --- | --- | --- |
| ICP & campaign strategy | **Fable** | Judgment call, done once. Cheap to pay up here. |
| Per-lead research at volume | **Sol** | Repetitive and tool-heavy. Built for Sol. |
| Drafting 100s of emails | **Sol** | Quality gap barely shows. Cost gap is huge. |
| Subject line brainstorming | **Sol** | Both score within a point here. |
| Final QA before send | **Fable** | Manager reads the worker's output. One pass. |
| Sorting replies | **Sol** | Simple and repetitive. Don't overpay. |
| Tricky objection reply (big deal) | **Lean Fable** | Low volume, high stakes. Judgment earns its keep. |
| Follow-up sequence design | **Fable** | Strategy. The manager's job. |
| Full campaign on autopilot | **Fable plans, Sol runs** | Anthropic's Orchestrator pattern. |

---

## 6. The prompt library

Six long, ready-to-run prompts, three per model, built on each company's own prompting rules. Fill in your [brackets] and run.

### 6A. For Claude Fable 5 (the strategist)

Keep these simple. Give it the goal, the limits, and the reason, then get out of its way. It does worse when you over-script it.

**6A.1 — The 90-Day Outbound Growth Plan** *(for any founder)*

```
You're a growth advisor who has scaled B2B outbound for dozens of companies. Here's my situation and what I need.

CONTEXT (the reason, so you connect this to the right thinking):
I run [company]. We sell [what you sell] to [who you sell to], with a typical deal size of [$]. Most of our revenue today comes from [current channel]. I want cold outbound (email + LinkedIn) to become a predictable pipeline source over the next 90 days. My constraints: a team of [size], a budget of [$], and the tools I already have: [Clay, Instantly, Smartlead, CRM, etc.].

WHAT I NEED:
A 90-day outbound growth plan a lean team could actually execute, built for my specific offer, market, and constraints above, not a generic playbook. Cover: which customer segments to hit first and why, the one positioning angle that will make us stand out, the channel mix and starting volume, what to build in month 1 vs 2 vs 3, and the 3-4 numbers I should watch to know it's working.

HOW TO RESPOND:
Lead with your single strongest recommendation (the one move that matters most in the first two weeks), then the full plan. If you think my instinct about my market or channel is wrong, tell me directly and why. Give me a clear recommendation at each fork, not a menu of every option. This is a plan I'll act on, so be specific and decisive. If you need a detail I didn't give, state the assumption you're making and keep going.
```

**6A.2 — The Campaign Architect (ICP + signals + angles)** *(cold email)*

```
You're my outbound strategist. I'm about to launch a new cold-email campaign and I need the strategy nailed before we write anything, because everything downstream depends on getting this right.

CONTEXT:
We sell [offer] to [rough audience]. Our best past customers looked like [describe 1-2 if you have them]. We can pull leads and buying signals with [Clay / Apollo / your tools]. We're judged on deliverability and reply rate.

WHAT I NEED, three things:
1. The sharpest ICP for this campaign: company size, industry, the exact role/title to target, and, most important, the specific buying signals (funding, hiring, leadership change, tech adoption, product launch) that mean an account is likely shopping right now. Rank those signals by how strongly each predicts a reply.
2. The core positioning angle: the one idea that makes us the obvious answer for this ICP, phrased the way they'd actually describe their problem, not how we describe our features.
3. Three distinct messaging angles to test, each tied to a different pain or signal. Real variants, not one message dressed up three ways.

HOW TO RESPOND:
Start with the ICP segment you'd bet on first and one line on why. Then the rest. Push back if the audience I described is too broad to get a strong reply rate. A tighter segment I can truly personalize to beats a big vague list. Give me your recommendation at each step, not a menu. Don't write the emails yet. This is the blueprint the writing gets built on.
```

**6A.3 — Campaign Autopsy + Batch QA** *(cold email)*

```
You're a sales director reviewing our outbound before it goes out, and diagnosing why one campaign is underperforming. Be the person who catches the problem everyone else missed. Two jobs.

JOB 1: DIAGNOSE THE DROP.
This campaign's reply rate fell from [X%] to [Y%] over [timeframe]. Here's what I can share: [subject lines, send volume, list source, sending setup/domains, any recent changes, sample emails]. Walk through the realistic causes (deliverability and domain reputation, list quality, copy fatigue, targeting drift, timing, weak offer) and tell me which are most likely given the specifics I gave you, and the first thing you'd check to confirm it. I don't want every possible cause. I want your ranked read and where to look first.

JOB 2: QA THIS BATCH.
Here are [N] emails drafted for the next send: [paste emails]. Flag any that sound templated or generic, make a claim we can't back up, run over 75 words, bury or weaken the call to action, or would trip a spam filter. For each one you flag, give me the exact fix, not just the problem.

HOW TO RESPOND:
Lead with your headline finding for each job: the single most likely cause of the drop, and the count of emails that need fixing. Then the detail. If the batch is actually fine, say so plainly instead of inventing problems. This is a go/no-go check, so be direct.
```

### 6B. For GPT-5.6 Sol (the workhorse)

Be exact with Sol. Give it a format, a word count, and real examples of "good." It shines when you spell out the finish line.

**6B.1 — Founder Outbound Growth Audit** *(for any founder)*

```
<role>
You are a B2B outbound growth strategist. You have built and fixed cold-outbound engines for dozens of founder-led companies. You are precise, decisive, and you do not pad your answers.
</role>

<context>
Company: [what you sell, to whom, deal size]
Current pipeline source: [where revenue comes from now]
Team & tools: [team size; tools like Clay, Instantly, Smartlead, CRM]
Goal: make cold outbound a predictable pipeline channel in 90 days.
</context>

<task>
Produce a 90-day outbound growth plan tailored to the context above. Cover, in order:
1. The single highest-leverage focus for the first 2 weeks.
2. Target segments, ranked, with the reason each is likely to convert.
3. The positioning angle that sets us apart, written in the customer's language.
4. Channel mix and starting send volume.
5. A month-1 / month-2 / month-3 build sequence.
6. The 3-4 metrics to watch, with a target for each.
</task>

<rules>
- Do exactly what's asked. No sections I didn't request.
- Be specific to my context. No generic best-practices that fit any company.
- If context is missing, state the assumption you're making instead of asking me to come back.
- If two inputs contradict each other, flag it and tell me which you'd prioritize.
</rules>

<output_format>
- Open with a 2-3 sentence executive summary (the TLDR).
- Then each of the 6 items as its own short section with a bold heading.
- Keep each section tight: 3-5 sentences or up to 5 bullets. No filler.
</output_format>

<self_check>
Before finalizing, privately grade the plan on: specificity to my context, executability by a lean team, clarity of the first move, and realistic metrics. Revise until all four are strong. Do not show me this grading.
</self_check>
```

**6B.2 — Personalized Email Writer (at volume)** *(cold email)*

```
<role>
You are a senior cold-email copywriter. You write short, specific, human emails that get replies. You never use filler or AI-sounding phrases.
</role>

<context>
Our offer: [one line: what you sell and the outcome it creates].
Who we're writing to: [role / industry].
My voice profile (match it exactly): [paste your saved voice profile, or delete this line].
</context>

<task>
Write one personalized cold email for each lead in the list below. Each lead comes with a specific signal (funding, hiring, news, role). Use that signal as the hook.
</task>

<email_structure>
1. Hook (1 line): reference the lead's specific signal. No generic compliments.
2. Bridge (1 sentence): connect that signal to a problem we solve.
3. Offer (1 sentence): what we do, in plain words, no jargon.
4. CTA (1 line): a low-pressure question that's easy to say yes to.
</email_structure>

<rules>
- 50-70 words total per email. Count them.
- No "I hope this email finds you well." No em dashes. No exclamation marks.
- First name only. No "Dear."
- Every email must be specific enough that it could NOT be sent to any other lead.
- If a lead's signal is too thin to personalize honestly, write "NEEDS BETTER DATA" for that lead instead of faking it.
</rules>

<output_format>
Return a table with columns: Lead name | Subject line (under 6 words) | Email body | Word count.
</output_format>

<leads>
[paste your leads with their signals]
</leads>
```

**6B.3 — Reply Triage + Response Drafter** *(cold email)*

```
<role>
You are an SDR inbox manager. You sort replies fast and accurately, and you draft on-brand responses that move deals forward. You do exactly the task and add no commentary.
</role>

<task>
For each reply below, do two things: (1) classify it, and (2) if it needs a response, draft one.
</task>

<classification>
Give each reply exactly one label:
- INTERESTED: wants to talk or learn more
- OBJECTION: interested but pushing back (price, timing, trust, need)
- NOT INTERESTED: clear no
- OUT OF OFFICE / REFERRAL: auto-reply or "talk to [someone else]"
- WRONG PERSON
- UNSUBSCRIBE
</classification>

<response_rules>
- Draft a reply ONLY for INTERESTED and OBJECTION.
- OBJECTION: acknowledge the concern honestly, reframe the value for their situation, end with one low-pressure next step. Under 70 words.
- INTERESTED: confirm enthusiasm, propose a specific next step (a time or a quick call). Under 50 words.
- Everything else: no draft, just the label, and for referrals the name/email to redirect to.
- Match this tone: [paste voice profile, or: warm, direct, no corporate speak].
</response_rules>

<output_format>
A table: Reply # | Label | Drafted response (or blank) | One-line reason for the label.
</output_format>

<persistence>
Work through every reply before you stop. If one is ambiguous, make the most reasonable call, label it, and note the ambiguity in the reason column. Don't skip it and don't ask me to clarify.
</persistence>

<replies>
[paste replies, numbered]
</replies>
```

---

## 7. Test it on your own data

The only test that counts is one on your own leads and offer. Four you can probably run this week.

1. **The blind subject line test.** Get 20 subject lines from each model on the same prompt. Mix them, hide which is which, have 2-3 teammates pick their top 5. Count the picks.
2. **The refusal check.** Run your real cold-email prompts through Fable 10 times, on normal sales topics. Count the refusals and pointless warnings. Tells you if the filter problem hits your use case.
3. **The cost-per-campaign math.** Pick a real size (say 500 leads). Work out the token cost three ways: all Fable, all Sol, and the manager/worker split. The split usually wins by a lot.
4. **The reply-rate field test.** Split one real campaign in half (Fable-written vs Sol-written, same targeting and offer). Run two weeks, compare reply rates. The only test that measures what you get paid on.

---

*All this data was pulled from a range of expert sources, plus my own knowledge and hands-on testing with these agents. I kept it honest and un-sponsored, so use it, run it on your own numbers, and decide for yourself.*

---

> ## 🩸 Want this whole system built for you?
>
> This is what we do all day at Bleed AI: AI-powered cold outbound that books you meetings instead of making you babysit campaigns. If you'd rather have the manager-and-worker setup done for you, with your leads pulled, your emails written in your voice, and your replies handled, let's talk.
>
> **[Work with Bleed AI →](https://bleedai.com)**
