# Your Real TAM: The Places You Never Checked

*Most people quote a TAM number they Googled once. Here's how to find the one you can actually reach.*

**Status: DRAFT for human review. Not published anywhere. No Notion page created, no API called.**

---

## 1. What TAM actually means (and why your number is probably wrong)

TAM stands for Total Addressable Market. It's the total number of people or companies who could ever buy what you sell, if you had 100% of the market with no competitors and no limits.

Here's the problem. Most founders and sales teams get their TAM from a market research report. Something like "the global CRM market is worth $80 billion." That number is real, but it's useless for planning your outreach, because it tells you nothing about who those buyers are, where they live online, or how you'd ever get in front of them.

There's a second, quieter problem. Once you do get specific, most people only look in one place: LinkedIn Sales Navigator, or whatever database their current tool plugs into. That gives you a slice of your TAM, not the whole thing. The rest of your real market is sitting in directories, association member lists, review sites, government registries, and niche databases that most people never think to check.

This guide is about that second problem. Not "what is TAM" in the abstract, but where the actual companies and people are, industry by industry, with real named tools and real links.

> **This isn't just our theory.** Kenny Damian, an outbound operator we follow closely, mapped 60+ real outbound data sources his own team uses, and said most agencies he sees still live in three. That gap, 60 versus 3, is this entire guide in one sentence. ([his post](https://www.linkedin.com/posts/kenny-damian-90aba221a_we-mapped-60-outbound-data-sources-yet-activity-7457074609582972928-1wDs))
>
> Richard Illingworth, another operator in this space, put it more bluntly: *"'just pull a list from Apollo.' I've never seen a successful cold emailer that only uses Apollo."* ([his post](https://www.linkedin.com/posts/richard-illingworth_just-pull-a-list-from-apollo-ive-never-activity-7462856212989022209-_8B2)) One tool is never the whole market. That's the entire reason this guide exists.

To get there, it helps to break TAM into three layers:

- **TAM (Total Addressable Market):** everyone who could ever be a customer, worldwide, no constraints.
- **SAM (Serviceable Addressable Market):** the slice of TAM your product, geography, price point, or business model can actually serve. If you only sell in the US and your tool only works for companies under 500 employees, your SAM is a lot smaller than your TAM.
- **SOM (Serviceable Obtainable Market):** the realistic slice of SAM you can capture in a given time period, given your team size, budget, and conversion rates.

Most pitch decks stop at TAM because it's the biggest, most impressive number. Most outreach plans should start at SOM, because that's the number that tells you how many companies you need to find this month.

## 2. How to calculate the TAM you can actually reach

Here's the math, worked backward from a revenue goal, using an example. Say you need 50 new customers.

- If your close rate from sales opportunity to signed deal is 20%, you need 250 opportunities.
- If your meeting-to-opportunity rate is 30%, you need about 833 meetings.
- If your cold email reply rate is 3%, you need roughly 28,000 sends to generate those meetings.

That last number, 28,000 sends, is your real, honest SOM for this quarter. It tells you exactly how many verified contacts you need to find and reach. (Source: [Landbase, "TAM vs SAM vs SOM: How to Calculate Them for B2B"](https://www.landbase.com/blog/tam-vs-sam-vs-som-calculate-b2b-2026))

Two more numbers matter once you're building the actual list:

**Bounce rate.** If your list is bad, a chunk of those 28,000 sends never arrive. Cross-industry average bounce rate sits around 1.2%, B2B averages closer to 0.96%. Good performance is 0.25% to 0.96%, excellent is under 0.35%. Real-time-verified lists hit about 0.3% bounce and 95% inbox placement. Lists that are never cleaned can run 6.5% bounce or higher, which tanks your sender reputation and buries your future emails, even the good ones. (Source: [Cleanlist, "Email Deliverability Benchmarks 2026"](https://www.cleanlist.ai/blog/2026-02-18-email-deliverability-benchmarks-2026))

**Enrichment match rate.** This is how many of the names on your list actually come back with a working email. A single data source usually gets you 50-60% of contacts found. Stacking multiple sources (the "waterfall" approach covered in section 5) pushes that to 85-95%. In controlled tests, single-source match rates run around 62%, while multi-source stacking gets as high as 98%. (Source: [Landbase, "B2B Contact Data Accuracy Statistics"](https://www.landbase.com/blog/b2b-contact-data-accuracy-statistic))

Put together: your real reachable TAM isn't the big market-report number. It's (total names you can find across every source) x (enrichment match rate) x (1 minus bounce rate) x (your actual conversion funnel). That's the number worth planning against.

## 3. The general-purpose toolkit (works for any industry)

Before you get into industry-specific sources, here's the base layer. These work no matter what you sell.

- **Apollo.io** - a broad B2B contact and company database, around 275 million contacts and 73 million companies. Good starting point for almost any B2B search by title, company size, or industry. Just don't stop here: Kenny Damian, an operator who's built his own Apollo-scraping workflows, has a whole post on running thousands of Apollo leads on autopilot "for less than a cup of coffee," precisely because he doesn't treat Apollo's own interface as the ceiling of what's available in it. ([Apollo source](https://leadhaste.com/blog/apollo-review-2026), [Kenny Damian's post](https://www.linkedin.com/posts/kenny-damian-90aba221a_scrape-thousands-of-apollo-leads-on-autopilot-activity-7315716027349155840-j6Vh))
- **Prospeo** - 300 million-plus professional profiles, an 83% enrichment match rate, and over 30 search filters, including firmographic, technographic, and intent-signal data pulled from 15,000 Bombora topics. Strong for finding companies showing active buying signals, not just companies that exist. ([source](https://prospeo.io/s/tam-analysis))
- **Apify actors** - a marketplace of scraping tools you rent by the run. Useful ones for lead gen: "Leads Finder" (about $1.50 per 1,000 leads), HarvestAPI (pulls LinkedIn company employee lists and full profiles), Compass Google Maps Scraper (about $2.10 per 1,000 places, useful piped into a contact-details scraper), and the "B2B Lead Generation Suite" which chains Google Maps scraping, email finding, lead scoring, and cold email drafting into one pipeline. Nick Abraham built something similar and gave it away for free after seeing how much pain founders had just finding a list of accounts that actually fit their ICP. ([Apify source](https://use-apify.com/docs/best-apify-actors/best-lead-generation-actors), [Nick Abraham's post](https://www.linkedin.com/posts/nick-abraham_finding-a-list-of-perfect-fit-accounts-is-activity-7316437441081417731-M_9j))
- **Google Maps** - over 200 million businesses worldwide. Native search caps out at 120 results per area, but Apify-built scrapers bypass that cap for full-coverage local pulls. Kenny Damian gave away an entire n8n workflow that scrapes emails straight from Google Maps search queries, which is a real, working blueprint if you'd rather build this yourself than rent an Apify actor. ([Google Maps source](https://apify.com/aluminum_jam/local-business-lead-miner), [Kenny Damian's n8n workflow post](https://www.linkedin.com/posts/kenny-damian-90aba221a_giving-away-the-n8n-workflow-that-scrapes-activity-7297638417394274305-GzEE))
- **Niche directories, by traffic tier.** Not all directories are equal, and traffic data backs that up:
  - Tier 1 (highest referral value): Crunchbase (funded startups, due diligence), G2 (SaaS buyer intent), Clutch (agencies and service businesses). Median around 312 referred sessions per 90 days.
  - Tier 2: Capterra, GetApp, Software Advice (all Gartner-owned), plus Trustpilot and the Better Business Bureau. Median around 87 sessions per 90 days.
  - Tier 3: regional and curated niche directories. Lower traffic, median 24 sessions, but 4-6x higher conversion rate per session because the audience is so targeted.
  ([source](https://axzlead.com/blog/guide-b2b-lead-generation-niche-industries))

**The enrichment & intent-signal stack.** This is the layer most people never get to, because they stop at a database. We pulled this from 6,642 real posts by 11 tracked outbound operators — this is what they actually run once the base layer above stops being enough.

- **Clay** - a workflow/enrichment platform that chains multiple data sources and AI steps together instead of relying on one database. It's the single most-mentioned tool across every operator we track, all 11 of them, more than Apollo. Even Nick Abraham, who's posted about Clay workflows dozens of times, warns against over-relying on it: spending heavily on Clay credits won't grow you if it's covering for a real growth blocker elsewhere. ([his post](https://www.linkedin.com/posts/nick-abraham_so-you-have-6000-of-monthly-revenue-activity-7344703659395469312-__hz))
- **Waterfall contact-finders** (LeadMagic, FullEnrich, Icypeas, Wiza, Snov.io, Findymail, Kaspr, Lusha, LeadIQ) - each one alone caps out around the same 50-60% match rate as any single source (see section 5). Charles Tenot's team stacked several of these into one waterfall and pushed their phone-number find rate to 55%, on top of an already-stacked email waterfall. ([his post](https://www.linkedin.com/posts/charlestenot_lemlist-now-allows-you-to-find-55-of-phone-activity-7284843502989901824-QWJ7))
- **Company/contact databases beyond Apollo** (ZoomInfo, Cognism, Ocean.io) - broader or differently-sourced alternatives, useful specifically because they don't all pull from the same underlying data. OutboundPHD keeps a running list of API tools by exactly this logic: one database's blind spot is another's coverage. ([his post](https://www.linkedin.com/posts/outboundphd_an-updated-list-of-my-favorite-api-tools-activity-7452743269609984001-_L21))
- **Buying-signal / intent platforms** (RB2B, Unify, Common Room, Trigify.io, PredictLeads, Bombora, 6sense) - instead of finding companies that exist, these find companies showing an active buying signal right now (a site visitor, a job change, a new hire, a tech-stack switch). Michel Lieben's rule: only cold-email buyers who want you, using first-, second-, and third-party intent signals instead of a cold static list. ([his post](https://www.linkedin.com/posts/michel-lieben_intent-signal-platforms-activity-7359531788194521088--fUI))
- **Scraping & list-building infrastructure** (ZenRows, Serper, Instant Data Scraper, PhantomBuster, Discolike, OpenMart, Fibbler, Hypertide.io) - the tooling layer underneath most of the above, for when you're building a custom source instead of renting an existing one. Michel Lieben's own breakdown of "best tools to scrape data" walks through AI agents, LinkedIn tools, and both web scraping and crawling as distinct approaches. ([his post](https://www.linkedin.com/posts/michel-lieben_best-tools-to-scrape-data-activity-7331629357209120768-PjyT))
- **MillionVerifier** - list-cleaning and verification, the step that protects your bounce rate (section 2) once you've stacked multiple sources together. Part of the growth stack Nick Abraham's team ran while scaling Leadbird. ([his post](https://www.linkedin.com/posts/nick-abraham_every-software-we-use-while-growing-leadbird-activity-7289998174138552320-q_pD))
- **Expandi.io** - LinkedIn-native automation for outreach sourced straight from Sales Navigator searches, one layer of Michel Lieben's 5-step outbound stack (data, enrichment, intent, delivery, close). ([his post](https://www.linkedin.com/posts/michel-lieben_founder-im-overwhelmed-by-all-the-sales-activity-7316407895615561729-_FQf))

## 4. Industry-by-industry source map

Pick the section that matches who you sell to. Each one has real, named, currently-live tools.

### SaaS / software

- **Crunchbase** - best for finding funded startups and doing due diligence before you pitch (funding stage, investors, headcount). Tier-1 directory. ([source](https://axzlead.com/blog/guide-b2b-lead-generation-niche-industries))
- **G2** - SaaS buyer intent data. People actively comparing tools show up here before they ever fill out a form. ([source](https://axzlead.com/blog/guide-b2b-lead-generation-niche-industries))
- **BuiltWith** - technographic data covering 80,000+ web technologies across 673 million-plus sites. Tells you exactly what CRM, email platform, analytics stack, and ecommerce layer a company runs, which is a strong proxy for budget and buying stage. ([source](https://crustdata.com/blog/technographic-data-providers))
- **Datanyze** (now part of ZoomInfo) - lighter-weight technographic and contact data, with a Chrome extension that reveals a company's tech stack while you're browsing LinkedIn or their website. Good for smaller teams that don't need BuiltWith's full depth. ([source](https://www.wearediagram.com/blog/sales-tech-stack-analysis-hubspot-datanyze-and-builtwith))

### Agencies & professional services

- **Clutch** - the largest B2B service-provider directory, with phone-verified reviews. Free listings get little visibility; most agencies here are running paid profiles, which is itself a signal they invest in lead gen. ([source](https://www.findbestfirms.com/clutch-co-directory-alternatives))
- **UpCity** - a Clutch alternative for marketing, SEO, advertising, and IT agencies, with a Certified Partner vetting program. ([source](https://www.findbestfirms.com/clutch-co-directory-alternatives))
- **GoodFirms** - leans toward software development, mobile app development, and digital transformation firms, with a heavier focus on verified research. ([source](https://www.findbestfirms.com/clutch-co-directory-alternatives))
- **DesignRush** - the go-to directory for design, branding, and creative agencies, with a portfolio-first profile format. ([source](https://www.findbestfirms.com/clutch-co-directory-alternatives))

### E-commerce / DTC brands

- **Store Leads** (storeleads.app) - tracks 13.6 million-plus active online stores, updated weekly, with 60 search filters. You can query things like "all apparel stores on Shopify in the US selling at least 10 products." ([source](https://storeleads.app/))
- **Apify Shopify DTC Brand Discovery scraper** - finds Shopify stores and cross-references their tech stack, including whether they run Klaviyo, which is a useful signal for email/marketing-tool pitches. ([source](https://apify.com/george.the.developer/shopify-dtc-brand-discovery))
- **ScraperCity's store database** - covers Shopify, WooCommerce, Magento, Squarespace, and BigCommerce stores in one place, with direct emails, phone numbers, and app detection (Klaviyo, Recharge, Yotpo, Gorgias). ([source](https://scrapercity.com/store-leads))

### Local / brick-and-mortar businesses

- **Google Maps scrapers** (Apify) - the deepest coverage for local business discovery; see the general toolkit above for the specific actors. ([source](https://apify.com/aluminum_jam/local-business-lead-miner))
- **Yelp Fusion API** - search local businesses directly, pulling names, addresses, phone numbers, categories, and review data. Good for restaurants, retail, and local professional services. Apify has a ready-made Yelp Business Search actor if you don't want to build against the raw API yourself. ([source](https://docs.developer.yelp.com/docs/places-intro), [Apify actor](https://apify.com/renzomacar/yelp-fusion-search/api))
- **Better Business Bureau (BBB)** - a Tier-2 directory, useful for trust-conscious local categories like home services and contractors. ([source](https://axzlead.com/blog/guide-b2b-lead-generation-niche-industries))

### Recruitment / staffing

- **American Staffing Association Member Directory** - a searchable directory of staffing and recruiting firms in the US, filterable by location and service type. Useful if you're selling to staffing agencies directly. ([source](https://americanstaffing.net/asa/asa-member-directory/))
- **Hiring Intent Lead Scraper** (Apify) - flips the usual approach: instead of finding staffing firms, it finds companies with open job postings right now, which is the actual buying signal for anyone selling recruiting or staffing services. ([source](https://apify.com/samstorm/hiring-intent-lead-scraper))
- **LinkedIn Jobs Scrapers** (Apify, several variants) - pull live job postings across LinkedIn, Indeed, Glassdoor, Greenhouse, Lever, and Workable, with fields like role, salary, and company. Combine with an email finder and you have a warm, timely lead list built entirely on "we saw you're hiring." ([source](https://apify.com/curious_coder/linkedin-jobs-search-scraper))

### Real estate

- **LoopNet** - the most-visited commercial real estate marketplace, about 13 million monthly global unique visitors. Good for finding active tenants, investors, and property owners browsing listings. ([source](https://www.loopnet.com/))
- **CoStar** - a paid subscription tool that goes deeper than LoopNet's listings, with property records, lease comps, and contact details for property owners and decision-makers. The standard tool for anyone doing serious CRE prospecting. ([source](https://www.costargroup.com/about-us/brands/loopnet))
- **Multi-source real estate scrapers** (Apify) - pull deduplicated listings and agent contact data across Zillow, Realtor.com, and Redfin in one unified schema, useful for residential-side prospecting. ([source](https://apify.com/jonn/us-realestate-multisource))

### Healthcare / medical practices

- **NPPES NPI Registry** (npiregistry.cms.hhs.gov) - the free, official CMS database of every licensed healthcare provider in the US, over 7 million active records. Every provider who bills Medicare, Medicaid, or most private insurance has to be in here. Searchable online, or pull the full file, or hit their API directly. ([source](https://npiregistry.cms.hhs.gov/))
- **Apify NPI Registry scrapers** - wrap the NPPES data into a ready-to-use lead format, filterable by specialty, city, and state, with some versions adding phone and address enrichment on top. ([sources](https://apify.com/pink_comic/nppes-npi-registry), [healthcare leads variant](https://apify.com/inexhaustible_glass/npi-healthcare-leads))

### Manufacturing / industrial

- **ThomasNet** - over 500,000 North American suppliers across 75,000-plus categories, with more than 1.4 million monthly buyers using the platform to source. The default starting point for US industrial and manufacturing prospecting. ([source](https://www.thomasnet.com/))
- **Kompass** - a global directory covering 60 million-plus verified companies across 70-plus countries, with tools like EasyList for building custom company lists. Better than ThomasNet if you're prospecting outside North America. ([source](https://us.kompass.com/))
- **IndustryNet** - a US-focused industrial directory and the closest like-for-like ThomasNet alternative, with free supplier listings and a clean category structure. Worth checking as a second source since directory coverage never fully overlaps. ([source](https://manufacturingleadgeneration.com/industrial-directory-listings-lead-generation/))

### B2B financial services

- **SEC Investment Adviser Public Disclosure (IAPD)** (adviserinfo.sec.gov) - the official registry of roughly 17,000 SEC-registered Registered Investment Advisers plus tens of thousands of state-registered advisers, including firm identity, registration details, and Form ADV filings. Free and public. ([source](https://adviserinfo.sec.gov/))
- **FINRA BrokerCheck** (brokercheck.finra.org) - employment history, licenses, and certifications for individual brokers and advisors. Useful for verifying a contact before you pitch, and for building lists filtered by firm size or location. ([source](https://brokercheck.finra.org/))
- **Apify SEC IAPD scraper** - turns the IAPD database into a structured, filterable list (by AUM bracket, geography, or branch count) instead of manual lookups one firm at a time. ([source](https://apify.com/parseforge/sec-iapd-scraper))

---

## 5. How to stack sources (the waterfall)

Here's the part almost nobody does, and it's the single biggest lever in this whole guide.

One source, on its own, finds maybe 50-60% of the contacts you're looking for. That's true whether the source is Apollo, a directory, or a scraper. No single database has everyone, because no single database is built the same way twice.

The fix is a waterfall: run your list through source one, keep what it finds, then run everything it missed through source two, then source three. Each pass picks up contacts the last one couldn't find, because each source pulls from different original data. Done right, this stacking gets your combined match rate to 85-95%, versus the 50-60% ceiling of any single tool. ([source](https://www.landbase.com/blog/b2b-contact-data-accuracy-statistic))

A simple version of this for most industries:

1. **Broad pass:** Apollo or Prospeo for the widest net, filtered by industry and company size.
2. **Precision pass:** the industry-specific source from section 4 (a directory, registry, or niche scraper) to catch names the broad tool missed and to confirm the company is a real fit.
3. **Enrichment pass:** run whatever's left through a second contact-finder or waterfall enrichment tool to fill in missing emails.
4. **Clean pass:** verify the final list before sending. This is where your bounce rate gets decided. Skipping this step is the single most common way people wreck their own sender reputation.

## 6. Quick-start checklist

Do this today, not "someday":

- [ ] Pick your industry section above and open the 2-4 tool links in new tabs.
- [ ] Pull your first 100 names from the broadest source (Apollo, Prospeo, or the industry directory).
- [ ] Run those 100 through a second source to fill in missing emails. Compare your match rate before and after.
- [ ] Verify the list before you send anything. Check your bounce rate stays under 1%.
- [ ] Do the backward funnel math from section 2 with your own close rate and reply rate, so you know exactly how many names you actually need this month, not just "more."

That's the real TAM. Not the number from a slide, the number from a list you can actually build, this week, with tools that exist right now.
