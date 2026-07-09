# Sub-skill: pinned comment + meme

Read by `linkedin-post/SKILL.md`'s new Phase 7, right after a draft is approved (Phase 6) and
before saving (Phase 8). Job: produce a meme that's actually relevant to that specific post's
angle — not a generic reaction image. **One job only** (Sophiya's correction, 2026-07-08): the
pinned comment is the meme, nothing else. No link, no CTA text in it.

**Standing rule (Sophiya's call, 2026-07-08): every approved draft gets a pinned comment + a meme,
every time, not just on request.**

## Lead magnet delivery — comment-to-DM, not a link anywhere public

**Correction (Sophiya, 2026-07-08): the lead magnet is never linked in the post or the pinned
comment.** Delivery is manual: the post body's own CTA (its `lead_magnet.cta` line, e.g. `comment
"TAM" and I'll send it over`) asks people to comment a keyword, and Sophiya/Taha DM the actual
resource to each commenter by hand. This is the same comments-to-claim mechanic as F3 Free
Giveaway in `FORMAT-LIBRARY.md`. So there is no link to place anywhere at publish time — the
pinned comment's only job is the meme. (`COPYWRITING-BIBLE.md`'s link-placement rule — never a URL
in the post body — is a moot point here since no link is posted publicly at all; it still applies
normally to posts that DO link out directly.)

## The pinned comment itself

- Just the meme (see below) plus, if it needs one, a one-line caption — short, same voice rules
  as the post (no em dashes, no banned words/phrases), warm and a little self-aware.
- Never include a link or restate the CTA here — that lives in the post body only.

## The meme — real capability, not invented

**Default: the HTML→GIF render pipeline**, same as always — `content/make-gif.cjs` (puppeteer +
ffmpeg-static, already used for every brand visual in this project). For a meme, this means an
**original graphic built from scratch as HTML**, in the *format/joke structure* of a well-known
meme (expanding brain, expectation-vs-reality, drake-style two-panel, etc.) — never a re-hosted
copy of someone else's actual template image. This is honest: cite which meme format inspired the
structure, don't claim to be using the real template. Stick to this default for most memes — it's
simple, fast, and matches how every other brand visual gets made here.

**If a meme genuinely needs real illustration or a photo-real gag** (not just styled text/shapes),
`visual-generation.md` in this same folder (added 2026-07-09) now has an actual AI-illustration
path — this used to be a real gap ("no image-generation tool available"), it no longer is. Reach
for it only when the HTML-built default can't do the joke justice; don't default to it for a
simple meme.

Steps:
1. Pick a meme **format** that actually fits this post's specific angle — not a default. Ask: what
   is this post's core tension (a mismatch, an escalation, a before/after)? Match the format to
   that tension.
2. Write the source HTML in `content/sources/` (same pattern as the existing `toolstack-*.html`
   files — references `../assets/` and, if using a raw meme template image, `../meme-templates/`,
   both one relative `../` hop up — uses Bleed AI brand colors/fonts per BRAND.md, one red accent,
   dark background, Inter/Instrument Serif). A reusable raw meme template image (not tied to this
   one post) goes in `content/meme-templates/`, not inline in the post's own folder.
3. Render it (absolute path required, see `content/README.md`):
   `cd content && node make-gif.cjs <absolute-path-to-sources/meme.html> <out.gif> [width] [fps]`
   (a short, simple loop, or even a single still frame if the joke doesn't need motion — check
   `make-gif.cjs` usage notes for a near-zero-motion setting if so).
4. Save the final rendered file into
   `content/posts/<person>/linkedin/<date>-<slug>/pinned-comment/` — not flat in `content/`.
5. Attach the rendered GIF to the pinned comment (or as a reply to it) alongside the link.

## Output

For each approved draft, hand back: the pinned comment text (with CTA link placeholder if a lead
magnet applies), the meme's format/concept + why it fits this post, and the rendered file path
once built. If the joke doesn't actually land for this angle, say so rather than forcing one —
not every post needs to be funny, but the standing rule is to always attempt one and use judgment
on whether it's genuinely relevant before shipping it.
