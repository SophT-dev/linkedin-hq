# The Cold Email Prompt Library

*The 11 copy-paste prompts we actually run to go from a blank ICP to a booked call, without the AI-sounding tells that get you deleted.*

A good AI model is only as good as the instruction you hand it. Most people open Claude, type "write me a cold email," and get back the grey mush every prospect has learned to ignore. "I hope this finds you well." "I came across your company." The tool is not the problem. The prompt is.

Below are the eleven prompts our team leans on for real campaigns, in the order you'd use them, from defining who to email to sorting the replies. Here's what you're getting:

- ✅ 11 battle-tested prompt blocks, copy-paste ready, no setup
- ✅ An opener prompt with hard anti-AI-tell rules baked in
- ✅ A "skeptic mode" prompt that pressure-tests your list before you waste sends
- ✅ A spam-language audit so your good emails land in the inbox
- ✅ A reply classifier that sorts your inbox for you
- ✅ One chaining trick that makes each prompt smarter than the last

Fill in the parts in [BRACKETS], paste, and go.

**One note before you start: chain them.** Run these in the same Claude chat with web search on. Prompt 2 remembers the ICP from prompt 1, and prompt 3 writes an opener from the "why now" prompt 2 dug up. Context carried down the chain beats eleven prompts run cold in eleven fresh tabs.

---

## 1. Build your ICP from a website

**What it's for:** You know roughly who you sell to, and "roughly" is why your reply rate is low. This turns your website into a sharp, filterable profile every later prompt aims at.

```text
You are a B2B outbound strategist. Read this website: [PASTE URL]

From what they sell and to whom, build an Ideal Customer Profile I can filter a
real list on. Give me:
1. The single job title most likely to feel this pain and hold budget
2. 2 backup titles worth testing
3. Company size, industry, and region where this lands hardest
4. 3 firmographic filters (funding, headcount growth, tech stack, etc.)
5. 3 buying triggers that mean "this company needs us right now"
6. Who this is NOT for, so I don't waste sends

Real filters I can type into Apollo or Clay, no "decision makers" or
"growing companies."
```

**Tip:** Run this on a competitor's site too. Their audience is already educated and unhappy, which is the warmest list you can build.

## 2. Find the per-account "why now"

**What it's for:** Reply rates die at the list stage, not the copy stage. A perfect email to a company with no reason to care still gets ignored. This finds the recent reason this account should hear from you now.

```text
Research this company and find me a real "why now": [COMPANY NAME + URL]

Look for anything recent and specific: a relevant new hire, a funding round, a
product launch, a telling job posting, a press mention, a review theme. Use web
search.

Return the 2 strongest signals, each with its source link and one line on why
they'd care about [WHAT WE SELL] now. If there's no real signal, say so. Do not
invent one.
```

**Tip:** The "do not invent one" line matters. A fabricated signal ("I saw you're scaling") is worse than none, because sharp buyers spot it instantly. No signal? Move that account to a lower-effort batch.

## 3. Draft the opener (anti-AI-tell rules on)

**What it's for:** The first line decides whether the rest gets read. This writes openers that sound like a person who did their homework, not a template with a merge field.

```text
Write me 3 cold email openers for this prospect.

Prospect + signal: [PASTE THE "WHY NOW" FROM PROMPT 2]
What we do: [ONE PLAIN SENTENCE]

Hard rules:
- Under 60 words total
- Lead with THEM, not us. First line is about their world, never "I'm..."
- No "hope this finds you well," no "I came across," no "quick question"
- No em dashes, no exclamation marks, plain words
- End with one low-friction ask, not a call request
- 3 genuinely different angles, not 3 rewordings. Sound like a peer, not a vendor
```

**Tip:** Read all three out loud. The one you'd send to a friend wins. If they all still sound like AI, run them back through and ask Claude to strip every AI tell.

## 4. Design a low-friction offer

**What it's for:** Most first emails ask a stranger for 30 minutes, a big yes. This designs the small yes, the 60-second thing they can agree to without a meeting.

```text
My first-email ask is currently "[YOUR CURRENT CTA]." It's too heavy.

Give me 5 lower-friction offers a cold prospect could say yes to in 60 seconds,
ranked easiest to hardest. Think teardown, benchmark, audit, useful resource, or
a one-line question they can answer from their phone.

For each, write the one-line CTA as it would appear at the email's end. Match
them to [WHAT WE SELL] so the yes leads naturally to us.
```

**Tip:** The best CTA gives value before it asks for any. "Want the 3 things I'd change on your sequence?" outpulls "Do you have 15 minutes?" almost every time.

## 5. Generate follow-up angles

**What it's for:** Most follow-ups are "just bumping this up," which adds nothing. This gives each follow-up a fresh, standalone reason to exist.

```text
Here's my first email: [PASTE EMAIL]

Write me a 3-step follow-up sequence. Each message must:
- Stand on its own, readable even if they never saw the first
- Add a NEW angle: a new proof point, a different pain, a relevant resource
- Never say "just following up," "bumping this," or "circling back"
- Stay under 50 words, shorter each time

Space them so the last one is a soft, graceful exit that leaves the door open.
```

**Tip:** Make the last message easy to say "not now" to. A clean "I'll get out of your inbox, want me to check back next quarter?" often gets the reply the pushy ones never did.

## 6. Decode and reply to objections

**What it's for:** "Too expensive" rarely means the price. This reads the real objection under the words and writes a reply that answers it without getting defensive.

```text
A prospect replied with this: [PASTE THEIR REPLY]

First, name the REAL objection underneath ("too expensive" often means "I don't
see the value yet," "no time" means "not a priority yet").

Then write a reply that:
- Acknowledges their point without arguing
- Answers the real objection, not the surface one
- Adds one relevant proof point or reframe
- Ends with a soft question, never a hard close
- Stays under 60 words and sounds human
```

**Tip:** Always end on the question. A statement closes the thread; an easy-to-answer question keeps it open, which is the only job a reply has.

## 7. Pressure-test the list (skeptic mode)

**What it's for:** Before you spend sends on a list, have Claude try to tear it apart. Cheapest quality check in outbound, and almost nobody does it.

```text
You are a skeptical outbound expert who has seen a thousand campaigns flop.

Here is my target list definition: [PASTE YOUR ICP + FILTERS FROM PROMPT 1]

Attack it. Tell me:
- Where this list is too broad and will burn sends on wrong-fit accounts
- Which filter is doing the least work and should be tightened
- What signal I'm missing that would make this list 2x more relevant
- One reason a company matching these filters might still be a bad fit

Be blunt. I'd rather fix it now than after 2,000 emails get ignored.
```

**Tip:** Run this the moment your list "feels done." The point is to catch the lazy filter ("all SaaS companies") before it costs you a sender reputation, not after.

## 8. Write subject lines that get opened

**What it's for:** The best email doesn't matter if the subject line looks like an ad. This writes subject lines that read like a note from someone they know.

```text
Write me 10 subject lines for this email: [PASTE EMAIL]

Rules:
- 1 to 4 words, lowercase where natural
- Sound like an internal note or a real person, not a marketing campaign
- No ALL CAPS, no "re:", no emojis, no "quick question," no fake urgency
- Curiosity is fine, clickbait is not. 3 should reference the prospect's world

Rank them by how likely a busy exec is to open on a phone.
```

**Tip:** Shorter almost always wins on mobile, where most first-opens happen. A two-word lowercase subject reads like a colleague, and colleagues get opened.

## 9. Run a spam-language audit

**What it's for:** Some words tank deliverability before a human sees the email. This scans your copy for the language filters hate and the phrases prospects skip.

```text
Audit this email for anything that hurts deliverability or reads as spam:
[PASTE EMAIL]

Flag:
- Spam-trigger words (free, guarantee, act now, limited time, etc.)
- Links, attachments, or image-heavy patterns that raise spam scores
- Salesy filler that trains the reader to skim (synergy, revolutionary, cutting-edge)
- Anything that reads as mass-sent rather than one-to-one

For each flag, give the cleaner replacement, then rewrite the full email with
every fix applied, keeping my meaning and voice.
```

**Tip:** Do this pass last, after the copy is final. It's cleanup, not writing, and running it too early makes Claude write cautious, lifeless emails.

## 10. Classify your replies

**What it's for:** A full inbox only helps if you know what to do with each message. This sorts replies so you spend your morning on the ones that matter.

```text
Classify each of these cold email replies into one bucket:
INTERESTED (wants to talk or learn more)
NOT YET (open but bad timing)
OBJECTION (a specific concern to answer)
NOT A FIT / NO (polite or hard no)
REFERRAL (points you to someone else)
AUTO / OOO (out of office, auto-reply)

Replies:
[PASTE REPLIES, ONE PER LINE]

For each, give the bucket, a one-line reason, and the single next action I should
take. Flag any that need a same-day human reply.
```

**Tip:** Feed the INTERESTED and OBJECTION ones straight into prompts 4 and 6. That's the chaining payoff: your inbox routes itself into the next prompt.

## 11. Turn a case study into a proof line

**What it's for:** A wall of case-study text is useless inside a cold email. This compresses a real win into one specific, believable line you can drop into any message.

```text
Here's a client result: [PASTE THE CASE STUDY OR THE RAW NUMBERS]

Turn it into 3 one-line proof points I can use in cold emails. Each must:
- Lead with the specific number or outcome, not our name
- Be believable, no rounding up into hype
- Fit naturally mid-email, not read like a testimonial
- Name the client's world (industry, size) so the reader sees themselves

Give me one short version (under 15 words) and one that adds the "how."
```

**Tip:** Specific, slightly odd numbers beat round ones. "Booked 11 meetings in 3 weeks" is believed; "doubled their pipeline" is not, because everyone claims it.

---

Claude gets you 80 to 90 percent of the way. Your judgment covers the rest, and that's the part that matters. Before any email goes out, run one last pass to kill the AI tells: em dashes, "I hope this finds you well," and words like leverage, seamless, and unlock. Then read it aloud. If it sounds like an email, rewrite it. If it sounds like a message a real person would send, send it. Precision over volume, every time. That's the whole system.
