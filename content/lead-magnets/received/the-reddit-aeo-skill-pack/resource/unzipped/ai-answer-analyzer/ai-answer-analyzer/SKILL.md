---
name: ai-answer-analyzer
description: Reverse-engineer why a specific Reddit thread got cited in an AI answer, so the pattern can be reproduced. Triggers when the user pastes an AI answer or a cited thread and asks "why did this get picked", "what made this citable", or "how do I get cited like this".
---

# AI Answer Analyzer

## When to use this skill
Trigger this skill when the user:
- Pastes an AI answer (from ChatGPT, Perplexity, Claude, or Google AI Overviews) that cited a Reddit thread
- Pastes a cited Reddit thread and asks why it got picked
- Wants the repeatable pattern behind a citation

## What this skill does
Breaks down a cited Reddit thread into the specific signals that likely earned the citation: the question match, the format, the specificity, the recency, and the social proof, then turns those signals into a checklist you can apply to your own threads.

## Inputs needed
1. The AI answer and / or the cited Reddit thread (required)
2. The query that produced the answer (required if known)

## Steps
1. Restate the query and identify which thread got cited and for what claim.
2. Score the thread against the citation signals: does the title match the query intent, is the answer specific and first-hand, is it recent or evergreen, does it have upvotes or replies confirming it, and is it formatted so a model can lift a clean answer.
3. Identify the single strongest signal and the weakest one.
4. Translate the pattern into a reusable checklist for the user's own threads.
5. Point out anything the user cannot easily replicate (for example, a huge upvote count) and what to do instead.
6. Output the breakdown.

## Output format
```
CITATION BREAKDOWN
Query: "<query>"
Cited thread: "<title>"

SIGNAL SCORECARD
- Query-intent match: <strong/weak> - <why>
- First-hand specificity: <strong/weak> - <why>
- Recency / evergreen: <strong/weak> - <why>
- Social proof: <strong/weak> - <why>
- Model-liftable format: <strong/weak> - <why>

STRONGEST SIGNAL: <one>
WEAKEST SIGNAL: <one>

REPRODUCE IT - checklist for your threads
[ ] <signal to copy>
[ ] <signal to copy>

NEXT STEP
Run `thread-to-content-converter` to turn your own best thread into a citable asset using this checklist.
```
