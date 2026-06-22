# Content System — how all posts, GIFs & lead magnets are stored
**Approved:** 2026-06-23 (Option A). **Owner:** Claude maintains this.
**Scope now:** LinkedIn (Taha + Sophiya). **Platforms to dominate (roadmap):** LinkedIn → X → Substack (newsletter) → YouTube → IG. **Built to scale to:** all of these + more team profiles, with zero rebuild of the index.

---

## The two layers

### Layer 1 — The Registry (source of truth)
One row per piece of content. **Now:** [REGISTRY.md](REGISTRY.md) (human-readable, I update by hand).
**Later:** a Supabase `content` table (created with the Brain MVP) — same fields, and AUTO-9 auto-writes performance. Because the registry is platform-agnostic, **it never has to be rebuilt as we scale — only files relocate.**

Fields: `id · creator · platform · status · format (F1-F9) · funnel · hook · post_file · visual/gif · lead_magnet + url · source_signal · posted_url · posted_at · performance · tags · notes`

Status flow: `idea → approved → drafted → scheduled → posted → repurposed`

### Layer 2 — The Asset Store (the files)
```
linkedin-hq/content/
├─ REGISTRY.md              ← master index (Layer 1, interim)
├─ CONTENT-SYSTEM.md        ← this file
│
│  STUDIO (working area — render tool + shared assets + editable sources)
├─ make-gif.cjs            ← HTML → GIF renderer (ffmpeg-static + puppeteer)
├─ package.json / node_modules
├─ assets/                 ← shared brand assets: bleedai-logo-white.png, bleedai-drop.png, taha.jpg
├─ toolstack-*.html        ← editable source visuals (reference assets/ relatively)
│
│  POSTS (finished, organized deliverables)
├─ posts/
│   ├─ taha/
│   │   └─ linkedin/
│   │       └─ 2026-06-23-tool-stack/      ← one folder per post
│   │           ├─ post.md                 ← the copy (as published) + comments + sources
│   │           ├─ tool-stack.gif          ← the deliverable you upload (self-contained)
│   │           └─ meta.json               ← the registry row for this post
│   └─ sophiya/
│       └─ linkedin/
│
└─ shared/
    └─ lead-magnets/        ← built ONCE, reused across posts/creators (link stored in registry)
```

**Why studio vs posts:** editable source HTMLs live at the studio root (so their relative `assets/` paths work + the render tool sits beside them). The **finished GIF** (self-contained) gets copied into the post folder — that's the portable deliverable. `meta.json` points back to the source via `visual_source`.

---

## Conventions
- **Post folder name:** `YYYY-MM-DD-slug` (e.g. `2026-06-23-tool-stack`).
- **Path:** `posts/<creator>/<platform>/<post-slug>/`.
- **Every post folder has:** `post.md` + the deliverable (`*.gif`) + `meta.json`.
- **Lead magnets:** never duplicated per post — built once in `shared/lead-magnets/`, the live URL stored in the registry + meta.json.
  - **Default format (decided 2026-06-23): on-brand PDF** — designed dark/red, droplet + Taha footer, rendered HTML → PDF via puppeteer (same engine as the GIF tool). Premium + tangible + frictionless to DM. NOT plain Notion. Use a hosted landing page only if email capture is wanted.
  - **Pending build:** "2026 Cold Email Stack — 3 budget levels" PDF for the tool-stack post (contents scoped in that post's notes). Parked as a future task.
- **Brand assets:** one shared copy in `assets/` — never invent brand colors/logos per post (master = `../../Bleed AI Branding/BRAND.md`).

## Render a visual to a LinkedIn GIF
```
cd linkedin-hq/content
node make-gif.cjs <source.html> <out.gif> [width] [fps] [recMs] [winStart] [winLen]
# then copy the gif into the post folder + add a registry row
```

---

## How it scales (the future asks)
- **More platforms:** add a subfolder (`posts/taha/x/…`, `posts/taha/substack/…`, `posts/taha/youtube/…`) + set `platform` in the registry. No rebuild. (Substack = long-form/newsletter; a winning LinkedIn post often expands into a Substack issue — repurpose lane.)
- **More team profiles:** add a top-level creator folder (`posts/<name>/…`) + a voice profile per person (kept with the linkedin-batch skill). Each person isolated; everyone shares `assets/` + `shared/lead-magnets/`.
- **When platform #2 ships (Option A):** promote `content/` to a dedicated `social-hub/` project and move the files. The Supabase registry stays put, so nothing breaks — only assets relocate.
- **Performance loop:** AUTO-9 (Brain MVP) writes likes/views into the registry → Format Library scoreboard updates → better pitches. Until then I log performance by hand in REGISTRY.md.

## Lifecycle (end to end)
Brain surfaces idea → I pitch idea-pair → Sophiya approves → I write `post.md` + render GIF + build lead magnet (shared/) → save post folder + registry row → Sophiya posts → log `posted_url` + performance → winners flagged for repurpose.
