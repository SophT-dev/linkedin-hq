# 📬 6. The Deliverability Fundamentals

Eric treats deliverability as a *solved problem* — not a dark art. His whole message: stop chasing secret hacks, follow the documented setup, and keep a bench of spare inboxes so you can rotate when something breaks. Here is exactly how he says to do it.

### Send from a real platform, on the right domains

Eric is blunt about your sending stack:

> Use a real outbound platform like Smartlead.ai or Instantly.ai — not MailChimp, HubSpot, or private SMTPs.
>
> Send from Google or Outlook inboxes, not from sketchy servers.

- **Smartlead / Instantly** — the outbound sequencer that actually sends your campaigns. He calls the choice "iphone vs. android": "We get the same results sending on Instantly.ai as Smartlead." Instantly has "a lot more bells and whistles for beginners," while Smartlead "has an API that runs our whole business."
- **Domains — buy from Porkbun or Dynadot, not GoDaddy.** "They often have domain sales." He tells you to buy **.com or .co only** and not to overthink it: "Don't worry too much about how the domain looks, it doesn't matter nearly as much as you think."

### Spin up inboxes with a vendor — and demand the admin console

> Use a vendor like Zapmail.ai or Hypertide.io to spin up inboxes, you want to have admin console access.

- **Zapmail** — for Google inboxes. Eric likes it "because they give you access to the admin console so you know exactly what you're getting when you purchase from them."
- **Hypertide** — for Outlook inboxes, "to land in the dreaded outlook inbox." He keeps Hypertide inboxes for every customer "to help us diversify our infrastructure."

His sending volumes: "We generally send **150 emails per domain from Hypertide and 60 from Google inboxes. Each per day.**"

### Warm up — especially Outlook

> Warm up your inboxes properly, especially for Outlook (sometimes for 4–6 weeks if you are targeting large enterprises.)

While inboxes warm for ~2 weeks, he says spend the time brainstorming campaigns. The documented recipe he trusts: "Sending from multiple domains with **2-3 inboxes on each domain with 15-30 emails per day and 2 weeks of warming.**" Also: "Make sure your DKIM, SPF, and DMARC are all aligned."

### Don't pay for a deliverability guru

> Don't pay for an expensive email deliverability consultant for them to do all the same things as everybody else.

His reasoning: "Smartlead / Instantly.ai both publish a tremendous amount of resources that basically both agree on the same exact things." Follow their guides and set inboxes up through Zapmail/Hypertide and "You'll be **90% of the way** towards what an email deliverability guru will tell you." Anyone claiming a secret is "working off of a hack that isn't going to be around for a long time or is lying to you."

### Keep insurance domains and rotate weekly

Eric systematized this into an SOP built in **Cursor**, hosted on **Railway**, with domains tracked in **Supabase** as `Active`, `Insurance`, or `Cancel`:

> We always want to keep AT LEAST 50% of our Active daily sending volume in Insurance so that we can always rotate our domains.

Every Friday a python script pulls reply rates per domain, then a "Preview Global Rebatch" sends a Slack message with each customer's send goal and how many domains to cancel, activate, or buy — one click updates Supabase *and* swaps old domains for new ones in the campaigns. "Always keep enough inboxes so that when something does go wrong, you have more inboxes to pivot to."

> 📌 Proof: Eric on that systematized SOP — "This workflow I made with Cursor and hosted on Railway **saves me 6 hours a week** on email deliverability tasks and our customers get **much more consistent results** from it." Before it, he says, "We would miss customers. Over order for some, under order for others. It was crazy."

### Use open tracking — it's not the boogeyman

> Use open tracking when you're unsure about deliverability... It can tell you within a day if you're having real issues with deliverability. Always use custom tracking domains.

And keep sequences short: "Two or three emails max — most replies come from email one."

> 💡 Deliverability isn't a secret you buy — it's a documented setup you follow: real sequencer, .co/.com from Porkbun/Dynadot, diversified Zapmail/Hypertide inboxes with admin access, proper warmup, and always a bench of insurance domains to rotate to.
