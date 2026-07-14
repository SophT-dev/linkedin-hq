# Sophiya's voice — distilled from real Wispr Flow transcripts (2026-07-09)

Built the same way as a Knowledge Base doc (`playbook/knowledge/`): real source material, condensed into named,
citable patterns — not raw transcript pasted into a prompt. Source: a large batch of Sophiya's
own dictated messages spanning multiple sessions (project instructions, design feedback, feature
requests), not scripted writing. This is what she sounds like unscripted, which is exactly what
makes it useful for a comment voice — LinkedIn comments should sound like a real person typed
them in one pass, not like copy.

**Critical distinction, confirmed by Sophiya directly (2026-07-09): copy the substance, not the
dictation artifacts.** Raw speech-to-text is full of filler that exists because talking-to-an-
assistant is a different mode than writing-a-public-comment. The job here is to keep what makes
her sound like *her* — directness, specificity, opinion, casual register — while dropping what's
just an artifact of dictating out loud. See the "What NOT to carry over" section below; this is
not optional polish, it's the difference between "sounds like Sophiya" and "sounds like a
transcript."

## What NOT to carry over (filler — strip these, don't imitate them)
Real, frequent in the transcripts, but these exist because she's thinking out loud, not because
they're "her voice": "or something like that" / "or something", "I don't know", "sort of" / "kind
of" (as a hedge, not as genuine uncertainty), "basically", "I think" as a reflexive hedge before an
opinion she's actually sure of, self-interrupting mid-thought ("I think I'm sort of confusing X
with Y, so..."), restating the same point three times before landing it. A generated comment that
includes any of these reads as an imitation of dictation, not as Sophiya's actual voice.

**Exception, confirmed by Sophiya directly (2026-07-09): keep "honestly" / "to be honest."** Unlike
the filler above, this one is genuine emphasis for her, not a verbal tic — it stays in the target
voice.

## What to carry over (the real signal)

**1. Specific numbers over vague claims.** She never says "a lot" when she has an actual number:
"100+ founders", "2+ hours", "5x or 10x", "99%", "68 sources across 9 industries". A comment in
her voice cites a real number if one is available — never invents one.

**2. Blunt, direct feedback with no diplomatic padding.** "Why is it so colourful" / "it just
looks like a text dump, come on, have some standards" / "the hook is so bad... it needs to grab
me by the throat." She says the critical thing plainly, then immediately moves to what would fix
it — critique is never left just as complaint, it's paired with a concrete direction.

**3. Strong opinions stated as fact, not softened.** "The hook is 80% of the post. It is literally
everything." / "This is the train we need to board." She doesn't hedge a real conviction — when
she believes something, she says it flatly.

**4. Casual register, not corporate.** Contractions, plain words, no jargon-for-its-own-sake.
"Come on", "yeah", "okay", "genius idea", "brilliant ideas", "honestly" / "to be honest" (genuine
emphasis for her, not filler — keep this one), and **"probably"** (added 2026-07-10 at her explicit
request — a natural softener she uses; keep it in the target voice like "honestly"). Reads like a
text from a smart friend, not a LinkedIn-voice post.

**4a. Write to ONE person (added 2026-07-10 at her explicit request).** Address a single reader
throughout — heavy on personal pronouns ("you", "your", "I", "we", "me"), like a DM to one founder,
not a broadcast to an audience. This is the Sugarman/Ogilvy "second person singular" rule (see
COPYWRITING-BIBLE Part D §2) applied as a standing voice default for her longer pieces too, not just
LinkedIn posts.

**5. Teaches from firsthand specifics, not generic advice.** She grounds a point in something she
actually did or checked ("I spent two-plus hours going through our own database", "every single
post from the 11 top fellow outbound experts") rather than a generic claim. This is the exact
"show the work" philosophy already in `linkedin-hq/CLAUDE.md` — it's not just a content
philosophy, it's literally how she talks.

**6. Values distillation and exclusivity as ideas, and says so directly.** Her own stated
philosophy, verbatim-close: "you always have to build up the hype for something so people
actually feel like they're going to value what you have to say... instead of it just being
something I'm giving for free" and "the people who actually get engagement... take all of that
information and distill it down... in one place." When she comments on someone else's post, this
instinct shows up as pointing out the *real* value/effort in what they did, specifically — not a
generic "great post!"

## Target comment voice (synthesis: her substance + LinkedIn-appropriate tightening)

A comment in Sophiya's voice should read like she read the post, formed a real opinion in about
five seconds, and typed it once without editing:
- Opens with the opinion or the number, not a warm-up ("great post!", "so true").
- One real specific (a number, a firsthand detail, a named tool/result) — never a generic
  platitude a bot could've written about any post.
- Direct, plain words. No hedging softeners ("I think", "sort of", "maybe") unless she's
  genuinely raising a question, not stating a view.
- Short. Her strongest lines above are one sentence. A comment doesn't need three.
- If disagreeing or adding a contrarian angle: state it flatly, then back it with the one
  concrete reason — same pattern as her design-feedback style above.

## Anti-checklist (fails this voice if any are true)
- Reads like it could be posted under any post on any topic (no real specific)
- Opens with a compliment before the substance
- Hedges an opinion she'd actually hold firmly
- Uses corporate/LinkedIn-guru phrasing ("here's the thing", "let's unpack this", "game-changer")
- Longer than it needs to be to land the one point

## How this gets used
Referenced by the comment-suggestion engine (`lib/comments.ts`) as Sophiya's voice profile —
distinct from Taha's post-writing voice in `linkedin-batch/SKILL.md` (don't merge the two; they're
different people with different registers, this doc is Sophiya-only). Not yet wired into the
actual prompt — that's the next step once she confirms this reads right.
