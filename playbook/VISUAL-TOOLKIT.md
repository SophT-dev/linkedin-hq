# Visual toolkit — techniques, tools, and flows (reference, not mandate)

A catalog of tactical techniques and the tool landscape for LinkedIn visual production, gathered
from deep research and 7 creator transcripts (2026-07-09). Kept separate from
`.claude/skills/linkedin-post/visual-generation.md`'s mandatory gates so that skill file stays
lean — this is a menu to draw from, not a checklist to run every time. `visual-generation.md`
points here whenever a content type needs more range than its own procedural steps cover.

## Prompting techniques

- **Two-input prompting.** Give a style-reference image and a subject/product image together,
  rather than describing style in words alone — "make a visual for X in the style of this
  reference" is more reliable than a purely verbal style description.
- **JSON-structured prompting.** Turn a plain description into an explicit structured spec before
  generating — subject, style, palette, composition, typography, mood, anti-style — rather than a
  single prose paragraph. Useful for both the Claude Design brief and Custom-path prompts to
  Claude Code; more information-dense and less likely to drift between similar visuals.

## Precision editing

- **Claude Design's markup tool.** Circle one element on the canvas, then type a chat instruction
  to fix or remove just that piece — far more precise than re-prompting the whole visual over a
  small issue.
- **Claude Design's edit tiers.** Simple tab (direct text/color/font edits) for most tweaks, Pro
  tab for deeper customization, Code tab for raw CSS when nothing else reaches it.

## Consistency techniques (optional, not adopted by default)

- **Recurring character/motif.** e.g. always-from-behind, face never shown — a technique some
  creators use to fake visual consistency across AI-illustrated art without fighting per-image
  face/detail drift. Documented as an option; not adopted as a Bleed AI standing device (Sophiya's
  call, 2026-07-09).
- **The 6-element style-lock skeleton.** Palette, figure style, text treatment, iconography,
  motion style, anti-style/what-to-avoid — the general pattern behind
  `Bleed AI Branding/CLAUDE-DESIGN-SYSTEM.md`'s structure. Useful as a mental checklist any time a
  new visual direction is being locked for the first time.

## Carousel copy/structure formula (reference only, not active)

**Carousels are parked** (Sophiya's call, 2026-07-09 — zero carousels in the 32 real reference
visuals she flagged as winners). Kept documented here in case that changes later:

- 10-slide skeleton: hook → setup → reframe → value → value → climax → save-prompt → CTA,
  scalable down to 7 slides.
- Governing principles: one idea per slide; the cover does roughly 80% of the work.

## Model/tool choice notes

- Claude Opus with high reasoning effort tends to outperform Sonnet on design/artistic tasks —
  costs more usage, worth it for a visual that's about to become a locked template for a batch.
- Test at low/medium render quality before committing to a final high-res export — applies both
  to Claude Design and to AI-illustration provider calls (real money per generation).

## Real reference examples by content type

The 32 real LinkedIn visuals Sophiya flagged as winners in her space (cold email/GTM/AI agencies)
live in `linkedin-hq/content/inspo/`, categorized and cited by filename against each content type
in `visual-generation.md`'s Step A. Full categorized index with a one-line description of every
file: `linkedin-hq/content/inspo/README.md`. The same 32 are also logged in the real **Visual
Swipe** Sheet tab (see `linkedin-hq/CLAUDE.md`) for the permanent, tracked record. Point back here
whenever a content type needs a concrete "what does good actually look like" example instead of an
abstract description — this is the single most useful thing in this file.

## Tool landscape log

So this doesn't get re-researched from scratch later:

**In use:**
- Claude Design (manual handoff — see `visual-generation.md` Standing rule 3) — Fast path
- Claude Code hand-coded HTML/CSS/GSAP — Custom path, fully automatable, no template ceiling
- `image-gen` Claude Code plugin + Recraft V3 — AI-illustration path, fully automatable,
  pay-per-use via Sophiya's own API keys
- `linkedin-hq/content/render-png.cjs` / `make-gif.cjs` — the existing Puppeteer render pipeline,
  unchanged by any of the above

**Explicitly excluded, and why:**
- **Higgsfield MCP** — a paid subscription, repeatedly praised across creator transcripts for
  in-Claude illustration/video generation. Excluded per the standing no-new-paid-tools rule.
- **Vista Social** and similar all-in-one schedulers — paid subscriptions, also out of scope; not
  a visual-generation tool anyway, this is post-production distribution.

**Pay-per-use, not subscription — acceptable per Sophiya's original tool-budget answer:**
- The `image-gen` plugin's underlying provider API calls (e.g. Recraft V3) cost per generation via
  Sophiya's own API key, with no recurring commitment — distinct from a subscription tool like
  Higgsfield.
