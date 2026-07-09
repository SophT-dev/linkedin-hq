# Sub-skill: visual generation

Read by `linkedin-post/SKILL.md`'s Phase 7, right after a draft is approved (Phase 6) and before
the pinned-comment meme (Phase 8, `pinned-comment-meme.md`). Job: produce the post's own main
visual — **required for every post, no naked-text posts ship** (`Bleed AI Branding/BRAND.md` §4).
This is a different job from the meme sub-skill: this produces the actual 1080×1350 post visual;
`pinned-comment-meme.md` stays scoped to the small joke asset in the pinned comment only.

Also usable standalone, outside the `/linkedin-post` flow, whenever Sophiya just wants a visual
made from a raw idea — the phases below don't depend on anything `/linkedin-post`-specific except
where noted.

## Standing rules

1. **Design ONE first, always.** Whenever more than one visual of the same style is wanted in a
   run, generate exactly one, run it through the taste checklist below, and stop until Sophiya
   explicitly locks the direction — before making any more in that style. Never batch cold.
2. **Two-hop, never raw-idea-to-renderer.** Always produce the structured brief (Step A) before
   touching any renderer. Never paste a raw idea straight into Claude Design or straight into
   HTML.
3. **Claude Design requires a manual handoff — say so, don't pretend otherwise.** Claude Code
   cannot operate Claude Design's UI (no browser-automation or Claude Design API tool is
   connected). When the Fast path applies: hand Sophiya the finished brief, she pastes it into
   Claude Design herself and exports the HTML, then this skill resumes from that exported file.
   The Custom path and the AI-illustration path have no such gap — both are fully tool-callable.
4. **No carousels right now.** Every visual this skill produces is a single 1080×1350 asset
   (static, GIF, or annotated screenshot) — not a multi-slide sequence. (Parked per Sophiya's
   2026-07-09 call — see the plan doc if this changes.)

## Step A — idea formalizer + content-type classification

Take whatever raw, messy creative input Sophiya gives — a rambling idea, a mood, a half-formed
thought, or (for `/linkedin-post`) the draft's own `visual_brief` field — and turn it into a
structured brief **before touching any renderer**:

```
topic + goal: [what the visual needs to communicate, one sentence]
content_type: [see classification below]
mode: dark | day  (default dark — see CLAUDE-DESIGN-SYSTEM.md; day is experimental)
style adjectives: [pulled from BRAND.md §1's brand-energy line — "calm but sharp," "structured
  warmth with edge," etc. — never invented fresh]
aspect ratio: 1080x1350 (default, no exceptions per BRAND.md §4)
tone: [matches the post's own voice — see linkedin-batch/SKILL.md Voice Rules]
real assets to include: [specific files from content/assets/, if any]
```

### Content type — classify before routing

Ordered by real-world weight in the 32-visual reference set in `linkedin-hq/content/inspo/`
(heaviest first — see that folder's `README.md` for the full categorized index and
`playbook/VISUAL-TOOLKIT.md` for the pointer back to it):

- **Structured/data-heavy** (heaviest real-world signal). Dense text + layout: infographics,
  comparison tables, multi-section cards. Reference: `product-infographic-3-step-process.jpg`,
  `layered-tool-stack-infographic.jpg`, `before-after-comparison-table.jpg`,
  `cheat-sheet-team-breakdown.jpg`, `cold-email-playsheet-infographic.jpg`,
  `numbered-rules-playbook-browser-mockup.jpg`, `dashboard-leaderboard-lead-magnet-cover.jpg`.
- **Proof/screenshot (annotated).** Real captured UI — a DM, a cold email, a LinkedIn analytics
  panel, another post — used as the visual itself, often with a red circle/arrow calling out one
  specific number. Not a from-scratch layout and not an original photo; the artifact IS the proof.
  Reference: `dm-proof-plus-analytics-screenshot.jpg`, `before-after-post-growth-comparison.jpg`,
  `dm-conversation-proof-screenshot.jpg`, `cold-email-example-screenshot-german.jpg`,
  `cold-email-example-mobile-screenshot.jpg`, `linkedin-text-post-comparison-screenshot.jpg`,
  `revenue-growth-line-chart-card.jpg`, `annotated-email-breakdown-critique.jpg`. Also covers the
  **"screenshot style"** — a text post rendered as a styled dark quote-card mimicking a native
  platform post (`x-post-dark-screenshot-style.jpg`).
- **Simple/iconographic.** Minimal compositions (logo + arrow + logo). Reference:
  `hub-spoke-tool-logo-diagram.jpg`, `logo-plus-logo-tool-stack.jpg`, `logo-arrow-calendar-proof.jpg`,
  `title-card-funnel-with-dm-proof.jpg`, `formula-with-butterfly-collage-cover.jpg`.
- **Animated/GIF.** Motion via GSAP, existing `make-gif.cjs` path. Reference:
  `talking-head-counter-animation.gif`, `terminal-typing-screen-recording.gif`,
  `content-system-flowchart-animated.gif`, `outbound-flow-diagram-animated.gif`.
- **Photo-real (Taha).** AI-generated scenes of Taha in different situations, using his existing
  photos as image-to-image reference — not simple selection/cropping. Per BRAND.md §4's existing
  "AI photo direction": real face over an AI-generated dark, premium scene, or a real photo with a
  subtle warm-but-dark grade. Settings: desk/workspace, coffee shop, direct-to-camera — focused,
  candid, never posed/stock. Off-brand: anything in the Dark block's anti-style list.
- **AI-illustrated creative.** Open-ended illustrated ideas with no fixed template. Zero examples
  in the real reference set so far — in scope, just not yet validated by a real winning example.
- **Screen recording — out of scope for this skill.** Captured live product footage, not
  designed. Record and trim normally, then drop the finished file straight into the post's
  destination folder (see Step D) — no rendering pipeline involved.

## Step B — routing choice

- **Fast path — Claude Design** (manual handoff, see Standing rule 3). Best for
  structured/data-heavy. Bounded by its 5 template modes (Prototype/Slides/Document/Wireframe/
  Animation). Before this session's first Claude Design use, confirm with Sophiya whether the
  Design System is already set up in her account — if not, hand her the exact text from
  `Bleed AI Branding/CLAUDE-DESIGN-SYSTEM.md` to paste in once. Never re-explain brand
  colors/fonts inline in a per-visual prompt after that.
- **Custom path — hand-coded via Claude Code** (fully automatable, no manual handoff). Write
  bespoke HTML/CSS/GSAP from scratch in `linkedin-hq/content/`, following the same pattern as
  existing sources like `toolstack-roi-anim.html` — no template ceiling, since it's just code.
  This is the default path for **proof/screenshot (annotated)** (pure HTML/CSS + callout overlay,
  no reason to route through Claude Design at all) and for simple/iconographic and animated/GIF.
- **AI-illustration path — `image-gen` Claude Code plugin** (fully automatable, pay-per-use via
  Sophiya's own API keys — not a subscription). One-time setup: install the plugin, configure a
  Recraft V3 API key. Routes to providers including Recraft V3 for vector/brand-consistent
  illustration. Handles AI-illustrated creative content and photo-real Taha content via
  image-to-image generation.
  - **Taha reference photos:** use `content/assets/people/taha/` for the raw candid/headshot
    options; `content/assets/taha.jpg` is the one canonical headshot several HTML sources
    reference directly — keep that exact filename current if the chosen photo changes. Several
    files in `people/taha/` are `.heic` — convert to `.jpg`/`.png` first if the chosen provider's
    image-to-image endpoint doesn't accept HEIC.
  - Since this generates synthetic imagery of a real person, run one **extra** taste-checklist
    item for this content type specifically: face/likeness fidelity and artifact-free hands/
    anatomy, on top of the standard five checks below.
- All three paths converge on Steps C-E below — the fork only affects how the HTML/image gets
  produced, not what happens after.

## Step C — taste checklist (run before any visual counts as locked)

- [ ] Understandable in under 2 seconds
- [ ] Feels Bleed-AI-specific, not a generic template (BRAND.md §2's test)
- [ ] The visual explains the idea rather than just decorating the hook text
- [ ] Sophiya would actually post this today, no caveats
- [ ] The direction would scale across 5-10 more posts without breaking down for different content
- [ ] *(Photo-real Taha content only)* Face/likeness fidelity and artifact-free hands/anatomy

Fail any box: iterate on that one visual — Claude Design's markup tool (circle + chat, see
`playbook/VISUAL-TOOLKIT.md`) for the Fast path, a fresh two-hop brief otherwise. Never move to a
second visual of the same style with an unchecked box.

## Step D — save + render

**Standing rule (2026-07-09, per Sophiya — see `content/README.md` for the authoritative version;
don't duplicate these details elsewhere, just point back here):**

Editable HTML sources go in `linkedin-hq/content/sources/` (never the content root, never a
per-post subfolder — they reference `../assets/*` / `../meme-templates/*` with one relative `../`
hop, per `content/README.md`), named `<topic>-visual.html`. Before rendering:
- Verify the canvas is 1080×1350 (or pass explicit width/height args if a specific visual needs
  otherwise).
- For animated exports, name the root element `#stage` so `make-gif.cjs`'s existing screencast
  logic (which resets `#stage`'s transform, forces 1350px height, hides `.hint,.controls`) applies
  unchanged — **no changes needed to `render-png.cjs`/`make-gif.cjs` themselves**, both already
  accept any HTML file path; this is a content/naming convention, not a code change.

Render (both scripts need an **absolute** path — they don't resolve relative to cwd):
```
cd linkedin-hq/content
node render-png.cjs <absolute-path-to-sources/source.html> <out.png>
node make-gif.cjs <absolute-path-to-sources/source.html> <out.gif> [width] [fps] [recMs] [winStart] [winLen]   # if animated
```

Once the post actually publishes, move the finished render (not the source HTML) into the
matching subfolder of `content/posts/<person>/linkedin/<date>-<slug>/` — **never dump it flat**:
- `media/` — the post's own main visual, **only the actual final published file**. If the real
  published image ends up different from the local render (e.g. hand-annotated after export —
  this has already happened once), replace it with the real one pulled off the live post rather
  than keeping a near-miss local render in `media/`.
- `pinned-comment/` — the meme/visual actually used in the pinned first comment (see
  `pinned-comment-meme.md`).
- `proof/` — a screenshot of the live published post.
A raw, reusable meme template (not tied to one post) goes in `content/meme-templates/`, not inside
any single post's folder. The editable `.html` source stays in `content/sources/` for future
re-renders — never move it into the post folder.

## Step E — visual QA gate

After rendering, open the PNG/GIF and check for text overflow, clipping, misaligned elements, or
broken image references before calling it done — per Anthropic's own documented visual-feedback-
loop best practice for agent-generated visuals. Compare against the relevant
`linkedin-hq/content/inspo/` reference file for that content type as a quality bar.

## Output

Hand back to the orchestrator (or show directly to Sophiya if run standalone): the content type
used, which path (Fast/Custom/AI-illustration), the rendered file path, and confirmation the taste
checklist passed. If any checklist item failed and couldn't be fixed, say so explicitly rather
than shipping a visual with a known issue.
