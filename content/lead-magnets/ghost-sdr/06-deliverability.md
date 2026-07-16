# Stage 5: Deliverability (The Foundation Everything Sits On)

**You can write the best cold email in the world and it will earn you nothing if it lands in spam.** This is the layer nobody wants to think about and the layer that decides whether any of the previous stages matter. We treat deliverability as the foundation the whole house sits on, because a cracked foundation does not announce itself. It just quietly swallows your replies while every dashboard tells you things are fine. This stage is the make-or-break.

### Never send from your primary domain

Your main domain is where your website, your team email, and your reputation live. One cold campaign gone wrong can poison it, and you cannot un-poison a domain. So you build a sending infrastructure that is *disposable by design*:

- **Buy separate sending domains** dedicated to outbound. Never the primary.
- Put **2 to 3 mailboxes per domain.** More than that and the domain looks like a sending farm.
- **Split roughly 50/50** across Google-hosted and Microsoft-hosted mailboxes, so you are not betting everything on one provider's mood.
- Set up **full authentication: SPF, DKIM, and DMARC** on every domain. This is non-negotiable. Missing records is the fastest way to the spam folder.
- **Rotate and refresh domains every 9 to 12 months.** Sending reputation decays. Plan for replacement before you are forced into it.

### Warm up, then never stop warming

A brand-new inbox that starts blasting cold email looks exactly like a spammer, because that is the behavior of a spammer. You have to earn trust first.

- **Warm up for 14 to 30 days minimum** before the first real send.
- Treat **6-week-old inboxes as the floor** for serious volume. Older is safer.
- Keep warming **permanently**, even while campaigns run. Warmup is not a phase you finish. It is background maintenance for the life of the inbox.

> ⚠️ Microsoft flags brand-new domains for roughly the first 90 days *(directional: verify for your setup)*. If you are sending to Outlook addresses from a two-week-old domain, you are fighting a filter that is built to distrust you.

### Sending limits: scale by adding, never by pushing

The real ceiling is **about 20 to 35 emails per mailbox per day.** That is it. The instinct to push more from each inbox is the instinct that gets you burned.

- **Scale by ADDING mailboxes,** never by raising the per-inbox number.
- Pushing 50 to 60 per day can look completely fine for 2 or 3 days, then collapse. The damage is delayed, which is exactly why people keep doing it until it is too late.

> 💡 Want to double your volume? Double your inboxes, not your per-inbox send rate. Ten inboxes at 30/day beats three inboxes at 100/day every single time, and it will still be alive next month.

### Keep insurance inboxes in reserve

Inboxes get flagged. It is not an if, it is a when. If your entire sending capacity is in active use when a batch gets flagged, your campaign stalls the day you can least afford it.

- Keep **50% to 100% extra "insurance" inboxes** warming in reserve at all times.
- When some get flagged, you **swap in warm replacements the same day** instead of waiting two weeks for fresh ones to warm up.

### Guard the bounce rate

**Auto-pause any campaign at roughly 2% bounce.** Bounces are the number-one thing that flags you as a cold sender. High bounce tells the receiving servers that you scraped a list and did not verify it, which is the signature of spam. One bad list can tank a domain in a single send if nothing stops it.

### Reply rate and bounce are the ONLY trustworthy signals

This is the part that trips up almost everyone building their own system. Most of the numbers you are tempted to trust are lying to you.

- **Open tracking is dead.** After Apple Mail Privacy Protection, opens are inflated by machine pre-fetches and mean nothing. Stop optimizing against them.
- **Inbox-placement tests and warmup scores do not measure real inboxing.** They test delivery to seed addresses, not to your actual prospects. A green score is not a green inbox.

What you can actually trust:

- **Reply rate** (including out-of-office autoreplies): a rate **above ~2% is the honest floor.**
- **Bounce rate**: your early-warning smoke alarm.

If your reply rate drops **under ~1% on stable volume,** the domain is likely cooked. And here is the hard rule: **burned domains cannot be recovered.** Do not try to nurse them back. Delete and replace. Time spent reviving a dead domain is time the domain spends dragging your other sends down with it.

### Send to the MX provider in the right order

The mail server behind an address (its MX provider) changes how you should treat it.

- **Email verified Google-hosted and Microsoft-hosted addresses first.** These are the cleanest, most predictable sends.
- **Do not blend "valid" and "valid-catch-all" addresses early.** Catch-all domains accept everything, so a "valid" catch-all may not actually exist, and sending to them spikes your bounce rate right when your domain is most fragile.
- For a broad campaign, **skip domains sitting behind secure email gateways.** These gateways filter before the message ever reaches an inbox, so you burn sends against a wall you cannot see.

### The 2026 Outlook / Microsoft problem

Microsoft has become the hardest surface in cold email. A large share of cold mail to Microsoft and Outlook addresses now lands in spam. Operators report figures around **83% landing in spam** *(directional: verify for your setup)*.

Treat Microsoft as **its own, harder segment.** Do not average it in with Gmail and pretend one strategy covers both. Segment it, send to it more conservatively, and judge it on its own numbers.

### Volume fingerprinting

Past roughly **30,000 emails per month on the same copy,** content-fingerprinting systems start recognizing your message and killing sends before they land. The receiving side has seen your exact words too many times.

Mitigate it:

- Keep emails **40 to 50 words.** Less surface area to fingerprint.
- Use **genuine split-test variants**: actually different messages, not spintax. Spintax (swapping synonyms inside brackets) is a known pattern and gets detected as the trick it is.

### Content-level hygiene

The words themselves are scored now.

- **First touch in plain text with at most one link.** No signatures full of tracking, no image banners, no HTML that screams "marketing blast."
- **Kill open-tracking pixels.** They add a spam signal and, post Apple, they do not even give you real data anymore.
- **Individual spammy words get scored.** We have seen a single word swap move a stuck campaign from *zero* replies to replies within hours. Changing one word like "free" to "complimentary" was the whole fix. If a campaign is dead flat, audit the vocabulary before you rebuild anything else.

### Directional vendor benchmarks

Cite these as directional and verify against your own account:

- Gmail inbox placement **~87%** versus Microsoft **~75.6%** *(directional: verify for your setup)*.
- A real per-inbox Google ceiling around **~35/day** *(directional: verify for your setup)*.
- Sending **5,000+ emails to Gmail in a 24-hour window can permanently mark you a bulk sender** *(directional: verify for your setup)*.
- A **spam-complaint rate of 0.30% causes blocking; under 0.10% is the real target** *(directional: verify for your setup)*.

### The capacity formula

Your safe monthly volume is not a guess. It is arithmetic. Do the math before you promise yourself any number.

```
CAPACITY CALCULATOR

  warmed inboxes        = ______
  daily limit / inbox   = ______   (stay 20-35)
  sending days / month  = ______   (weekdays only, ~22)

  safe monthly volume   = inboxes  x  daily limit  x  sending days
                        = ______   x  ______       x  ______
                        = ______ emails / month

  Need more? ADD inboxes. Never raise the daily limit.
```

### Template: pre-send QA checklist

Run this before every launch. If any line is unchecked, you do not send.

```
PRE-SEND DELIVERABILITY QA

[ ] SPF, DKIM, DMARC verified on every sending domain
[ ] Sending from a SEPARATE domain (never the primary)
[ ] Inbox warmup age >= 6 weeks; warmup still running
[ ] 2-3 mailboxes per domain; ~50/50 Google / Microsoft
[ ] Insurance inboxes warming in reserve (50-100% extra)
[ ] Per-inbox send set to 20-35/day (NOT higher)
[ ] List verified; valid vs valid-catch-all SEGMENTED
[ ] Microsoft/Outlook split into its own harder segment
[ ] Bounce auto-pause armed at ~2%
[ ] First touch = plain text, ONE link max, no tracking pixel
[ ] Copy 40-50 words; genuine variants (not spintax)
[ ] Monthly volume under the 30k-per-copy fingerprint threshold
[ ] Spammy words audited (swap "free" -> "complimentary", etc.)
```

Get this stage right and everything upstream finally has a chance to work. Get it wrong and it will not matter how good your copy is, because no one will ever read it.
