---
name: linkedin-post
description: Draft ONE LinkedIn post (Taha or Sophiya) from the Content Calendar, Post Ideas backlog, a Domain Synthesis doc, or a WinsLog entry — pulling proven hooks from the Template Library, always presenting 2-3 options each with 2-3 lead magnet suggestions. Reuses /linkedin-batch's existing lead-magnet build pipeline rather than a second one. Use when the user says /linkedin-post, "draft today's post", "what should I post", or similar. This is the single-post skill (Stage 13 of the content-system build) — /linkedin-batch remains the multi-post batch generator, untouched.
---

# linkedin-post skill — master orchestrator

You are running the single-post drafting flow for Taha Anwar's and Sophiya's LinkedIn content
(Bleed AI). This is the integration point for everything built in Stages 1-12 of the content
system: the Sources map, Template Library, Domain Synthesis docs, Content Calendar, Post Ideas
backlog, Visual Swipe, the capture mechanisms, and performance tracking. It does NOT replace
`/linkedin-batch` — that remains available for multi-post batches; this is for one post, drafted
with more source material behind it.

**Structure:** this file routes by phase to five focused sub-skills in this same folder —
`hook-selection.md`, `post-structure-selection.md`, `lead-magnet-suggestion.md`,
`brand-compliance.md`, `pinned-comment-meme.md` — rather than trying to hold everything in one
file. Read each sub-skill fresh when its phase comes up; don't rely on a cached memory of it.

**Standing rule (Sophiya's call, 2026-07-08): every draft uses a real hook template AND a real
structure template — never freehand either one.** This applies for the first few weeks, until
the proven templates have actually been tested live. A hook with no traceable source row, or a
body that doesn't commit to one named structure from `playbook/POST-STRUCTURE-LIBRARY.md`, is
not ready to show her — fix it before Phase 6, don't ship it with a caveat.

**Standing rule (Sophiya's call, 2026-07-08): topic guardrail — stay in the business's actual
lane.** Every angle must be about cold email, outbound/email marketing, AI/automation, or running
the agency itself — the ADJACENT bucket in `../linkedin-batch/SKILL.md`'s Voice Rules (Claude
Code/AI tooling, n8n, agent stacks, GTM trends) is fair game, but a topic can't be about LinkedIn
content strategy itself, or anything with no real tie back to cold email/business/AI. A
Content-Calendar-assigned angle can still fail this check — if it does, say so at Phase 1 rather
than drafting it anyway, and propose the nearest on-topic alternative instead of guessing.

**Standing rule (Sophiya's call, 2026-07-08): confirm the angle before drafting.** After Phase 1
picks a source, stop and show her the date/profile/angle/format and wait for an explicit go-ahead
(or a redirect) before Phase 2 starts. Never draft on a picked source she hasn't confirmed.

**Standing rule (Sophiya's call, 2026-07-08): show progress as a visible checklist.** Use
`TodoWrite` to track this skill's 9 phases as todos, updating status in real time (one
`in_progress` at a time) so she can see where the run actually is, not just the final output.

## Context about the project
- Same project as `/linkedin-batch` — see `../linkedin-batch/SKILL.md` for the Vercel app
  architecture, the Google Sheet, and (critically) **the Voice Rules section, which is the single
  source of truth for Taha's voice and must never be duplicated here.**
- Path on disk: `c:\Users\sophi\Downloads\SOPH VS Code\linkedin-hq`
- Reads the Sheet directly via `node scripts/read-tab.mjs --tab "<name>"` (JSON out) — no Vercel
  API route exists yet for the Stage 1-7 tabs, so this is the plumbing until one does.

## The core constraint — read the distilled layer ONLY

**Never read the raw 6,642-post corpus (`campaign-master/knowledge-base/learning-center/`) or
the full playbook files (`STRATEGY.md`, `PLAYBOOK.md`) directly.** Everything you need has
already been distilled into:
- Sheet tabs: `Sources`, `Template Library`, `Content Calendar`, `Post Ideas`, `WinsLog`, `Intel`
  (starred rows only), `LeadMagnets` (kind=received rows)
- `playbook/COPYWRITING-BIBLE.md` and `playbook/FORMAT-LIBRARY.md`
- A specific `playbook/DOMAIN-SYNTHESIS-*.md` doc if the source material points to one

If you find yourself wanting to open the raw corpus "just to double-check," that's a sign the
distilled layer is missing something — flag it, don't route around it by reading raw data (that's
exactly the token-cost problem Stage 13 was built to avoid).

## Protocol

**Before Phase 1: create the todo list.** Call `TodoWrite` with all 9 phases below as todos
(content = imperative, e.g. "Pick the source"; activeForm = present continuous, e.g. "Picking the
source"). Mark Phase 1 `in_progress` immediately, and keep exactly one phase `in_progress` at a
time as you move through the run — this is her visibility into where the run actually is.

### Phase 1 — pick the source
Default: the next unposted slot in the **Content Calendar** (`node scripts/read-tab.mjs --tab
"Content Calendar"`, filter `status=planned`, take the earliest `date`). Tell the user which slot
you picked (date, profile, angle, format).

If the user names a different source instead — a specific Post Ideas row, a Domain Synthesis doc,
a WinsLog win, or a totally off-calendar topic — use that instead and say so.

**Topic guardrail check (do this before showing the angle):** is this angle actually cold
email / outbound / email marketing / AI-automation / running the agency — or a clear ADJACENT
topic per Voice Rules? If the picked source fails this (e.g. it's about LinkedIn content
strategy itself, or anything with no real tie back to the business), don't draft it. Say
explicitly why it fails, and propose the nearest on-topic Content Calendar slot or Post Ideas row
instead.

**Confirmation gate — stop here, every time.** Show the date, profile, angle, and format, and
ask: "confirm this angle, or point me at a different source?" Do not proceed to Phase 2 until she
replies. Mark Phase 1 `completed` and Phase 2 `in_progress` only after she confirms.

### Phase 2 — gather the distilled inputs
Pull only what this specific draft needs:
- The angle/theme and suggested format from wherever Phase 1 pointed
- `node scripts/read-tab.mjs --tab "Template Library"` filtered to a matching domain
- `node scripts/read-tab.mjs --tab "WinsLog"` for a real effort/process fact to cite (philosophy
  #2 — show the work, never invent a number)
- The relevant `DOMAIN-SYNTHESIS-*.md` doc if Phase 1 pointed at one
- `node scripts/read-tab.mjs --tab "Intel" --range A1:M200` filtered to `starred=TRUE` if the
  angle is news/trend-reactive (F11 territory)

### Phase 3 — hook selection, then structure selection
Read **`hook-selection.md`** in this folder now. Use it to pick/adapt a hook for each of 2-3 draft
options — checked against the 120-130 character hard limit before "...see more" truncation (full
detail in that sub-skill). Each option must be able to cite: which Template Library row or
F-number format it's built from, and one real fact from WinsLog/Intel/the Domain Synthesis doc —
never invented.

Then read **`post-structure-selection.md`** in this folder — a different, real proven layout
(line rhythm, spacing, bullets vs. arrows, number density) from
`playbook/POST-STRUCTURE-LIBRARY.md`, matched to the format. **Never write the body freehand** —
commit to one named structure (S1-S5) and follow its rhythm rules exactly.

Each draft has this shape (same fields as `/linkedin-batch`'s posts, for compatibility with the
Posts tab):
```
### draft [N] — [format, e.g. F1 Big Number] × [structure, e.g. S1 Numbered Tactical List]
hook: [one line, proper grammar, ≤130 characters]
body: [written strictly in the chosen structure's rhythm — see POST-STRUCTURE-LIBRARY.md]
visual_brief: [2-3 sentences, checked against brand-compliance.md]
built_from: [Template Library row / F-number for the hook] + [S-number for the structure] + [the real fact it cites]
funnel_stage: TOFU | MOFU | BOFU
```

### Phase 4 — lead magnet suggestions
Read **`lead-magnet-suggestion.md`** in this folder now. For each draft, produce 2-3 lead magnet
options, one starred as the recommendation, per that sub-skill's format.

### Phase 5 — brand compliance gate
Read **`brand-compliance.md`** in this folder now. Run every draft through it — including the
full Voice Rules checklist it points to in `../linkedin-batch/SKILL.md`. Fix anything that fails
before Phase 6. Never show a draft you know fails a rule with a disclaimer attached.

### Phase 6 — show drafts, review loop
Show all drafts, numbered, each with its lead magnet options (one starred). Say exactly:

> review time. tell me what to change, or say "approve N" to lock in a draft (and which lead
> magnet, if any) for this slot.

Loop on free-form edits until approved or canceled.

### Phase 7 — pinned comment (meme only)
Read **`pinned-comment-meme.md`** in this folder now. Once a draft is approved, produce a meme
genuinely relevant to that post's angle for the pinned comment — nothing else goes in it. Lead
magnets are delivered by comment-to-DM (the post body's own CTA line), never a link in the post
or this comment. Show the meme concept to the user before moving on.

### Phase 8 — save + lead magnet handoff
Save the approved draft to the **Posts** tab (same shape/columns `/linkedin-batch` uses — `id \|
batch_date \| hook \| body \| format \| funnel_stage \| visual_brief \| lead_magnet \|
sources_used \| authenticity_tag \| status`, via the existing `/api/posts/save` route).

If a lead magnet was picked: hand off into **`/linkedin-batch`'s existing Phase 8 lead-magnet
sub-flow** (deep research → outline → approve → body → approve → publish to Notion → save to
LeadMagnets → live landing page) — do not rebuild this pipeline, follow `../linkedin-batch/
SKILL.md`'s Phase 8 exactly.

If this slot came from the Content Calendar, update that row's `status` to `posted` once Sophiya
confirms she's published it (Phase 9 below) — not before.

### Phase 9 — the human loop (cannot be automated, don't try)
Sophiya publishes the approved post on LinkedIn herself. Once she confirms it's live and gives you
the `posted_url`:
1. Write it into the Posts tab's `posted_url` column for this row.
2. Tell her `node scripts/sync-post-stats.mjs --run` (via Doppler, costs money) is how performance
   gets logged later — don't run it yourself without her separate go-ahead each time, same
   standing gate the script has always had.
3. If/when the post performs well, its hook/structure is a candidate for the next
   `build-template-library.mjs` refresh — note it, don't auto-add it.

No auto-posting anywhere in this skill, ever.
