---
name: reddit-post-writer
description: Draft a Reddit post that reads like a real person sharing something useful, not a brand pushing a product. Triggers when the user asks to "write a Reddit post", "make this sound native for Reddit", or wants a post for a specific subreddit that will not get flagged as promo.
---

# Reddit Post Writer

## When to use this skill
Trigger this skill when the user:
- Wants a Reddit post drafted for a specific subreddit
- Says "make this sound like a real person", "write something native", or "I do not want this to read like an ad"
- Has a topic or thread idea and needs it shaped into a post that earns upvotes and trust

## What this skill does
Writes a Reddit post in a genuine first-person voice that leads with value, matches the subreddit's norms, and buries any product mention so deep that it reads as a helpful aside, not a pitch. Reddit rewards real experience, so this skill forces specifics over marketing language.

## Inputs needed
1. Target subreddit (required)
2. The topic or story angle (required)
3. What you actually did / learned (required - the post must be grounded in something real)
4. Optional: the product, only if a soft mention is appropriate for that sub

## Steps
1. Restate the subreddit and confirm the post is grounded in a real experience. If it is not, stop and ask for one. Reddit punishes invented stories.
2. Check the subreddit's culture: is it a help sub, a discussion sub, or a showcase sub. Match the format to it.
3. Write a title that reads like a person, not a headline: specific, slightly understated, no clickbait, no title case.
4. Open the body with the real context or problem in one or two plain sentences.
5. Deliver the useful part: the exact steps, numbers, or lesson. Be specific enough that a stranger could act on it.
6. Only if the subreddit tolerates it, add one honest line about the tool you used, framed as "here is what I used" not "you should buy this".
7. Close with a genuine question to invite replies.
8. Strip every marketing tell: no "game-changer", no "unlock", no exclamation-heavy hype, no em dashes.

## Output format
```
SUBREDDIT: r/<name>

TITLE:
<plain, specific, lowercase-ish title>

BODY:
<context>

<the useful part, specific>

<optional honest tool mention>

<genuine closing question>

WHY THIS WORKS HERE
- <one line on the norm it matches>
- <one line on what could still get it removed, and how to avoid it>

NEXT STEP
Run `comment-reply-writer` to prep replies for the comments this will get.
```
