# content/ — the render workshop

This folder is **production tooling**, not a flat dump. The record of what we've posted, its
stats, and what worked lives in the **Posts tab** of the linkedin-hq Google Sheet (columns L-Q) —
see the main `linkedin-hq/CLAUDE.md`. (The old Notion "Content Command Center" this README used to
point to is retired as of Stage 12.)

## What lives here
- `make-gif.cjs` / `render-png.cjs` + `package.json` + `node_modules/` — the HTML→GIF/PNG renderer.
- `*.html` at the root (`toolstack-*.html`, `tam-*.html`, etc.) — **editable source visuals**.
  These stay flat here on purpose: they reference `assets/*.png` etc. with a relative path, so
  moving them into a subfolder would break every image reference. Re-render anytime from here.
  Don't assume an html file with no rendered output is dead — grep for its filename across
  `.claude/skills/`, `scripts/`, and any `meta.json` before deleting (confirmed real 2026-07-09:
  `toolstack-budget-tiers.html` is `make-gif.cjs`'s literal default arg *and* a real post's
  `visual_source`; `tam-pie-visual.html`/`tam-pie-visual-branded-day.html` are cited by name in
  `.claude/skills/linkedin-post/brand-compliance.md` as the canonical brand-drift example).
- `assets/` — shared brand images referenced directly by the HTML sources above (logo, droplet)
  — keep flat for the same relative-path reason.
  - `assets/people/<name>/` — raw reference photos for a person (candid shots, headshot options).
  - `assets/taha.jpg` — the canonical headshot several HTML sources reference; keep this exact
    filename current if the photo changes.
- `meme-templates/` — **raw, reusable meme template images** (e.g. `galaxy-brain-template.jpg`),
  not tied to any one post. Referenced by post HTML sources with a relative path
  (`meme-templates/<file>`, since it's a sibling of the root). Add new templates here as you find
  them.
- `posts/<person>/linkedin/<date>-<slug>/` — one folder per post. Two conventions coexist right
  now, both valid, pick whichever fits:
  - **Older/simpler** (e.g. `2026-06-23-tool-stack/`, `2026-07-01-fewer-tools/`): a `meta.json`
    (id/status/hook/posted_url/performance/etc.) + `post.md` + the final GIF sitting flat in the
    folder.
  - **Newer, split by kind** (e.g. `2026-07-08-tam-tools/`, added 2026-07-09 per Sophiya's ask —
    this is now the default going forward):
    - `media/` — **only the actual final published visual.** If the real published image differs
      from anything rendered here (e.g. it got hand-annotated after export — confirmed happening
      2026-07-09), pull the real one straight off the live post (right-click → copy image
      address, or a signed CDN URL Sophiya sends) rather than assuming a local render is "the"
      final.
    - `pinned-comment/` — the meme/visual actually used in that post's pinned first comment.
    - `proof/` — a screenshot of the live published post (not a design asset).
  - Neither convention nests a `drafts/` folder going forward — once a post is published, an
    unused draft variant should either get deleted (see Cleanup rule) or, if genuinely worth
    keeping for reference, said so explicitly rather than left in a silent pile.
- `lead-magnets/` — lead-magnet outline/body markdown, one flat file per doc (small volume, no
  per-post folders needed yet).
- `inspo/` — loose style-reference dump, not tracked content (see its own README).

## Producing a new visual (2026-07-09)
Don't start from a blank HTML file. Read
`.claude/skills/linkedin-post/visual-generation.md` first — it classifies the content type
(structured/data-heavy, proof/screenshot, simple/iconographic, animated/GIF, photo-real Taha, or
AI-illustrated) and routes to the right path: Claude Design (manual handoff — brand setup is
`../../Bleed AI Branding/CLAUDE-DESIGN-SYSTEM.md`, paste once per dark/day mode), hand-coded HTML
in this folder, or the `image-gen` Claude Code plugin for illustration/photo-real work. Real
reference examples for each content type live in `inspo/` (see its own `README.md`). Whichever
path produces the HTML, it still lands here flat and renders the same way below.

## Render a visual → LinkedIn GIF or PNG
```
cd linkedin-hq/content
node make-gif.cjs <source.html> <out.gif> [width] [fps] [recMs] [winStart] [winLen]
node render-png.cjs <source.html> <out.png>
```
Ship the **GIF only** to LinkedIn (no MP4). Save the final render into that post's
`posts/<person>/linkedin/<date>-<slug>/media/` folder (or update `meta.json` for the older
convention), then log/update the post row in the Sheet's Posts tab (`posted_url`, etc.).

## Cleanup rule
Only prune a stale/draft render **after** that specific post has actually published — never before
(an in-progress draft's earlier iterations may still be needed for comparison/revert). Deleted
2026-07-09, all for already-published posts: `toolstack-visual.html` (confirmed zero references
anywhere in the repo — genuinely abandoned), and two superseded pie-chart draft PNGs for the TAM
post (neither matched the real published image once compared against it directly). When in doubt,
grep first (see the note under "What lives here" above) — don't delete an html file just because
it has no rendered output sitting next to it.
