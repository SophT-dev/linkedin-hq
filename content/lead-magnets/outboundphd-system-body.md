# The 8-Million-Email System

*How Eric Nowoslawski's agency sends 8M+ cold emails a month, reverse-engineered from 351 of his LinkedIn posts.*

Eric Nowoslawski (the "OutboundPhD") left Clay to build Growth Engine X, an agency that now sends **8M+ cold emails every month** and pulls numbers most people think are impossible, like **1 positive reply for every 140 leads uploaded**.

He gives the whole playbook away on LinkedIn, one post at a time. We read all 351 of them and organized his system into one place. Every play below is his. We just connected the dots. (Open each section to dig in.)

## ⚡ 1. The Philosophy: Research Beats Volume

Eric's whole approach rests on one idea:

> "The best AI strategy for your outbound emails can't be stolen from anyone's LinkedIn post. They're found by asking yourself: what would you send if you had 10 minutes to research a prospect?"

And the update that surprised his whole audience: **generic AI personalization is dead.** Sophisticated buyers recognize a scraped "I saw you help fitness coaches retain clients" first line instantly, and it hurts you. His rule now: **lead with a real signal, or don't fake one at all.**

## 🎯 2. The Signals: Who To Email

His 6 "zero-AI" targeting plays. No fancy automation, just the right filter:

1. **New-role starters.** People who just changed jobs own new problems and new budget.
2. **Name someone else.** "Let me know if this is better suited to talk to {{other name}} given their role." They confirm it's them, or they forward you to the right person.
3. **Keywords in open job posts.** Not just *that* they're hiring, but *what the posting says* about their stack and pains.
4. **Technology filtering.** Competitor-switching, integration messaging, or "they pay for something expensive, so they have budget for you."
5. **Past experience at a customer.** Clay's past-experience filter: target people who used to work at your case-study companies.
6. **Competitor traffic.** Trigify (LinkedIn engagement), ScrapeLi (company-page followers), AimLogic (people searching your competitors).

**His signature trigger:** first-time vs. second-time CEO/Founder, detected with Clay + a cheap model for **$0.0005/row**. Someone in the seat for the first time is dealing with brand-new responsibilities, and nobody else is emailing them about it. This is the play behind the 1-positive-per-140 number.

## 🤖 3. The Claygent Research Layer: Find The Angle With AI

Point AI at each prospect's website and scan for one of three things:

- a **case study** they've published,
- a **competitor** they should know about,
- **reviews** (Google / Yelp / Trustpilot / G2).

Whatever shows up strongest becomes your angle. Cost: **under $0.01 per prospect.** This is the layer that lets you send a researched email to thousands of people without a research team.

## ✍️ 4. The Copy Injection Formula

Research is worthless until it becomes one line in the email. His move, the case-study P.S.:

> "P.S. saw how you helped Intercom increase their email deliverability. Would be a great thing to promote in a newsletter shoutout with us."

The rule that governs all of it:

- **Have a signal?** Use it. Something specific and custom-scraped that ties to their problem and your offer.
- **No signal?** Treat the email like a banner ad. Put the offer in the **preview text**, make it punchy, and skip the fake first line entirely. When someone's scrolling, the subject + preview *is* your click opportunity.

## 🏗️ 5. The Engineering Stack: The Unfair Advantage

This is where Eric pulls away from every "spray and pray" agency.

- **Supabase lead cache.** Save every email you find. Check the cache *before* buying new data. Set refresh rules (30 / 90 / 180 days). His result after a few months: **23M+ valid emails cached** and massive cost savings, requerying instead of repurchasing. "Not technical? Cursor sets up the schema for you."
- **Self-improving campaigns.** A Claude Code skill reviews last week's campaigns and suggests changes based on positive reply rate. The system quietly gets better on its own.

## 📬 6. The Deliverability Fundamentals: Sending, List, Strategy

Eric boils cold email down to three things. Nail them and you win.

**Sending.** Use a real platform (Smartlead or Instantly, never MailChimp/HubSpot/private SMTPs). Send from Google or Outlook inboxes. Buy `.com` or `.co` domains from Porkbun or Dynadot (not GoDaddy). Spin up inboxes with Zapmail or Hypertide, with admin-console access. Warm them up properly. For Outlook targeting enterprise, sometimes 4-6 weeks.

**List.** Most list tools just scrape LinkedIn and guess emails. Validate hard. His chain: Prospeo, then LeadMagic, then TryKitt, then Icypeas, then a final Instantly validation.

**Strategy.** Use a proven format you can iterate weekly. Adjust template + list filters fast, usually after ~1,000 sends. **2-3 emails max** (most replies come from email one). Prioritize net-new sends over piling on follow-ups.

## 📊 7. The Numbers He's Shared

All real, pulled from his own posts:

- **1 positive reply / 140 leads** (first-time-CEO trigger)
- Claygent research **< $0.01 / prospect** · copy injection **< $0.001**
- First-time-CEO trigger: **$0.0005 / row**
- **23M+** valid emails cached in Supabase
- **8 customers** sending **25k+ emails/day**

## 🎯 8. What Kills Your Meeting Rate

From running millions of sends, the patterns that quietly murder your booked calls:

1. **Calendar link as your CTA.** Security filters and human behavior both fight it. Earn the reply first, *then* offer to book.
2. **Following up too slowly.** Speed is leverage. Reply the same day. It signals you're paying attention.
3. **Not following up enough.** If someone raised their hand once, don't stop until they book or say no. (It took 8 follow-ups to book Eric himself, as the prospect.)
4. **Empty follow-ups.** "Just checking in" is lazy. Every touch reinforces why the call matters: ROI, a case study, a new idea.
5. **Only one booking option.** Offer a specific time *and* a calendar link. Some people love Calendly, some are offended by it. Appease both.
6. **Single channel.** A reply rate isn't a meeting rate. A LinkedIn DM or quick call often carries a warm lead over the line. People book with people, not inboxes.

## 🚀 What's Next

This is the system Eric gives away piece by piece. **Bleed AI runs the whole thing done-for-you**: the signals, the AI research layer, the deliverability infrastructure, and the self-improving campaigns, so you get the OutboundPhD's results without becoming him.

*Want us to build this system for your outbound? → [booking link]*
