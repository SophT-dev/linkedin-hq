---
name: query-finder
description: Surface the exact questions people are typing into your target subreddits and into ChatGPT about your category. Triggers when the user asks "what are people searching", "find the questions buyers ask", "what queries should we target", or wants a query list for Reddit AEO.
---

# Query Finder

## When to use this skill
Trigger this skill when the user:
- Wants the real questions buyers ask in their category
- Says "find the queries", "what are people asking ChatGPT about this", or "what should our threads answer"
- Needs a prioritized list of questions to build threads and content around

## What this skill does
Generates the high-intent questions your buyers actually ask, both inside your target subreddits and into AI tools like ChatGPT and Perplexity, then ranks them by buying intent and by how likely a Reddit thread is to become the cited answer.

## Inputs needed
1. Category / product (required)
2. ICP (required)
3. Target subreddits (optional - use `subreddit-mapper` output if available)

## Steps
1. Restate the category and ICP.
2. Generate questions across four intent levels: discovery ("best X for Y"), comparison ("X vs Y", "alternatives to X"), problem-led ("how do I fix Z"), and validation ("is X worth it", "X pricing", "X reviews").
3. For each question, judge buying intent (high / medium / low) and whether it is the kind of question AI tools tend to answer with a Reddit thread (recommendation, comparison, and real-experience questions score high).
4. Cut low-intent and purely informational questions that will not lead to a buyer.
5. Rank by intent first, then by Reddit-citation likelihood.
6. Group into "answer these first" (top 10) and "backlog".
7. Output the list.

## Output format
```
QUERY LIST - <category>

ANSWER FIRST (high intent + high citation odds)
1. "<question>" - intent: high | citation odds: high
2. ...

BACKLOG
- "<question>"

NEXT STEP
Take the top 3 and run `reddit-post-writer` to draft a thread answering each.
```
