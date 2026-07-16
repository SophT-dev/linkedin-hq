# The 1,000+ Hour Claude Code Setup Checklist

Source: https://meadow-leader-47c.notion.site/The-1-000-Hour-Claude-Code-Setup-Checklist-39281f7dc52781d19c48d20059fbe5dc
Format: Notion public page (10 checklist sections across 8 sub-pages + a "10-Hack Checklist" recap page)
Page icon: Claude AI logo

---

## Section 1: Before You Start Another Claude Code Session

You've installed Claude Code.
You've watched the videos, maybe built a personal project or two. And it still over-engineers simple fixes and forgets everything the second you close the window, while asking you to approve every permission one click at a time.
That's a setup problem, and this checklist exists to fix it.
I've spent 1,000 hours in Claude Code. I've told thousands of people to build with it from zero, and the ones who ship all set it up the same way. Everyone else treats it like a chatbot.
Before the AI wave, I spent 8 years in automation and drove $25M in revenue for clients. The lesson carried over from that era: the unglamorous setup work is the work that pays.
You'll walk away with:
1. Three switches you can flip in under a minute, from auto mode and plan mode through to remote control
2. The plugin I use on basically every build, with 14 skills and parallel subagents
3. A 4-rule Claude MD file from one of OpenAI's founders
4. A repeatable way to turn your day-to-day processes into custom skills that run on a schedule
5. The persistent memory setup almost nobody does, so Claude gets smarter the more you use it instead of starting from scratch

This is NOT a course. It's a checklist, so work through it top to bottom and tick the boxes as you go.
The first few take under a minute.

---

## Section 2: Flip These Three Switches in Under a Minute

Start with the switches you can flip in under a minute.
Right now there are basically two types of Claude Code users. The first type sits there approving every permission one click at a time, and the second type turns auto mode on and lets Claude build the whole project without babysitting it. Clicking approve on every permission is what we used to do six months ago, and auto mode is now available to everybody on the Pro plan as well as the Max plan, and it works on desktop and in the terminal.

#### Switch 1: Auto mode
- [ ] In the terminal, press Shift+Tab to flick between modes until auto mode is on (on desktop, click the drop-down at the bottom of the screen)
- [ ] Add your own rules if you want extra guardrails, and know that auto mode still blocks the dangerous commands the old "dangerously skip all permissions" flag would have let through

#### Switch 2: Plan mode
The same Shift+Tab gets you to plan mode. In plan mode, Claude isn't allowed to build anything, and all its focus goes into building a plan and getting that plan approved by you.
Then read the plan. I see this mistake a lot, where people hand over the reins and execute the plan without reading it. Building the wrong thing is probably one of the most expensive mistakes you can make in Claude Code, because you'll burn a ton more tokens fixing bugs and going in the reverse direction.
- [ ] Shift+Tab into plan mode before your next build, and read the full plan before you approve anything
- [ ] Pick "approve and execute in auto mode" so the build runs hands-free (that combination is how you do real work inside Claude Code)

#### Switch 3: Remote control
Ever been mid-session when you've got to head out to a meeting or dinner? You can keep the session going from your pocket, and I use this on 20-minute taxi rides.
- [ ] Type /remote-control in the terminal (the same command works on desktop)
- [ ] Open the Claude app on your phone and head to the Claude Code tab, where your running session connects

Your 60-second score: count how many of the three you already had on and write it here: ___ out of 3. If your answer is 0, you've been driving Claude Code like it's six months ago.

> ⭐ Key takeaway: plan in plan mode, build in auto mode.

---

## Section 3: Install the Superpowers Plugin

Hack four is the one I use on basically every build.
It's called the Superpowers plugin. I didn't invent it myself, unfortunately, but it's probably the best build tool I've come across, and I've tried a few. GSD, the "get done" plugin, felt too bloated to me, because it took a very long time to reach the point where I was building anything.
Superpowers hands Claude 14 skills. These are the ones I use day to day, depending on what I'm building:
- Brainstorming, which is a fantastic way to get started (similar to plan mode, if I'm honest)
- Writing plans
- Subagent-driven development
- Code review
- Executing plans
- Dispatching parallel agents

**Install it:**
- [ ] On Claude Desktop, search "Superpowers" under Customize > Browse plugins
- [ ] In the terminal, run /plugin install superpowers
- [ ] If the search doesn't show it (I've worked with people where it didn't), run the marketplace command from the Superpowers GitHub readme instead
- [ ] Test it by typing /superpowers, which lists every skill you've got

You don't need the slash command day to day, either. Mention "I'm brainstorming this idea" or "let's create a plan for this" in normal conversation, and it picks up the keywords and invokes the skills automatically. That's what you want from a tool like this.
From there the flow moves from brainstorm into a plan, and from the plan into an implementation plan. Once you sign off, the build runs in auto mode with multiple subagents doing the work, while a checklist ticks itself off on your screen.
**Try it on something that isn't software.** I ran a brainstorm for a full Facebook ads campaign for a product sitting on my desk, covering everything from the ad angles through to the targeting. You can point it at anything, whether that's marketing or just organizing the files on your laptop.
- [ ] Pick one thing you're working on this week: ______________________
- [ ] Invoke brainstorming and answer the question gates it gives you
- [ ] Sign off the plan and let it build in auto mode
- [ ] Watch the checklist on screen instead of touching the build

> ⭐ Key takeaway: you approve plans, and subagents do the build.

---

## Section 4: Merge Karpathy's 4 Rules Into Your Claude MD File

Your Claude MD file is what Claude reads inside your project before it does anything.
It's essentially a list of instructions, the rules and guidelines for what your project does, so it's pretty important to get right.
Andrej Karpathy, one of the founders of OpenAI, came up with a pretty simple, kind of genius Claude MD file. It has four main rules.
Rule 1 is **think before coding**, so Claude shouldn't assume or hide confusion, and it should surface the trade-offs happening in the background (this one ties straight into plan mode and brainstorming). Rule 2 is **simplicity first**, meaning the minimum code that solves the problem with nothing speculative bolted on.
Rule 3 is **surgical changes**. Even six months ago, Claude Code would go in and change files you never asked it to touch, and it still does today to a lesser extent, but with this rule in place it only touches the files you want it to touch. And rule 4 is **goal-driven execution**, where you define the success criteria and Claude loops until they're verified, very much like the /goal command that keeps iterating until the goal criteria are met.

**Set it up:**
- [ ] Grab the four rules from the Karpathy Claude MD GitHub
- [ ] If you already have a Claude MD file in your project, paste the rules in and tell Claude: "I want to include these rules. How are we going to merge them into our existing file?"
- [ ] Decide which rules earn their place, because my Claude MD files carry a bunch of things specific to my situation and use case, and yours should too
- [ ] Watch your next build for the difference in which files get touched

**Fill this in before you move on.** The one behavior I most want to kill in my sessions is ______________________, and Rule ______ addresses it.

> ⭐ Key takeaway: Rule 3 alone ends the mystery file edits.

---

## Section 5: Turn Your Repeat Work Into Skills and Start Talking to Claude

You probably repeat the same processes day to day.
Maybe you pull data from a spreadsheet and turn it into a report, or you produce content on a repeating schedule. That's where Claude skills come in, so you stop manually walking Claude through the same thing over and over inside Claude Code.
Mine is a content-creator skill built on my own process. I invoke it and drop in my YouTube transcript. It generates 20 to 30 different openers using the frameworks and formulas I've already put inside the skill, then it evaluates each one on direct response marketing principles and scores it out of 10 on four criteria.
Then I select the winner manually, because I keep a human in the loop on the judgment calls. I've been in marketing for 10+ years, so I know what's going to work, and I don't want Claude deciding that for me, because often it won't pick the best one. After that, the skill writes the body content, and my AI image factory spins up five or six image variations from recipes Claude built by analyzing images that have already performed well.
One warning from experience: I've installed a ton of other people's skills, and I end up deleting most of them, because they don't have my personal context. That's why I build my own.

**Build your first skill:**
- [ ] List the two processes you repeat most in a week: 1) ________________ 2) ________________
- [ ] Open your installed skills and find Anthropic's default skill-creator
- [ ] Tell Claude: "Can you use the skill-creator skill to help me write my own skill?"
- [ ] Put YOUR process inside it, with your frameworks and your context
- [ ] Mark where the human in the loop sits, meaning the judgment call only you can make: ________________

**Then stop typing all of that context in**
I use WhisperFlow. I hit FN and spacebar, a little bar appears at the bottom of my screen, and I start talking. I ramble and rant a ton of context into Claude Code, then I press FN again and click where I want the text to land. The text appears, cleaned up as it goes.
My dashboard says I talk at 108 words per minute, and I'd guess that's way faster than I can type. It's probably the same situation for you. I've dictated over 681,000 words through it, and the maximum recording is 6 minutes, which is a lot of context in one go.
Working in an office? Plug in your headphones and whisper into the mic, because that is literally why it's called WhisperFlow. People might think you're a bit weird, but you're the one getting the productivity gains.
- [ ] Install a voice input tool (WhisperFlow is the best one I've found, even though it occasionally gets things wrong)
- [ ] Speak your next brief to Claude instead of typing it, and compare the result against your last typed brief

> ⭐ Key takeaway: skills without your context get deleted.

---

## Section 6: Cut the Context Bloat and Schedule Self-Running Agents

Skills and MCPs come at a cost.
Once you start installing them, Claude loads them into every context window and chat you use, and your Claude MD file gets read first too, eating into your tokens before you've typed a word. My fresh session starts at around 5-6% of the context window already used, while some of my students start at 15%.
Two habits fixed this for me.
Habit 1 is running the Token Optimizer. I found this in a Skool group I'm in, and honestly it's one of the best tools I've found for the job. The dashboard breaks down your total session overhead, from your Claude MD file and memory through to your skills and MCP tools. It flags the ones you're not using and claims savings of up to 30% more tokens.
The crazy part is it shows what you'd be spending if you were billed on your actual usage. For me that's over $2,000 a month, on a Max plan that costs me about 100 pounds. And that's WITH the Token Optimizer fully installed and tuned.
- [ ] Check what percentage a fresh session starts at for you: _____%
- [ ] Install the Token Optimizer and review your session overhead
- [ ] Remove the skills and MCPs it shows you're not using
- [ ] Re-check your fresh-session percentage after the cleanup: _____%

Habit 2 is clearing at 35-40%. When I get to about 35-40% of my context window, I create a handover file and clear the context, because any further than that and you just end up burning a ton more usage.
- [ ] Set your own clear point (mine is 35-40%)
- [ ] Create a handover file whenever you hit it, then clear

#### Now make it run without you
Claude Code desktop has a Routines tab. You set up a new routine there, either locally on your device or hosted remotely, and it kicks off on a schedule like a cron job. The templated example sitting right there is a weekly revenue report every Monday at 8am.
Run it remotely if you can, because if your laptop is closed when the schedule fires, nothing runs. That's literally why people buy Mac minis, to have things running 24/7. It's much easier to have it hosted in the cloud.
You don't even need to configure it by hand. When you've built a skill or finished work you want repeated, just tell Claude to run it on a routine at a set time, and it schedules it inside the routines for you.
- [ ] Pick one output you produce weekly, like a report or a content draft
- [ ] Tell Claude to run it on a routine (remotely if possible) and check the daily run limits before you lean on it

> ⭐ Key takeaway: a routine turns your skill into an agent.

---

## Section 7: Set Up Persistent Memory (the One Almost Nobody Does)

This is hack 10, and almost nobody sets it up.
It's the difference between Claude starting a session from scratch and Claude getting smarter the more you use it.
You've probably heard "second brain" thrown around online. What it means in practice is your context layer, all the information about you and your business, plus the processes behind how you operate. And a second brain is nothing more complex than a collection of files on your computer. It's markdown files sitting in folders, with no fancy business going on.
I view mine in Obsidian, which is just a file viewer that lets you interlink files, and I run Claude Code in Warp, my daily driver, with the file tree sitting right next to the session. If I click a file, it opens in the window beside my session, and scripts and images open the same way.
The habit that makes it work: when Claude and I finish a piece of work, it gets saved.
- The content you create gets saved into your files
- Your voice profile gets saved once you've built one
- Your Claude MD file gets saved into the folder
- Your business profile and brand spine get saved
- Your brand CSS gets saved, with your colors and fonts inside

My website was coded in Claude Code, and in my opinion it doesn't look vibe-coded, because it pulls from that saved design framework. When I create new pages and funnels, they pull the same fonts and the same sizes.
Then, in any future session, I can say "reference the email newsletter we created last week, pull the same structure." I can reference files by name, or just by association with what I'm talking about. That's how you get the most powerful output from Claude Code.

**Build yours:**
- [ ] Create one folder for it (call it a vault if you like, and keep separate vaults per project if that helps)
- [ ] Save your files as markdown as you produce them, starting with a business profile and a voice profile
- [ ] In your next session, reference one saved file by name instead of re-explaining yourself
- [ ] Fill in the two files that would save you the most re-explaining: 1) ________________ 2) ________________

Don't get confused and overwhelmed about second brains, because it's literally just context, saved, so it can inform your future builds and chats.

> ⭐ Key takeaway: a second brain is files and folders, nothing more.

---

## Section 8: The 10-Hack Checklist

This is the page you screenshot and keep.

**The full setup:**
- [ ] Hack 1: Auto mode is on (Shift+Tab in the terminal, or the drop-down on desktop)
- [ ] Hack 2: Plan mode runs before every build, and the plan gets read before it gets approved
- [ ] Hack 3: /remote-control is connected to the Claude app on your phone
- [ ] Hack 4: The Superpowers plugin is installed, with its 14 skills
- [ ] Hack 5: Karpathy's 4 rules are merged into your Claude MD file
- [ ] Hack 6: Your top repeat process runs as a custom skill with the human-in-the-loop step marked
- [ ] Hack 7: Voice input is installed, and briefs get spoken instead of typed
- [ ] Hack 8: Your session overhead is audited with the Token Optimizer, and unused skills and MCPs are gone
- [ ] Hack 9: One weekly output runs as a remote routine
- [ ] Hack 10: Your second brain folder is live, with work saved as markdown and referenced by name

**Numbers worth remembering:**
- The first few hacks take under a minute to flip on
- The Superpowers plugin adds 14 skills
- The Karpathy Claude MD file carries 4 rules
- I dictate at 108 words per minute through WhisperFlow, and I've put 681,000+ words through it
- My fresh session starts at 5-6% of context used, while some students start at 15%
- I create a handover file and clear at 35-40%
- My usage would bill at over $2,000 a month if I paid raw, on a Max plan that costs about 100 pounds

**Assets you built in this checklist:**
- Your quick win score: ___ / 3
- Your first custom skill: ________________
- Your weekly routine: ________________
- Your second brain folder: ________________

When all ten boxes are ticked, Claude Code runs like a system.

---

## Footer CTA (callout block on main page)

> 👉 **Want a FREE AI Audit for your business?**
> I'll look at how your business actually runs, rank every process worth handing to AI, and then we can talk about building the automation LIVE on a 60-minute call, using Claude Code.
> Apply below and we'll build it together.
> https://api.leadconnectorhq.com/widget/bookings/automation-roadmap-call

---

## Note on creator identity
No name, handle, or LinkedIn/social URL appears anywhere in the page's actual block content (checked all 8 sub-pages plus the master page's footer/CTA). The Notion site metadata (site_id) and social-icon lookups returned no accessible data (public reader role has no visibility into workspace/team/user records). A stray "https://calendly.com/guillaumeang/ai-growth" link surfaced in the raw API cache but traces to a different Notion spaceId than this document's — almost certainly cross-contamination from the third-party Notion proxy's shared cache, not this creator. A targeted web search for distinctive phrases ("1,000+ Hour Claude Code Setup Checklist", "$25M in revenue" + automation) returned no matching source. Creator identity could not be confirmed from available data.
