---
name: lm-repurpose
description: Turn a lead magnet in the vault into an original Bleed AI post + visual + our-own lead magnet, by copying a PROVEN combination (format × structure × visual × CTA) and swapping in our substance. Use when Sophiya says "/lm-repurpose", "repurpose this lead magnet", "make a post about <topic> from the vault", "repurpose <creator>'s post", or points at a received-magnet slug. Repurposes the three parts (content, visual, lead magnet) SEPARATELY, never copies the source wording, and reuses linkedin-post's sub-skills + linkedin-batch's Phase 8 build pipeline rather than rebuilding them.
---

# lm-repurpose skill — the repurpose engine

You are turning a lead magnet Sophiya earned (in the vault at `content/lead-magnets/received/`) into
an original Bleed AI asset. The core idea: the vault items are proof of what *combinations* pull —
a specific format × structure × visual × CTA mechanic. This skill copies the **combination**, not
the words, and refills it with our substance (cold email, outbound, AI-automation, running the
agency). One vault winner in → one post draft + visual brief + our-own lead magnet out.

**Same project as `/linkedin-post`, `/linkedin-batch`, `/lm-intake`.** Read `../linkedin-post/SKILL.md`
for the Vercel app / Google Sheet architecture and read the Sheet via
`node scripts/read-tab.mjs --tab "<name>" [--range A1:AZ1000]`. Path on disk:
`c:\Users\sophi\Downloads\SOPH VS Code\linkedin-hq`.

## Standing rules (read before Phase 1)

1. **Repurpose the three parts SEPARATELY (the core rule).** CONTENT, VISUAL, and LEAD MAGNET each
   get their own pass in Phase 3 — never one blended "make it ours" step. The source is deconstructed
   into all three, then each is rebuilt on our substance independently.
2. **Copy the combination, never the wording.** Same format + structure + visual_type + CTA mechanic
   as the source; completely our own hook, body, and examples. If a draft echoes the source post's
   phrasing, it's a fail — rewrite it. Cite the source in internal notes only ("mechanics from
   &lt;creator&gt;, &lt;post url&gt;"), never in the published copy.
3. **No original hooks, no original structures.** Same standing rule as `/linkedin-post`: every draft
   traces to a real Template Library hook row (or F-number) AND one named structure S1-S5. Never
   freehand either.
4. **Topic guardrail.** Every angle must be cold email / outbound / email marketing / AI-automation /
   running the agency, or a clear ADJACENT topic per `../linkedin-batch/SKILL.md`'s Voice Rules. If
   the vault item's topic can't map onto our lane, say so and propose the nearest one — don't force it.
5. **Never rebuild pipelines that exist.** Voice = `../linkedin-batch/SKILL.md` Voice Rules (single
   source of truth, never duplicated). Brand gate = `../linkedin-post/brand-compliance.md`. Visual =
   `../linkedin-post/visual-generation.md`. Meme = `../linkedin-post/pinned-comment-meme.md`. Lead
   magnet build = `../linkedin-batch/SKILL.md` Phase 8. Read each fresh when its phase comes up.
6. **ONE review gate, not per-sub-part.** Draft all three parts + the meme concept for the item, then
   present once (Phase 4). Don't stop and ask after CONTENT, then again after VISUAL — assemble the
   whole thing and review it together.
7. **Show progress as a visible checklist.** Call `TodoWrite` at the start of every run with the 5
   phases (SELECT · DECONSTRUCT · REPURPOSE ×3 · OUTPUT · WRITE-BACK) as todos, one `in_progress` at
   a time.

**Before Phase 1: create the todo list.** `TodoWrite` all 5 phases (content = imperative, e.g.
"Select the vault item"; activeForm = present continuous). Mark Phase 1 `in_progress`.

---

## Phase 1 — SELECT (resolve her ask to a vault item)

Turn whatever she said into a ranked shortlist of vault items.

1. **Grep the vault frontmatter across BOTH shapes** (legacy migration is lazy, so both exist):
   - folder notes: `content/lead-magnets/received/*/notes.md`
   - legacy flat notes: `content/lead-magnets/received/*.md`
   Match her topic to `lm_type` / `domain` / `tools_mentioned` / title. If she named a creator, match
   `source_person`. If she gave an explicit slug, skip the ranking and use it directly (still run
   Phase 2 on it).
2. **Cross-check the Sheet** for richer engagement data:
   `node scripts/read-tab.mjs --tab LeadMagnets --range A1:AZ1000`, filter (by header name, never
   column position) to `kind=received`. Join to the vault rows by `slug` / `vault_path`.
3. **Rank by proven pull:** `post_likes + post_comments×3` (the same house formula the winner score
   uses — comments count 3×). Highest first.
4. **Present the top 3-5 candidates** — title · creator · format/structure · likes/comments · why it's
   a strong repurpose. Then stop:

   > pick one to repurpose, or point me at a different vault item / topic.

   (If she gave an explicit slug, skip this gate — confirm the pick in one line and move on.)

## Phase 2 — DECONSTRUCT (name the viral combination)

From the chosen item's `notes.md` (and Sheet row), state the combination plainly:

```
combo: F# × S# × <visual_type> × <lm_type> × <cta mechanic>
why it worked: [1-2 sentences — the specific reason this combo pulled, from the notes' "Why it
  worked" / Key takeaways, not a guess]
```

Then reconcile with **`../../playbook/PROVEN-COMBOS.md`**:
- If a row already matches this combo → **append this item's evidence** to that row's evidence cell
  (creator · post · engagement) and bump its `last_updated`.
- If no row matches → **add a new `proven-by-others` row** (next `combo_id`, all columns filled,
  `last_updated` = today). Keep the file's column order and status vocabulary intact.

This keeps the matrix growing off real vault data, not just the seed set.

## Phase 3 — REPURPOSE ×3 (three separate passes)

Do all three; each is its own pass on our substance. Nothing echoes the source's wording.

### 3a — CONTENT
Write our post in the **same format + structure** as the source.
- Pull a real hook template from the Template Library
  (`node scripts/read-tab.mjs --tab "Template Library"`, filter to a matching domain) — adapt, never
  copy verbatim. Cite the row/F-number it's built from.
- Follow the named structure's rhythm rules exactly (`../../playbook/POST-STRUCTURE-LIBRARY.md`,
  S1-S5) — same layout the source used, our words.
- Apply **Voice Rules** (`../linkedin-batch/SKILL.md`) and run the **brand gate**
  (`../linkedin-post/brand-compliance.md`) before it counts as done.
- Ground it in a real fact (WinsLog / Intel / a Knowledge Base doc) — never an invented stat.
- Substance = Bleed AI cold email / AI-automation. Same mechanics as the source, our substance.

### 3b — VISUAL
Write a brief for the **same `visual_type`** as the source, adapted to our brand.
- The source's own visual is in the vault item's `assets/` — reference it for structure only.
- Follow `../linkedin-post/visual-generation.md` (content-type classification, routing, the
  `content/sources/` → `make-gif.cjs`/`render-png.cjs` render paths). This phase produces the
  **brief**; actual rendering happens later, on approval, exactly as that sub-skill describes — don't
  duplicate its steps here.

### 3c — LEAD MAGNET
Give her a resource to DM.
1. **First try to match an EXISTING own magnet** — read
   `node scripts/read-tab.mjs --tab LeadMagnets --range A1:AZ1000`, filter to `kind≠received` (our
   built magnets), or scan the our-built items under `content/lead-magnets/`. If one fits the post's
   promise, reuse it (cite its `landing_url` / slug).
2. **Else write a build brief** (title + hero + what-you-get + who it's for) and hand off to
   **`../linkedin-batch/SKILL.md` Phase 8** for the full build (deep research → outline → approve →
   body → approve → Notion → LeadMagnets row → landing page). **Never rebuild that pipeline** —
   follow it exactly.

## Phase 4 — OUTPUT (one review gate)

Present the whole thing together, once:
- **Post draft** — hook + body (in its S#), with `built_from` (Template Library row / F# + S# + the
  real fact it cites) and `funnel_stage`.
- **Visual brief** — from 3b, content-type + intended path noted.
- **Lead magnet** — 2-3 options, **one starred** (an existing own magnet if 3c found one, else the
  build brief).
- **Pinned-comment meme concept** — per `../linkedin-post/pinned-comment-meme.md` (concept + which
  meme format fits this post's tension + why). No link/CTA in the pinned comment; delivery is
  comment-to-DM via the post body's own CTA line.

Say:

> review time. tell me what to change, or "approve" to lock it in (and which lead magnet).

Loop on edits until approved.

**After approval:**
1. **Append a Post Ideas row** via the Sheet. Read the Post Ideas column order first
   (`node scripts/read-tab.mjs --tab "Post Ideas" --range A1:Z1`), then write:
   `suggested_format` = "F#+S#" · `funnel_stage` · `tags` = "&lt;visual_type&gt;,&lt;lm_type&gt;,repurpose" ·
   `lead_magnet_ideas` = the starred option · `source` = the vault path · `status` = "unused".
2. **Optionally hand the draft into `/linkedin-post`'s save flow** if she wants it scheduled now
   (its Phase 9 save-to-Posts + lead-magnet handoff) — only on her say-so, don't auto-schedule.

## Phase 5 — WRITE-BACK (close the loop)

1. **Fill the vault item's `## Repurpose notes`** section in its `notes.md` — what we made, the date,
   and the Post Idea reference (or post id if scheduled). This is exactly the section the vault
   template leaves empty at intake for this skill to fill.
2. **Update `../../playbook/PROVEN-COMBOS.md`** — flip the matching row's status from
   `proven-by-others` to **`testing`** once our version is scheduled (a version exists, no score yet).
   It becomes `validated-by-us` later, manually, only if our post scores ≥80 in the
   `sync-post-stats.mjs` review — not here.
3. When the post later publishes and gets a `posted_url`, its Sheet LeadMagnets row's `used_in_post`
   gets set (handled at publish time, note it as pending here).

---

## `--seed` mode

First-run seeding of `PROVEN-COMBOS.md` is **already done** (built 2026-07-16 from FORMAT-LIBRARY.md,
POST-STRUCTURE-LIBRARY.md, and the vault). `/lm-repurpose --seed` **re-scans** the vault + Template
Library for combinations not yet in the matrix and adds any missing `proven-by-others` rows — a
maintenance sweep, not a rebuild. It never overwrites existing rows or their status; it only appends
new ones and refreshes evidence/`last_updated` on matches. Run it after a big `/lm-intake` batch to
fold new proven combos into the matrix.

## Rules

- **Single review gate** (standing rule 6) — assemble all three parts + meme, review once, don't
  ask per-sub-part.
- **Creator attribution lives in internal notes only** — "mechanics from &lt;creator&gt;, &lt;post
  url&gt;" in the Post Ideas `source` / draft notes, never in the published copy.
- **Git — stage only your own files.** The vault `notes.md` you edited, `PROVEN-COMBOS.md`, any
  `content/sources/` visual, the Post Ideas append is a Sheet write (no git). **Never `git add -A`**
  (parallel-session rule). Clear, revertible commit message
  (`lm-repurpose: <slug> → post idea + combo update`), then push. The orchestrator commits — if this
  skill is run inside a larger flow, hand the file list back rather than committing yourself.
- **Never touch `/linkedin-batch`, `/linkedin-post`, or `/lm-intake`'s own logic** — reference their
  sub-skills and phases, never fork or duplicate them.
