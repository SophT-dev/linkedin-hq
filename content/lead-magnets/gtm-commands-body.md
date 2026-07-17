# The GTM Command Line: 12 Claude Code Commands That Run a GTM Agency

*We stopped re-explaining the same tasks to Claude every day. We turned them into commands instead. Type one line, get the whole pipeline. Here is a reference set you can build for yourself.*

**Status: DRAFT for human review. Not published anywhere. No Notion page created, no API called.**

---

Here is what you get in this guide:

- ✅ 12 example slash commands a GTM operator can build, across pipeline, replies, content, and ops
- ✅ For each one: what you type, what happens, what you get back, and what to change for your setup
- ✅ The 4 command patterns every GTM operator repeats daily, so you know which to build first
- ✅ A 10-minute recipe for turning any task you keep re-explaining into a one-line command
- ✅ The 3 rules that keep a command from going off the rails (numbered phases, confirm gates, one job)

A quick note on what a "command" even is. In Claude Code, a slash command is a saved instruction file. You type a short name like `/pipeline` and it loads a full set of steps you wrote once, so you never have to re-explain the task. Think of it as the difference between texting a new freelancer the whole brief every morning versus handing them one SOP they already know by heart. That is the whole idea. You spend an hour writing the SOP once, then you spend two seconds a day running it.

The command names below are examples, not a product you install. They are here to show you the shape of a good GTM command so you can build your own with names that fit your stack. They fall into four buckets: building pipeline, handling replies, making content, and running the shop. Here is one you could build in each.

## Building pipeline

**`/pipeline`: build a scored lead list from one short brief.**
Type it, then paste a client chat or a few lines about who you want to reach. It reads the brief, researches the market, builds a rough ideal-customer profile, then pulls a first batch of names and scores each one against that profile before anything gets exported. **You get:** a saved profile plus a ranked list, with a human stop built in before it spends money on enrichment. **Adapt:** point it at whatever lead source and scoring rubric you already trust. The pattern matters more than the tool underneath it.

**`/dossier`: a one-page brief on a target account before you reach out.**
Point it at a company name or website. It pulls the site, recent news, hiring signals, and any public posts, then writes back the likely pain point, the buying trigger, and one specific detail worth opening with. **You get:** a short brief you can hand straight to a writer, instead of 20 open browser tabs. **Adapt:** tell it which signals matter for your niche (fresh funding, a new hire, a tech switch) so it stops surfacing the generic stuff.

**`/pitch`: a job post or call notes become a ready-to-send proposal.**
Paste the post or the notes. It runs two research passes at once: one reads the brief for the real pain and the exact words the buyer used, the other profiles the buyer themselves. Then a writing pass drafts a few different openers and a full proposal that mirrors their language. **You get:** a proposal you can send after a light edit, plus a handful of openers to pick from. **Adapt:** feed it your own voice rules and your real proof points so every draft sounds like you, not like a template.

**`/inbox`: triage the replies and draft the responses.**
Run it against your reply inbox. It sorts each reply (interested, not now, wrong person, objection), matches it to the right next step, and drafts a warm reply in your voice for the ones worth a human touch. It stops and shows you everything before a single message sends. **You get:** an hour of triage done in a few minutes, with you still holding the send button. **Adapt:** the confirm-before-send gate is the load-bearing part. Never let a reply command send on its own.

## Making content

**`/draft`: one post, built from your own playbook instead of a blank page.**
Ask for today's post. It pulls the next slot from your calendar or a saved idea, grabs a proven hook and structure from your swipe file, grounds the draft in a real number or story, and hands you two or three options. **You get:** finished drafts that already sound like you, each tied to a hook that worked before. **Adapt:** load your own swipe file. A post command is only as good as the proven examples behind it.

**`/weekly`: a week of posts in one sitting, with a resource attached.**
Same engine as the single post, run wide. It drafts a batch across a mix of topics and funnel stages, loops with you on edits, saves the approved ones, then optionally researches and writes a full free resource for the best ideas. **You get:** a week of content plus the lead magnet that turns readers into replies. **Adapt:** set your batch size and your topic rules up front so no two posts feel like the same note.

**`/remix`: turn a proven post into your own asset.**
Point it at a post that already worked (yours or a creator you follow). It pulls out the core idea, strips the parts that only fit the original author, and rebuilds it around your proof and your offer, in your voice. **You get:** a fresh post or resource with the risk already taken out, because the idea is proven. **Adapt:** keep a hard line between inspiration and copying. Reuse the structure and the insight, never the words.

**`/engage`: on-brand comments for daily engagement, without the busywork.**
Feed it a post from someone in your space. It returns a few short comment options in your voice: one that teaches something, one that is light and human, one that compliments and asks a real question. **You get:** thoughtful comments in seconds, so the daily engagement habit survives a busy week. **Adapt:** cap the length and ban the filler words, or it will drift into sounding like every other AI comment in the feed.

## Intake and knowledge

**`/swipe`: capture a resource you received before it disappears.**
When a competitor or creator sends you a free resource, run this and drop the link. It saves a copy of the actual file (not just the link, which dies in weeks), files it with notes on the format and the hook, and logs a row you can search later. **You get:** a growing swipe vault of what is working in your market, captured in one command instead of a messy folder. **Adapt:** the "save the real file, not the link" rule is the whole point. Links rot. Archives do not.

**`/digest`: a calm morning read of what your market is saying.**
Run it with your coffee. It reads the creators you track, the forum you watch, and your subscribed newsletters, then writes a short plain-language summary grouped by topic and drops it in a channel you check. **You get:** the signal from a dozen sources in a two-minute read, instead of an hour of scrolling. **Adapt:** pick your own three or four sources. A digest of everything is noise; a digest of the right few is a habit.

**`/win`: log a proof point the moment it happens.**
When a good screenshot or result lands, run this and drop it in. It files the proof, tags it, and logs a content idea built on it, so your best material is saved instead of scrolled past. **You get:** a proof library that writes half your future posts for you. **Adapt:** decide what counts as proof up front (a reply, a booked call, a result) so the library stays sharp.

## Running the shop

**`/standup`: a five-minute status read before you start the day.**
Run it first thing. It pulls your live numbers, what shipped yesterday, what is blocked, and the one or two things that actually move the goal, then tells you where to spend the next few hours. **You get:** a focused start instead of a scattered one, driven by real state and not vibes. **Adapt:** point it at your own numbers and your own goal. The command is a mirror; it only reflects what you feed it.

## How to write your own in 10 minutes

Every command like the ones above starts the same way: as a task you were re-explaining to Claude two or three times a week. That is the signal. The moment you type the same kind of instruction a third time, it should be a command. Here is the recipe.

**1. Write the trigger and the job in one sentence.** At the top of the file, say what starts the command and what it produces. "When I paste a job post, research it and write a proposal." Keep it plain. This one line is what future-you reads to remember what the command does.

**2. Break the work into numbered phases.** List the steps you actually take, in order, the way you would train a new hire. Research first, then draft, then save. Numbered phases stop the model from jumping ahead and skipping the thinking, which is the single most common way these go wrong.

**3. Add a confirm gate before anything costs money or sends.** This is the rule that lets you trust a command. Any step that spends on enrichment, sends an email, or posts in public must stop and show you the work first. We learned this the expensive way. A command with no gate is a command that will eventually surprise you.

That is the entire craft. Trigger, phases, gates. Write it once in a plain file, save it as a command, and you have handed off a task for good. The best operators are not the ones who work the most hours. They are the ones who only explain a thing once.

---

If you want the version of this that runs a whole cold-outbound agency, that is exactly what we do at Bleed AI. We build the outbound engine, the content, and the systems behind both, so founders get replies without hiring a team.

**Comment COMMANDS and I'll send you this guide as a doc you can keep.**
