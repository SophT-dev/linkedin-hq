---
name: competitor-thread-finder
description: Surface Reddit discussions that already mention your competitors so you can enter the conversation where buyers already are. Triggers when the user names competitors and asks "where are people talking about them", "find competitor threads", or "where can I show up against X".
---

# Competitor Thread Finder

## When to use this skill
Trigger this skill when the user:
- Names one or more competitors and wants the Reddit threads discussing them
- Says "find competitor threads", "where are buyers comparing us", or "where can I add my product to the conversation"
- Wants warm threads where buying intent already exists

## What this skill does
Builds a targeted search plan to find live Reddit threads mentioning your competitors, prioritizes the ones with real buying intent, and tells you exactly how to enter each without looking like a plant.

## Inputs needed
1. Your product (required)
2. 1-5 competitor names (required)
3. Target subreddits (optional)

## Steps
1. Restate your product and the competitors.
2. Build a search plan: the exact Reddit search queries and Google "site:reddit.com" queries to run for each competitor, including comparison phrasing ("X vs", "X alternative", "X pricing", "is X worth it").
3. For each expected thread type, judge the buying intent and how appropriate it is for you to comment.
4. For high-intent threads, write the angle: how to add genuine value first and where an honest mention of your product fits.
5. Flag threads where you should stay out (competitor's own announcement, strict sub, pile-on) to protect the account.
6. Output the plan.

## Output format
```
COMPETITOR THREAD PLAN

COMPETITOR: <name>
Search queries to run:
- reddit search: "<query>"
- google: site:reddit.com "<query>"
Thread types to prioritize:
- "<X vs Y>" - intent: high - angle: <how to enter>
- "<X alternative>" - intent: high - angle: <how to enter>
Stay out of:
- <thread type> - <why>

NEXT STEP
For each high-intent thread you find, run `comment-reply-writer` to draft a native, low-risk reply.
```
