# Archived Resource: "10 Claude Code Marketing Workflows for Google and Meta Ads"

**Source URL:** https://www.get-ryze.ai/blog/claude-code-marketing-workflows-google-meta-ads
**Archived:** 2026-07-16
**Archive method:** Direct WebFetch (page rendered fully; no need to fall back to r.jina.ai)

> Note on this export: this is a thorough, faithful working summary rather than a raw verbatim copy-paste
> of the page's prose (to respect the source's copyright on its written article). The actual reusable
> artifacts — the exact prompts you'd paste into Claude Code — ARE preserved word-for-word in quotes below,
> since those are the functional payload of the piece. Narrative/marketing copy around them is paraphrased.

---

## Metadata
- **Title:** 10 Claude Code Marketing Workflows for Google and Meta Ads
- **Author / byline:** Angrez Aley, Senior Paid Ads Manager
- **Company:** Ryze AI (operated by Meow AI, LLC)
- **Last updated on page:** Jul 15, 2026
- **Read time:** ~18 minutes
- **Contact listed:** hello@get-ryze.ai
- **Founder LinkedIn:** none shown on the page — only the main Ryze AI site is linked. No personal founder profile found in the fetched content.

## What Ryze AI is
An AI-automation SaaS for paid ads, SEO, and landing-page optimization. Its pitch: connect Claude directly to Google Ads and Meta Ads via one-click integration (vs. the DIY Claude Code + MCP route this article teaches). Pricing starts at $40/month with a free trial. Site claims 2,000+ clients (specific ROAS/revenue/visit stats rendered as placeholder zeros on the fetched page — likely dynamic counters that didn't populate for the fetch).

## Framing / thesis
The article's core claim: most paid-media work is data-shuffling (pulling reports, formatting spreadsheets, comparing metrics) that eats hours per account per week, and Claude Code (Anthropic's terminal-based coding agent) can automate it without the operator needing to know how to code.

Two paths are offered:
1. **Manual setup with Claude Code** — install it yourself, wire up Google/Meta API credentials, write prompts, schedule with cron. ~30–60 min setup, free (beyond Claude subscription/API cost).
2. **Ryze AI direct integration** — sign up, connect ad accounts in one click, query/edit campaigns straight from Claude's interface. From $40/mo. (This is the vendor's own product, positioned as the low-friction alternative to everything below.)

---

## Pre-Workflow Setup (Mac-specific instructions given on page)

1. **Install VS Code** — download from code.visualstudio.com, unzip, drag into Applications.
2. **Open the built-in terminal** — Terminal > New Terminal inside VS Code.
3. **Install Claude Code** by running:
   ```
   curl -fsSL https://claude.ai/install.sh | bash
   ```
   Requires a paid Claude subscription (Pro/Max) or API credits. Run `claude` after install and authenticate via the browser prompt.
4. **Install the VS Code extension** — Cmd+Shift+X, search "Claude Code," install Anthropic's official one (adds a Spark icon to the sidebar).
5. **Connect ad platform APIs via MCP** — two routes:
   - *Ryze's route*: book a setup call, get a personal MCP link, tell Claude Code "Add an MCP server with URL [link]."
   - *Open-source route*: Google Ads via `github.com/cohnen/mcp-google-ads`; Meta Ads via `npx -y meta-ads-mcp`. Verify with `/mcp`.
6. **Create a project folder** (e.g. "ad-scripts"), open it in VS Code, launch the terminal, run `claude`.

---

## The 10 Workflows

Each entry below: purpose, the exact prompt(s) the article gives to paste into Claude Code, and the article's caveats.

### 1. Full Account Audits
**Purpose:** Pull campaign structure/spend/performance across Google + Meta; flag zero-conversion spend, zero-click impressions, bid-strategy misalignment, budget-allocation issues.

**Prompts (verbatim):**
> "Write a Python script that connects to the Google Ads API using my credentials. Pull all active campaigns for the last 30 days. For each campaign, get: name, status, bid strategy, spend, impressions, clicks, conversions, and ROAS. Flag any campaign with zero conversions and spend over $100. Flag any campaign with impressions but zero clicks. Output the results as a CSV and print a summary of flagged issues."

Follow-up to add Meta: > "Now add a second section that does the same thing for Meta Ads using the Facebook Business SDK. Pull campaign-level data for the same 30-day window. Same metrics, same flags. Combine both into one CSV with a 'platform' column."

Client formatting follow-up: > "Format the flagged issues as a bullet-point summary at the top of the CSV, with the raw data below."

**Caveats:** API credential setup (dev token, client ID/secret, customer ID, refresh token) is the hardest part. Google Ads reporting lags hours — run after 10am. Surfaces structural issues, not strategic ones.

---

### 2. Automated Weekly Reports
**Purpose:** Pull prior week's Google + Meta performance, build week-over-week comparison tables (spend, clicks, conversions, CPA, ROAS), auto-deliver every Monday.

**Prompt (verbatim):**
> "Write a Python script that pulls last week's campaign performance data from Google Ads and Meta Ads. For each campaign, get: spend, impressions, clicks, conversions, CPA, and ROAS. Also pull the same metrics for the week before that. Calculate the percentage change for each metric week-over-week. Format the results as an HTML email table. Send the email via SMTP to [your email]."

Highlights follow-up: > "Add a section at the top of the email that lists the top 3 campaigns by ROAS improvement and the bottom 3 by ROAS decline. Write each as a plain sentence, not a table row."

Scheduling follow-up: > "How do I set up a cron job to run this script every Monday at 7am?"

Uses pandas for merge/calc, smtplib for email. Gmail SMTP needs an App Password (myaccount.google.com > Security > 2-Step Verification > App Passwords).

**Caveats:** Meta Insights API may timeout on large accounts (switch to async report requests). Needs consistent weekly runs for the comparison to mean anything.

---

### 3. Budget Pacing and Forecasting
**Purpose:** Track daily spend vs. monthly budget targets, project end-of-month delivery, alert if pacing >15% over/under.

Requires a `budgets.csv` (columns: account_name, monthly_budget, platform).

**Prompt (verbatim):**
> "Write a Python script that reads budgets.csv, then for each account pulls month-to-date spend from the appropriate API (Google Ads or Meta Ads). Calculate projected end-of-month spend using: (actual spend / days elapsed) × total days in month. If projected spend is more than 115% or less than 85% of the monthly budget, send an email alert with the account name, current spend, projected spend, and the variance percentage."

Dashboard follow-up: > "Also output a CSV with all accounts showing: account name, monthly budget, spend to date, projected spend, pacing status (over/under/on track), and variance percentage."

Scheduling: "Set this up as a daily cron job that runs at 10am."

**Caveats:** Linear-spend projection is noisy in days 1–7, stabilizes ~day 10. Run after 10am for complete prior-day data. Keep budgets.csv current.

---

### 4. Creative Performance Breakdowns
**Purpose:** Ad-level data from Meta + Google, ranked by ROAS/CTR/CPA, grouped by format and creative angle.

Precondition: ad names must encode angle + format, e.g. `testimonial_video_30off_v2` or `ugc_carousel_freetrial_v1`.

**Prompt (verbatim):**
> "Write a Python script that pulls ad-level data from Meta Ads for the last 30 days. For each ad, get: ad name, ad set name, spend, impressions, link clicks, purchases, purchase value. Calculate ROAS (purchase value / spend) and CTR (link clicks / impressions). Parse the ad name to extract the creative angle (first segment before underscore) and format type (second segment). Group results by angle and by format. Show average ROAS and total spend for each group. Sort by ROAS descending. Output as CSV."

Google follow-up: > "Add a section that pulls Google Ads responsive search ad asset performance. Show which headlines and descriptions have the best click-through rates."

Client version: > "Format the top 5 and bottom 5 ads as a summary email with the creative angle, format, ROAS, and spend."

**Caveats:** Skip grouping if naming isn't standardized. Specify attribution window explicitly (Meta defaults to 7-day click/1-day view). Google's asset-level "performance" is relative labels, not exact ROAS.

---

### 5. Cross-Channel Attribution Checks
**Purpose:** Compare Google+Meta reported conversions against a third-party source (GA4/CRM/Shopify) to catch double-counting.

Requires `actual_conversions.csv` (date, total_conversions).

**Prompt (verbatim):**
> "Write a Python script that pulls conversion counts from Google Ads and Meta Ads for the last 30 days, by day. Also read actual_conversions.csv which has date and total_conversions columns. For each day, compare the sum of Google + Meta reported conversions against actual conversions. Calculate an inflation ratio (reported / actual). Flag any day where the ratio exceeds 1.3. Also calculate the 30-day average inflation ratio. Output as CSV and email a summary if the average ratio exceeds 1.3."

Trend follow-up: > "Add a column showing rolling 7-day average inflation ratio so I can see if the gap is growing or shrinking."

**Caveats:** Platform vs. actual conversions never match exactly (different attribution/measurement windows) — goal is catching inflation big enough to distort decisions. Run monthly, not weekly, for volume.

---

### 6. Audience Overlap Detection
**Purpose:** Pull Meta ad set targeting specs, find pairs with shared interests/lookalike seeds/custom audiences → self-competition risk.

**Prompt (verbatim):**
> "Write a Python script that pulls all active ad sets from my Meta Ads account. For each ad set, get the targeting spec including interests, behaviors, custom audiences, and lookalike specs. Compare every pair of ad sets. Flag any pair that shares more than 50% of the same interest targets, or uses the same lookalike seed audience, or targets the same custom audience. Output the flagged pairs with both ad set names, the overlap type, and the combined spend."

Prioritization follow-up: > "Sort the flagged pairs by combined spend descending, so I see the most expensive overlaps first."

**Caveats:** Doesn't apply to Advantage+ campaigns (Meta auto-selects audience). Best for interest/lookalike-based targeting. Overlap is inferred from targeting inputs, not real auction behavior, but still a reliable signal.

---

### 7. Search Term Mining and Negative Keyword Lists
**Purpose:** Find high-spend/zero-conversion search terms (waste → negative keyword candidates) and converting terms missing from the explicit keyword list.

**Prompt (verbatim):**
> "Write a Python script that pulls the search term report from Google Ads for the last 60 days. For each search term, get: search term, campaign, ad group, impressions, clicks, spend, and conversions. Filter for terms with spend over $50 and zero conversions. Count the most common words across those terms and group them. Output two things: a list of suggested negative keywords sorted by total wasted spend, and a list of converting search terms that don't match any existing keyword in their ad group. Save both as CSVs."

Threshold tweak: > "Change the spend threshold to $30 and also flag terms with spend over $100 and ROAS below 0.5."

Automation follow-up: > "Add a function that takes a list of negative keywords from a CSV and adds them to the specified campaign as campaign-level negatives via the API."

**Caveats:** Google masks a chunk of search terms for privacy — works with visible data only. Tune spend threshold to CPC ($20+/click sectors need lower thresholds; ecommerce $1–2 CPC needs higher). Run biweekly (monthly misses waste, weekly is overkill).

---

### 8. Landing Page and Tracking QA
**Purpose:** Check every active campaign's final URL for broken links and verify GTM/Meta pixel presence in page HTML.

**Prompt (verbatim):**
> "Write a Python script that pulls all unique final URLs from active Google Ads campaigns. For each URL, make an HTTP GET request and check the status code. Flag any URL that returns a 404, 500, or takes more than 10 seconds to respond. Also check if the HTML response contains 'gtag' or 'G-' (Google tag) and 'fbq' (Meta pixel). Output a CSV with columns: URL, status code, has_google_tag, has_meta_pixel, campaign_name. Flag any URL missing either tag. Add a 1-second delay between requests to avoid hammering the server."

UTM follow-up: > "Also check if each URL contains utm_source, utm_medium, and utm_campaign parameters. Flag any URL missing UTMs."

**Caveats:** Pages that load tracking via async JS/tag managers can false-flag as "missing pixel" since the script only inspects raw HTML, not rendered DOM — manually verify GTM-loaded pixels if this happens (article says rare in practice). Schedule weekly.

---

### 9. Competitor Ad Monitoring
**Purpose:** Pull competitor active ads from the Meta Ad Library API, store in local SQLite DB, send weekly digest of new/stopped ads + messaging patterns.

Requires a `competitors.csv` (competitor_name, page_id — found via facebook.com/ads/library).

**Prompt (verbatim):**
> "Write a Python script that reads competitors.csv, then for each competitor queries the Meta Ad Library API for all active ads. Store the results in a local SQLite database with columns: competitor, ad_id, creative_body, creative_link_title, start_date, pulled_date. Each week, compare the current pull against last week's data. Identify new ads (ad_ids not in last week's pull) and stopped ads (ad_ids in last week's pull but not this week's). Email a digest with new ads and stopped ads grouped by competitor."

Pattern-analysis follow-up: > "Add a section to the digest that lists the most common words and phrases across all new ads this week."

**Caveats:** Ad Library API is public but has no performance metrics (shows what's running, not what's working). Rate limits kick in past ~20 competitors. No equivalent public API exists for Google search ads.

---

### 10. Anomaly Detection and Alerting
**Purpose:** Compare yesterday's campaign metrics against a trailing 7-day average; flag >2 standard-deviation moves in spend/CTR/CPA/conversion rate; same-day alert.

**Prompt (verbatim):**
> "Write a Python script that pulls yesterday's performance data for all active campaigns on Google Ads and Meta Ads. For each campaign, also pull daily data for the prior 7 days. Calculate the mean and standard deviation of spend, CTR, CPA, and conversion rate over those 7 days. If yesterday's value for any metric is more than 2 standard deviations from the mean, flag it. Only flag campaigns with average daily spend above $20 (to avoid noise from low-volume campaigns). Email a summary of all flagged campaigns with: campaign name, platform, metric, yesterday's value, 7-day average, and how many standard deviations off."

Tuning notes: raise threshold to 2.5 for noisier accounts, lower to 1.5 for tighter monitoring.

False-positive reduction: > "Ignore any flag where the absolute dollar difference in spend is less than $10, even if the standard deviation threshold is exceeded."

**Caveats:** Seasonal spikes/flash sales/promos will false-alarm — raise the threshold or disable during known promo windows. Typically surfaces broken tracking, CPC spikes, or conversion drops within 24 hours.

---

## Best Practices section (paraphrased)
1. **Be specific in prompts.** "Build a reporting tool" fails; specifying data sources, metrics, and filter logic gets working code on the first pass.
2. **Iterate.** First output is roughly 80% right — paste errors back to Claude Code, it fixes them; usually clean by the 3rd pass.
3. **Start with the easy ones.** Workflow 3 (budget pacing) or Workflow 8 (landing page QA) have the fewest dependencies — build confidence before tackling audits/attribution.
4. **One project folder for everything** — Claude Code can reference/modify existing scripts when they're centralized.
5. **You learn by watching.** Claude Code narrates its logic as it writes code; over weeks you pick up API calls, DataFrame ops, pagination.
6. **Test manually before you cron it.** Run by hand several times, confirm output and alerting fire correctly, only then automate.

## Related links referenced on page (internal Ryze blog, not fetched)
- "Meta Ads pricing" — /blog/meta-ads-management-cost-pricing-guide-2026
- "9 Claude Workflows For Google And Meta Ads"
- "Claude Code Loops Google Meta Ads"
- "30 Claude Skills for Google and Meta Ads"
- "Claude Fable 5 For Google And Meta Ads" (Fable = Claude persona/skin name; suggests Ryze has a separate article per Claude release)
- "Meta Ads Cli With Claude Code"

## Sourcing confidence
Fetched directly (no r.jina.ai fallback needed — page returned full content on first WebFetch). Content appears complete: intro, setup, all 10 workflows with prompts/cautions, best practices, and footer resource links were all present.
