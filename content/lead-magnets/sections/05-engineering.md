# 🏗️ 5. The Engineering Stack

This is where Eric separates himself from every other cold-email operator. He does not just run campaigns — he **codes the infrastructure underneath them.** Using Cursor and Claude Code, he has replaced CSV drudgery and "spreadsheet warfare" with automated systems that refill lists, rotate domains, and improve themselves. Here are the workflows in his own words, with the tools that power each.

### The Supabase email cache — stop re-buying data

His most-repeated infrastructure opinion:

> "Controversial opinion: Every agency should be using **Supabase** (or similar) to cache data."

The workflow is simple and compounding:

1. **Every email you find gets saved** to Supabase.
2. **Before buying new data, check the cache** first.
3. Set **refresh rules — 30 days, 90 days, 180 days** — so stale rows get re-validated.

The result after a few months: "23M+ valid emails cached... Constantly requerying instead of repurchasing... Massive cost savings." And for the "I'm not technical" objection, he leans on **Cursor** to "set up your schema, create indexes, handle the queries."

### The automated lead-refill pipeline (Clay + Supabase at scale)

> 📌 Proof: This isn't theory — it runs in production. As Eric put it: "We have 8 customers sending over 25k emails per day (one of them sending over 100k per day). Here's how we keep their campaigns full of leads completely automatically with Clay and Supabase." That 100k/day client pulls "about 125ish leads per day" against a TAM of "6M people," and he was mid-processing "1.8M leads for a client right now."

To keep those 8 customers full of leads, CSVs won't cut it — "We tried and epically failed." His scaled workflow:

1. Pull the entire company **TAM into Clay**, splitting searches to stay under Clay's **50k threshold**.
2. **Stage the company list in Supabase.**
3. A Supabase **edge function runs every day at 2am**, feeding companies back into Clay to find contacts; auto-deleting tables keep him under the row limit.
4. Found contacts flow to another table for **enrichment, qualification, AI message writing**, then drop into a **Smartlead** campaign.
5. He manages the whole thing from **Clickup**, with analytics forecasting when each client's TAM needs refreshing.

A related Black Friday version: "One form submission kicks off the workflow from Clickup," finds qualifying companies from the internal database or RapidAPI/Apify scrapers, checks the cache to avoid re-buying, and "every morning at 2am, it auto-sends contacts to refuel campaigns... All hosted on **Railway** and built by **Cursor**."

### The domain-rotation system (Cursor + Railway)

Deliverability used to mean a Friday "python script" and manual "spreadsheet warfare." He systematized it:

- Every domain is marked **Active, Insurance, or Cancel** in Supabase.
- He keeps **at least 50% of Active daily sending volume in Insurance** so domains can always rotate.
- His **"Preview Global Rebatch"** runs every Friday and Slacks him each customer's send goal, active domains, and what to cancel or buy.

> "I hit accept and not only does it change all the statuses in our Supabase, it also pulls all of our customer's campaigns and swaps out the old domains for new domains."

His "Things I've built in 39 days of **Claude Code**" post extends this: cron jobs to turn on warmup, daily spam tests, and flagging domains with "a crazy bounce rate."

### Prompt caching — the cost hack

A non-obvious lever: structure prompts so they cache. "Cached inputs save 50% on input tokens for GPT-4o mini, and 90% on GPT-4 when the input stays the same." The rule — "Put everything that changes at the very bottom of your prompt," keeping instructions and examples identical up top.

### The self-improving repo (29 Claude skills)

His most ambitious build:

> "I put 29 Claude skills into this repository so anyone can launch a cold email campaign automatically that ALSO self improves."

It scrapes your website for case studies, **asks 12 questions to lock in your ICP**, checks your infrastructure (buying domains on Dynadot/Zapmail and setting them up on Smartlead), builds lists via Prospeo, Google Maps, or DiscoLike — and includes a skill that "analyzes all your campaigns in the past week and suggests changes and improvements based on positive reply rate."

> 💡 Don't just run cold email — engineer it: cache every email in Supabase, automate refills and domain rotation with Cursor + Railway, and build skills that grade last week's campaigns for you.
