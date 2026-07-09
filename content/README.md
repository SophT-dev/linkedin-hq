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
- `assets/` — shared brand images referenced directly by the HTML sources above (logo, droplet,
  meme templates) — keep flat for the same relative-path reason. Master brand:
  [`../../Bleed AI Branding/BRAND.md`](../../Bleed%20AI%20Branding/BRAND.md).
  - `assets/people/<name>/` — raw reference photos for a person (candid shots, headshot options),
    separated out from the brand-master assets above them. **Known gap:** several HTML sources
    reference `assets/taha.jpg` directly, but no file by that exact name exists — pick one from
    `assets/people/taha/` and save/export it as `assets/taha.jpg` to fix the broken headshot.
- `posts/<person>/linkedin/<date>-<slug>/` — the **finished rendered deliverables** (final PNG/GIF/
  proof screenshot) for one published post, one folder per post. The matching editable `.html`
  source stays at the content root (see above) — the folder name here matches its Posts-tab row.
- `lead-magnets/` — lead-magnet outline/body markdown, one flat file per doc (small volume, no
  per-post folders needed yet).
- `inspo/` — loose style-reference dump, not tracked content (see its own README).

## Render a visual → LinkedIn GIF or PNG
```
cd linkedin-hq/content
node make-gif.cjs <source.html> <out.gif> [width] [fps] [recMs] [winStart] [winLen]
node render-png.cjs <source.html> <out.png>
```
Ship the **GIF only** to LinkedIn (no MP4). Save the final render straight into that post's
`posts/<person>/linkedin/<date>-<slug>/` folder, then log/update the post row in the Sheet's Posts
tab (`posted_url`, etc.) — same system as the rest of `linkedin-hq/CLAUDE.md`'s Content System.

## Cleanup rule
Only prune a stale/draft render **after** that specific post has actually published — never before
(an in-progress draft's earlier iterations may still be needed for comparison/revert). Nothing in
this folder was deleted during the 2026-07-09 reorg, only moved into the per-post folders above;
ask before deleting anything that looks like a leftover draft.
