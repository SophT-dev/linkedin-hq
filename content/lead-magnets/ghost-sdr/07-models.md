# Which AI Model for Which Job

**The biggest mistake we see people make when they wire AI into cold outbound is running every single job on the biggest, smartest model they can find. It feels safe. It is actually the fastest way to burn your budget on work a cheap model would have nailed anyway. The skill is not "use good AI." The skill is matching the model to the job.**

### The core rule

Match the model to the job by *intelligence needed* versus *cost*. That is the whole game. Some jobs in your system are simple yes/no calls that a small model gets right thousands of times in a row. Other jobs need real reasoning. When you route both to the same expensive model, you pay reasoning prices for classification work. Do not run everything on the biggest model.

Think of it like staffing. You do not put your most senior strategist on data entry, and you do not put an intern on the one deal that matters. You match the person to the task. Your models are your staff.

### The three tiers, by job

We sort every AI job in an outbound system into three buckets.

**1. Cheap and fast, for CLASSIFY and GATE jobs.**
These are the yes/no and which-bucket decisions that run on every row in your list:

- Is this lead in the right segment or not?
- First-time founder or repeat founder?
- Does this trigger signal actually apply to this company?
- Is this a real person or a role inbox?

A small, cheap model nails these at volume. The job has a narrow, checkable answer, so you do not need a genius. You need speed and a low price per call, because you are running it tens of thousands of times.

**2. Mid-tier, for GENERATION jobs.**
This is the writing layer:

- First lines that reference a signal
- Follow-up touches
- Subject-line variants

A mid-tier model is *good enough and cheap enough* to run at scale. The output still needs a human-sounding pass (covered elsewhere in this kit), but the mid tier gets you 90 percent of the way for a fraction of the top-tier cost. Spending frontier-model money on a first line you are going to edit anyway is waste.

**3. Expensive deep-research, for a FEW cherry-picked accounts.**
The top tier earns its price only when the account is worth it: a warm reply came in, a big logo is on the list, or a call is booked and you want a genuinely researched angle. You run deep research on those accounts by hand, one at a time. You never point it at the whole list.

### At real volume, cheap wins

Here is the part that surprises people. When you actually send at volume, the *cheap model does the vast majority of the jobs*, and the pricier models rarely justify their cost. Most of an outbound system is classifying, gating, and generating short text. That is exactly the work small models are good at.

So the money question is never "what is the smartest model available?" It is "where does extra intelligence actually change the outcome?" Reserve intelligence for those spots. Let the cheap tier carry the load everywhere else. Run the numbers on your own send volume and you will almost always find the cheap tier is doing 80 percent or more of the calls.

> ⚠️ **Cost-optimization is a separate, dedicated task. Never re-architect mid-campaign.** Batch APIs, prompt caching, and volume tier discounts can cut your spend meaningfully *(directional numbers vary by provider and setup, so verify for yours)*, but chasing them while a campaign is live is how you break a working system. Ship the campaign first on a simple, correct routing setup. Then, as its own separate task, go optimize cost. First make it work, then make it cheap.

### Template: the jobs-routing table

Map every AI job in your system before you build. Fill this in, one row per job:

```
JOBS-ROUTING TABLE

Job                     | Intelligence needed | Model tier            | Notes
------------------------|---------------------|-----------------------|---------------------------
                        | low / med / high    | cheap classifier /    |
                        |                     | mid generator /       |
                        |                     | deep-research         |
------------------------|---------------------|-----------------------|---------------------------
[e.g. segment gate]     | low                 | cheap classifier      | runs on every row
[e.g. first line]       | med                 | mid generator         | needs human pass after
[e.g. reply research]   | high                | deep-research         | cherry-pick only, by hand
                        |                     |                       |
                        |                     |                       |
```

> 💡 If a row says "high intelligence needed" but runs on your whole list, stop. That is a budget leak. Either the job is really a low-intelligence gate in disguise, or the job should only run on a handful of hand-picked accounts. Almost nothing that runs on every row needs your most expensive model.
