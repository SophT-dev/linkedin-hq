---
name: thread-to-content-converter
description: Turn your best-performing Reddit threads into FAQ-style content built to get picked up and cited by AI models. Triggers when the user pastes a thread and asks to "turn this into content", "make this citable", or "repurpose this thread for AI search".
---

# Thread-to-Content Converter

## When to use this skill
Trigger this skill when the user:
- Pastes a Reddit thread that did well and wants to repurpose it
- Says "turn this into an FAQ", "make this citable", or "repurpose this for AEO"
- Wants owned content that reinforces a thread AI models already trust

## What this skill does
Converts a strong Reddit thread into clean, question-led FAQ content structured the way answer engines like to cite: a clear question, a direct first-sentence answer, then supporting specifics. It keeps the real-experience voice that made the thread work.

## Inputs needed
1. The Reddit thread (title + top content) (required)
2. Where the content will live (blog, docs, help center) (optional)

## Steps
1. Restate the thread and the question it answered.
2. Extract the core question and phrase it the way a buyer would type it into ChatGPT.
3. Write a direct answer in the first one or two sentences. Answer engines lift the opening, so the answer goes first, not the setup.
4. Add the supporting specifics from the thread: steps, numbers, and real detail that make it trustworthy.
5. Generate 3-5 related follow-up questions and short answers to widen the citation surface.
6. Add clean formatting cues (H2 questions, short paragraphs) so a model can parse it.
7. Keep the honest, first-person register. Do not sand it into brand copy.
8. Output the FAQ content.

## Output format
```
FAQ CONTENT - built to be cited

PRIMARY QUESTION (H2): <buyer-phrased question>
Answer: <direct answer in 1-2 sentences>
Supporting detail: <specifics from the thread>

RELATED QUESTIONS
Q: <follow-up>
A: <direct answer>
Q: <follow-up>
A: <direct answer>

PUBLISHING NOTES
- Put the answer in the first sentence under each question.
- Keep paragraphs short so models can lift a clean snippet.

NEXT STEP
Run `ai-answer-analyzer` in a few weeks on any AI answer that starts citing this to confirm the pattern is working.
```
