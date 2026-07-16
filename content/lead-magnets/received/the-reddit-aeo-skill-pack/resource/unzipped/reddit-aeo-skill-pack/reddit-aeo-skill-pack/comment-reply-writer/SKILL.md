---
name: comment-reply-writer
description: Write comment replies that build trust inside existing Reddit threads without tripping mod filters or getting the account banned. Triggers when the user pastes a thread or comment and asks how to reply, wants to "join this conversation", or asks for a native comment that adds value.
---

# Comment Reply Writer

## When to use this skill
Trigger this skill when the user:
- Pastes a Reddit thread or comment and asks how to respond
- Says "help me reply to this", "join this conversation", or "comment without getting banned"
- Wants to build presence in threads rather than post new ones

## What this skill does
Writes a genuinely helpful reply that answers the person in front of you first, earns trust, and only mentions your product if it is the honest best answer and the thread allows it. Includes a read on ban risk so you do not torch the account.

## Inputs needed
1. The thread title and the comment you are replying to (required)
2. What you genuinely know that helps (required)
3. Optional: product, only mentioned if it is truly the right answer

## Steps
1. Read the comment and identify what the person actually needs. Answer that first, fully, with no strings.
2. Add one specific detail from real experience that a generic reply would miss. Specificity is what earns trust on Reddit.
3. Decide honestly whether a product mention helps this person. If it does not, leave it out entirely.
4. If a mention is warranted, disclose it plainly ("full disclosure, I work on X") and keep it to one sentence.
5. Match the length to the thread: short threads get short replies. Do not write an essay under a one-line comment.
6. Run a ban-risk check: repeated links, copy-paste phrasing, or pushing product in a strict sub all raise the risk. Flag it.
7. Output the reply plus the risk read.

## Output format
```
REPLYING TO: "<comment>"

REPLY:
<helpful answer first>
<one specific real detail>
<optional one-line disclosed mention>

BAN-RISK READ: <low / medium / high>
- <what raises the risk here, if anything>
- <safer alternative if high>

NEXT STEP
If the thread mentions competitors, run `competitor-thread-finder` to find more like it.
```
