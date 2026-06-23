# content/ — the render workshop

This folder is **production tooling only**, not an archive. The record of what we've posted, its
stats, and what worked lives in the **Bleed AI Notion "Content Command Center"** — I read + write it
via [`../../bleed-ai-brain/scripts/`](../../bleed-ai-brain/scripts/). Keeping finished work in Notion
(not here) is what stops this folder from bloating.

## What lives here
- `make-gif.cjs` + `package.json` + `node_modules/` — the HTML→GIF renderer.
- `assets/` — shared brand images (logo white, droplet, taha.jpg). Master brand: [`../../Bleed AI Branding/BRAND.md`](../../Bleed%20AI%20Branding/BRAND.md).
- `toolstack-*.html` (and future `*.html`) — **editable source visuals**. They reference `assets/` relatively, so they stay here next to the renderer.
- `posts/` — legacy/backup of the first post's deliverable (the tool-stack GIF). **Going forward, finished deliverables go to Notion, not here.**

## Render a visual → LinkedIn GIF
```
cd linkedin-hq/content
node make-gif.cjs <source.html> <out.gif> [width] [fps] [recMs] [winStart] [winLen]
```
Ship the **GIF only** (no MP4). Then log the post in Notion (the script does this).

## The rule going forward
Source HTML stays **local** (needed to re-render). The finished **GIF/PDF + all metadata + stats**
live in **Notion**. Re-render anytime here; download the deliverable from Notion to upload to LinkedIn.
Full system + the Notion schema: [`../../bleed-ai-brain/AUTOMATION-PLAN.md`](../../bleed-ai-brain/AUTOMATION-PLAN.md).
