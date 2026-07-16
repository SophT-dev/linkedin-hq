# Stage 2: Research Every Prospect Without a Research Team

**You do not need a room full of SDRs to research thousands of prospects.** You need a system that spends money only where it earns a reply. Stage 2 is that system. The signals from Stage 1 told you *who* to contact and *why*. Now you gather just enough data to write a relevant email, and not one dollar more. The single most expensive mistake in cold outreach is over-researching people who were never going to convert. We are going to make that mistake impossible.

### The data-minimum ladder

Start by asking the only question that matters: what is the *bare minimum* I need to hit send?

1. **A deliverable email.** No email, no campaign. This is the floor.
2. **Confidence it is the right segment.** The signal already gave you this. If it did not, go back to Stage 1.

That is the minimum viable send. Everything above it is optional and must be earned by the campaign:

- **+ Name**: climb here when your copy opens with a personal address.
- **+ Person or company detail**: climb here only when a specific line in your email needs it.

> 📌 The discipline is knowing when to *stop climbing*. Each rung costs money and time. If the email reads as relevant without the next data point, you are done. Over-enrichment is not thoroughness, it is waste dressed up as effort.

### Free-fields-first

Before you pay for any new data step, look at what the previous step already handed you for free. Enrichment tools routinely return far more than the one field you asked for. A contact lookup often includes title, company size, location, and social links in the same response you already paid for.

The habit: **read the full payload of every step before buying the next one.** You will find that a large share of "we need to enrich this" moments were already solved by data sitting unused in the last response.

### The waterfall concept

No single data source has everyone. This is the fact that governs the whole stage. So you do not pick one provider and accept its gaps. You run a **waterfall**, cheapest source first.

1. Run the full list through **source 1**. Keep the hits.
2. Run only the **misses** through **source 2**. Keep those hits.
3. Run the remaining misses through **source 3**.

The economics are strong. A single source typically finds **50 to 60%** of contacts (in our testing, around **62%**). Stacking 2 to 3 sources in a waterfall gets you to **85 to 95%**, and a well-tuned stack reaches roughly **98%** *(directional: verify for your setup)*. You pay the expensive sources only on the shrinking pool of misses, so coverage climbs while cost per found contact stays low.

> 💡 Cheapest-first ordering is the entire trick. If you run the expensive source first, you pay premium prices for contacts a cheap source would have found anyway.

### The catch-all trap

Here is the quiet killer of deliverability. Between **30 and 50%** of B2B email lists are **catch-all domains**: servers configured to accept mail to any address, real or not. They will happily say "yes, that inbox exists" and then bounce the message later. Catch-alls bounce roughly **27x more** than verified addresses *(directional: verify for your setup)*.

The trap is that SMTP verifiers return **"OK" to everything** on a catch-all domain, because the server never refuses anyone. So "valid" from a verifier is *not* proof the person exists.

> ⚠️ Do not treat catch-all "valid" results as safe. Segment catch-alls into their own bucket, send to them at lower volume or on a separate warmed infrastructure, and never let them ride with your verified list. One catch-all-heavy batch can drag an entire domain's reputation down.

### Cherry-pick vs bulk

Not every prospect deserves the same research budget. Split your list in two:

- **Bulk**: the majority. A cheap, AI-written line based on the signal and the free fields you already have. Fast, low cost, good enough to earn a reply from a well-targeted list.
- **Cherry-pick**: a small set of genuinely high-value accounts. Here you spend on deep research: read their content, their site, their public moves, and write by hand.

The mistake is doing cherry-pick research on the whole list. You will burn your budget before you finish and never send. Reserve deep work for the accounts where a single closed deal pays for the effort many times over.

### The numbers that keep you honest

- **Enrichment budget rule of thumb:** keep total enrichment spend at or under about **2% of deal value** *(directional: verify for your setup)*. If a deal is worth a few thousand, a few tens of dollars of research is sane. Anything approaching the deal value means you are researching your way to a loss.
- **Cheap AI personalization** runs **cents per lead**. **Deep research** costs roughly **10 to 30x** more *(directional: verify for your setup)*. That multiplier is exactly why you split bulk from cherry-pick.
- **Verifier and finder costs** sit in the **low single-dollar-per-1,000** range *(directional: verify for your setup)*. Cheap enough that skipping verification to save money is never the right call.

### Template: Enrichment Cost Worksheet

Run the math before you spend, not after. Fill this in for each source in your waterfall, then sum it.

```
ENRICHMENT COST WORKSHEET

Leads in ______        Deal value $ ______     Budget cap (2%): $ ______

Waterfall (cheapest first):
| Source | Leads sent | Match rate | Cost / lead | Hits | Step cost |
|--------|-----------|-----------|-------------|------|-----------|
| 1      |           |     %     | $           |      | $         |
| 2 (misses only) |     |     %     | $           |      | $         |
| 3 (misses only) |     |     %     | $           |      | $         |
                                        TOTAL FOUND: ____ ( __%)
                                        TOTAL COST:  $ ____  (cap? Y/N)

DATA-MINIMUM CHECKLIST (stop at the last box the campaign needs):
[ ] Deliverable email        <- floor, required
[ ] Right-segment confidence <- from Stage 1 signal
[ ] Name                     <- only if copy addresses them
[ ] Person / company detail  <- only if a specific line uses it
[ ] Catch-all segmented out and flagged
```

When total cost lands under your 2% cap and every prospect clears the data-minimum checklist without over-climbing, Stage 2 is done. You now have a clean, deliverable, right-sized list ready for the writing stage.
