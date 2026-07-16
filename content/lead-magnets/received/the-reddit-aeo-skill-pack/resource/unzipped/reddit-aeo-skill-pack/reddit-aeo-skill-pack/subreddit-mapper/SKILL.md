---
name: subreddit-mapper
description: Find the subreddits where a brand's customers actually hang out and map what they complain about. Triggers when the user gives a product or ICP and asks "which subreddits should we be in", "where do my customers hang out on Reddit", or asks for a subreddit map or Reddit targeting list.
---

# Subreddit Mapper

## When to use this skill
Trigger this skill when the user:
- Gives a product, category, or ICP and asks where their buyers hang out on Reddit
- Says "map my subreddits", "which subreddits matter for us", or "build my Reddit target list"
- Is starting Reddit AEO and does not know where to post first

## What this skill does
Produces a ranked map of 10-20 subreddits your buyers actually use, each scored on fit, size, activity, and how strict the moderation is, plus the top recurring complaints and questions in each one so you know what to talk about.

## Inputs needed
1. Product / company one-liner (required)
2. ICP / who buys it (required)
3. The problem your product solves (required)
4. Any subreddits you already know about (optional)

## Steps
1. Restate the product, ICP, and core problem in one line each so the targeting is grounded.
2. Brainstorm candidate subreddits across four buckets: role-based (where the buyer identifies by job), problem-based (where the pain gets discussed), tool-based (adjacent tools and categories), and industry-based (their vertical).
3. For each candidate, estimate: relevance to the ICP (high / medium / low), rough size tier (niche / mid / large), activity level, and moderation strictness for self-promotion.
4. Drop any subreddit where the ICP fit is low or the mod rules make helpful participation impossible.
5. For each surviving subreddit, list the 3-5 recurring complaints or questions the ICP raises there.
6. Rank the final list by a simple score: relevance first, then activity, then how tolerant the sub is of useful outside contributions.
7. Output the map in the format below.

## Output format
```
SUBREDDIT MAP - <brand>
ICP: <one line>

RANKED TARGETS
1. r/<name> - fit: <high/med/low> | size: <tier> | mod: <strict/moderate/open>
   Talk about: <complaint or question 1>; <2>; <3>
2. ...

START HERE
- First subreddit to enter: r/<name> - because <reason>
- Do NOT self-promote in: r/<name> (strict mods) - contribute only

NEXT STEP
Run `query-finder` on your top 3 subreddits to pull the exact questions to answer.
```
