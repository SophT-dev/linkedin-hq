---
name: pain-point-extractor
description: Pull the exact words customers use to describe their problems from Reddit threads, so copy and posts use their language instead of yours. Triggers when the user pastes threads or asks to "find the language my customers use", "extract pain points", or "mine voice-of-customer from Reddit".
---

# Pain Point Extractor

## When to use this skill
Trigger this skill when the user:
- Pastes Reddit threads or comments and wants the real customer language pulled out
- Says "extract pain points", "get me voice of customer", or "what words do they actually use"
- Wants copy, posts, or FAQ content that mirrors how buyers talk

## What this skill does
Reads through threads and pulls out verbatim customer phrasing, grouped by the underlying problem, ranked by how often the sentiment shows up. The output is a swipe file of real quotes and the exact nouns and verbs to reuse in copy.

## Inputs needed
1. Pasted threads / comments, or a subreddit and topic to focus on (required)
2. The product or category, so problems can be mapped to it (required)

## Steps
1. Read the supplied threads. If none are supplied, ask the user to paste the top threads from their target subreddits (use `subreddit-mapper` first).
2. Pull out every phrase where someone describes a problem, a frustration, a workaround, or a wish. Keep the wording verbatim.
3. Group the phrases by underlying problem, not by surface wording.
4. For each group, note how frequently the sentiment appears and how emotionally charged it is.
5. Extract the recurring nouns and verbs buyers use. These are the words to put in copy.
6. Flag the phrases that are strong enough to become post titles or FAQ questions on their own.
7. Output the swipe file below.

## Output format
```
PAIN-POINT SWIPE FILE - <category>

PROBLEM 1: <plain label>  (frequency: <high/med/low>)
Verbatim quotes:
- "<real quote>"
- "<real quote>"
Words to reuse: <noun>, <verb>, <phrase>

PROBLEM 2: ...

READY-TO-USE ANGLES
- Post title: "<a verbatim phrase reshaped into a title>"
- FAQ question: "<a verbatim question>"

NEXT STEP
Feed the reused words into `reddit-post-writer` so your posts sound like the thread, not like a brand.
```
