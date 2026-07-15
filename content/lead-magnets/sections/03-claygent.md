# 🤖 3. The Claygent Research Layer

If signals tell you *who* to email, **Claygent** is how Eric researches them at scale and turns what he finds into copy. Claygent is Clay's AI web-research agent, and Eric uses it to do the kind of manual digging a smart SDR would do with ten minutes per prospect — except across a whole list, for pennies. Here's how he actually wires it, and how the research becomes the line in the email.

### The case-study prompt (his go-to workflow)

Eric's most reliable Claygent play is finding a **case study** on the prospect's own website and mentioning it in the copy:

> "Recently, one of our go to workflows have been to use Claygent to find a case study from the prospect company's website so we can mention it in the copy."

He uses that finding two ways — *"Either as a P.S. line or a way to be relevant in our outreach."* His real examples reference an Intercom case study:

> P.S. saw how you helped Intercom increase their email deliverability. Would be a great thing to promote in a newsletter shout out with us.
>
> OR
>
> Hey {{first_name}} — saw that case study on the site with Intercom. When you do enterprise deals like that, does your sales team get bogged down by security questionnaires?

The economics are the whole reason this scales. His model runs it cheap:

- **Model:** 4o mini does the research.
- **Research cost:** *"usually under .01 per prospective company."*
- **Copy-injection cost:** *"less than .001 to write the messaging we need to inject into the copywriting."*

And he's split-tested it: *"a couple times we have launched a validation test split testing the case study AI being included and not and every time so far, the copy mentioning the case studies did better."*

> 📌 Proof: A Claygent-driven campaign *"helped land a $300k deal"* for a client selling AI phone support to ecommerce brands. Eric used Claygent to find whether each prospect *"had a customer support phone number,"* what it was, and whether they listed support hours or ran 24/7 — then wrote to their WISMO ("Where is my order?") pain. As he notes, *"We get that information actually just from the home page and scraping with ZenRows!"*

### Six ways he points Claygent

Eric's broader Claygent playbook is about producing personalization so specific that *"even industry professionals aren't sure if it's manually done or with AI."* The research jobs he assigns it:

1. **Case study callout** — scan the site, name a listed customer (great for a P.S., a first line, or tying to your offer).
2. **Call out their competitor** — the multi-source move below.
3. **Name a product from the website** — strong for ecommerce first lines and relevance (e.g. *"when someone orders a {{product name}} and they claim it didn't arrive, how do you know who to trust?"*).
4. **Call out reviews** — from Google / Yelp / Trustpilot / G2. He notes you don't even need an AI agent here: **Serper, Apify, and DataForSEO** all pull this. Great for reputation-management angles.
5. **Name pricing and features** — call out a specific feature tier and its monthly cost to justify an upgrade.
6. **Follow up on an ICP company hiring a new ICP title** — add value to every follow-up so they re-read your first email, banking on reciprocity.

### The competitor workflow — verify across sources

The competitor callout has a specific method, because getting it wrong is embarrassing. Eric's rule: never trust one source.

> "Blindly trusting one data source is how you accidentally send an incorrect competitor."

His steps:

1. Have AI check the competitors listed across **Crunchbase, Zoominfo, SimilarWeb, G2, and Owler**.
2. Take whichever competitor *"comes up the most often."*
3. Name that one in the email.

He notes this was working very well for a client (Trigify.io). The throughline across all of it is his core test — before running any of these, he asks *"what would you send if you had 10 minutes to research a prospect and how would the research change your message."* Claygent is just how he answers that question for thousands of prospects at once.

> 💡 Claygent lets Eric do 10-minutes-per-prospect research across a whole list for under a cent a company — find a real fact (a case study, a competitor, a product, a review), verify it across multiple sources, then inject it straight into a P.S. or first line.
