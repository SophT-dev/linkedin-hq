# 🎯 2. The Signals

Eric's outbound lives and dies on **signals** — specific, findable facts about a prospect that give you a real reason to reach out. Here's how he thinks about them: most of his best plays need zero AI, and the ones that need it are cheap. The point isn't to be clever, it's to send something the prospect has *never* received before. Below are his actual playbooks, the tools he runs each one with, and one full workflow spelled out step by step.

### Six plays you can run with zero AI

In his own words, these *"increase our reply rates at Growth Engine X"* and can be done in most B2B prospecting platforms:

1. **Recently started a new role** — an oldie but a goodie that, unlike fundraise triggers, *"still has life to it."* He runs this in **Clay**.
2. **Name someone else in the department** — for larger mid-market/enterprise where the right owner is hard to pin down. His line: *"Let me know if this is better suited to talk to {{other employee name}} given their role."* People confirm you're right or point you to the actual person.
3. **Keywords in open jobs** — he's cooled on targeting companies just for having an open role, but reaching out because of *keywords* inside job postings *"has been working even better."*
4. **Technology filtering** — his top three uses: competitor switching, integration messaging, or spotting that they pay for something expensive (so they have budget for you).
5. **Past experience at case-study companies** — using Clay's past-experience filter to find people who *used to* work at a target's customers and now hold a correct-ICP role elsewhere.
6. **Competitor traffic** — done with **Trigify.io** (LinkedIn engagement), **ScrapeLi** (followers of a company page), or **AimLogic** (people searching for your competitors — better for ads than outbound, but he mentions it).

### The workflow: first-time vs. second-time founders

This is Eric's flagship signal — and a full workflow. It detects whether someone has ever held their current role before, so you can speak to brand-new responsibilities (or flip it for veterans).

> 📌 Proof: *"1 positive response per 140 leads uploaded with an uncommon trigger that can only be found in Clay and costs just $.0005 per row."* Eric's read on why it hits: *"This is a really simple trigger to do but is not something I have ever received myself and the responses make me think our prospects haven't received this email either."*

- **Step 1 — Enrich + validate emails first.** Upload contacts and run your email enrichment/validation. His stack: **Prospeo, LeadMagic, TryKitt.ai, and Icypeas**, with a final validation from **Instantly.ai** email validation.
- **Step 2 — Only enrich valid emails.** *"Only enrich the profiles that you got a valid email for in order to save money."* Then pull past experience via Clay's enrichment or your favorite LinkedIn enrichment API.
- **Step 3 — Classify with 4o mini** using this exact prompt:

> Take the person job experience and categorize whether they are a first time CEOs/Founder at {{Company Name}} or they have been CEO/Founder/President ( not vice president) /Owner/Partner before.
>
> Input is here - Past Job Experience - {{experienceJSON}}
>
> If they are first-time CEO/founder then write - First Time CEO otherwise write Second Time CEO. Only output what you are over 95% sure on. Take as much time as you need to complete this task. Keep in mind that my job is on the line if you don't get this right. Thanks

He then *"manually trained 5 examples and manually checked 30 outputs and everything was correct."* His read on why it works:

> "This is a really simple trigger to do but is not something I have ever received myself and the responses make me think our prospects haven't received this email either."

(One honest disclaimer from him: with the Enrich-profile-from-LinkedIn step, cost creeps *over* $.0005 — he pointed people to **Crustdata** for cheaper LinkedIn enrichment APIs.)

### Automating the new-hire signal

One of his most-requested plays is being notified when a company hires a new ICP. He built a **Clay template** to automate it end to end:

1. Check whether the person is newly hired or received a promotion.
2. Find their email with **LeadMagic**.
3. Find their mobile numbers with part of the **Clay waterfall**.
4. Send the data to **Slack**, or straight into **Smartlead / Instantly.ai / HeyReach.io** campaigns.

He notes these leads are often so good that customers cold-call them personally instead of emailing.

> 💡 A signal only works if the prospect has never seen it before — Eric's edge is uncommon, cheap, Clay-found triggers (first-time founders, new hires, tech switches) validated by hand before they scale.
