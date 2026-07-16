---
name: lm-intake
description: Batch-intake the lead magnets Sophiya earns by commenting on experts' LinkedIn posts — she dumps 5-10 items (post URL + magnet link(s), sometimes pasted content or files) and this captures each into the vault folder, a LeadMagnets Sheet row, and the Knowledge Base docs, always archiving our OWN copy of every resource. Use when she says "/lm-intake", "log these lead magnets", "lead magnet dump", "star these posts", or pastes a batch of post/resource links to file.
---

# lm-intake skill — the batch intake drill

Sophiya earns lead magnets by commenting on cold-email experts' LinkedIn posts; the resource links
arrive in DMs and get lost. This skill is the batch capture drill: she dumps 5-10 items in chat
(a post URL + the magnet link(s) per item, sometimes pasted content or files), and each one lands
in three places — (1) a **vault folder** under `content/lead-magnets/received/<slug>/`, (2) a
**LeadMagnets Sheet row**, (3) the **Knowledge Base docs** (`playbook/knowledge/<domain>.md`).

**Same project as `/linkedin-post` and `/linkedin-batch`** — read `../linkedin-post/SKILL.md` for the
Vercel app / Google Sheet architecture. Path on disk: `c:\Users\sophi\Downloads\SOPH VS Code\linkedin-hq`.
Reads the Sheet via `node scripts/read-tab.mjs --tab "<name>" [--range A1:Z1000]`.

**HARD RULE (Sophiya's call, 2026-07-16): a link is NOT a capture.** Expert-hosted resources —
Notion pages, git repos, PDFs, Gamma decks — get deleted within weeks. We **ALWAYS** archive our
own copy into the item's `resource/` folder. A row that only stores a link is a debt, not a
capture; it carries `resource_archived: link-only` in its notes.md frontmatter and gets
re-surfaced at the top of **every** run until resolved. The full per-form archive drill lives in
**`archive-resource.md`** in this folder — read it fresh at Phase 3, don't cache it.

**Standing rule — show progress as a visible checklist.** Call `TodoWrite` at the start of every
run with all 8 phases (P0-P7) as todos, one `in_progress` at a time, so Sophiya can see where the
run actually is.

**Standing rule — ONE review gate, no per-item stalls.** Everything before writing is drafted for
the whole batch, presented as one compact table, and confirmed once (Phase 2). Missing data →
ONE consolidated question, never a stall per item. Failures are surfaced in the end-of-run
summary, never silently dropped.

## The 10 domain slugs (pick exactly one per item)
`agency-business` · `ai-automation-tooling` · `channel-strategy` · `copywriting` ·
`deliverability-infra` · `linkedin-content` · `list-building-data` · `metrics-benchmarks` ·
`offers-lead-magnets` · `sales-calls-closing`
(These are the file names in `playbook/knowledge/` — the domain must be one of these, never invented.)

## Protocol

**Before P0: create the todo list.** `TodoWrite` all 8 phases (content = imperative, e.g. "Parse
the dump"; activeForm = present continuous). Mark P0 `in_progress`.

### P0 — parse the dump + drain the queue + re-surface pending archives
1. **Re-surface pending archives FIRST.** Grep every vault note for the temporary flag:
   `grep -rl "resource_archived: link-only" content/lead-magnets/received/*/notes.md`. For each
   hit, list the title + resource link and tell Sophiya: "these still have only a link, no copy —
   links die fast, let's resolve them THIS run." Fold them into the batch as archive-only items.
   This is urgent, not backlog.
2. **Split the chat dump into items.** One item = one source post URL + its magnet link(s) and/or
   pasted content/files.
3. **Drain the web-app queue.** Read `node scripts/read-tab.mjs --tab LeadMagnets --range A1:AZ1000`
   and filter (by header name, never column position) to rows with `status=queued` — the app's
   `/intake` form writes those. Add them to the batch; they'll be updated in place at P5 with
   `--update-row <n>`, never re-appended.
4. **Classify each item:** FULL CAPTURE (has a lead-magnet link or pasted content) vs
   FAVORITE-ONLY (a bare post URL, nothing to archive). Favorite-only items skip P2-P6 and run the
   Favorite-only flow below instead.

### P1 — fetch the source posts
WebFetch each post URL. Extract: author name + profile URL, full post text, the hook (first line
verbatim), and likes/comments counts (best-effort — public LinkedIn pages render inconsistently and
often hide counts). **Do not stall on a missing count** — collect every gap and ask ONE
consolidated question at the end of P1 for the whole batch.

### P2 — 3-part breakdown + the single review gate
Draft this per item (nothing is written yet):

**CONTENT** — `hook` (verbatim first line) · `insights` (2-4 key takeaway bullets) ·
`content_style` (personal | expert | contrarian | story | listicle) · `format` (F1-F13, see
`playbook/FORMAT-LIBRARY.md`) · `structure` (S1-S5, see `playbook/POST-STRUCTURE-LIBRARY.md`) ·
`cta_keyword` (the comment keyword the post asked for) · `tools_mentioned` · `people_tagged`

**VISUAL** — `visual_type` (infographic | screenshot | carousel | screen-recording | none)

**LEAD MAGNET** — `lm_form` (notion | youtube | pdf | git-repo | other) ×
`lm_type` (educational-doc | claude-skills | commands | prompts | free-tool | n8n-flows |
claude-system-folders | other) + `domain` (exactly one of the 10 slugs above)

Present **ONE compact table** for the whole batch (item · title · author · domain · form/type ·
format/structure · archive plan). Then say:

> review time. anything to fix? say "go" to write the whole batch, or tell me what to change.

**Write nothing until she confirms.** Loop on edits until "go".

### P3 — archive our own copy (read `archive-resource.md`, follow it exactly)
Read **`archive-resource.md`** in this folder now. Run each item's resource through its per-form
drill so a real copy lands in that item's `resource/` (and source visuals in `assets/`). HARD RULE:
we always make our own copy — set the notes.md `resource_archived` flag to `full`, `partial`, or
(only if every ladder step failed this run) `link-only`.

### P4 — build the vault folder
For each FULL-CAPTURE item, create `content/lead-magnets/received/<slug>/` with:
- `notes.md` — copied fresh from `content/lead-magnets/received/TEMPLATE.md` (read the template
  fresh each run; fill its frontmatter + Key takeaways from P2/P1)
- `assets/` — source-post visuals (from `archive-resource.md`)
- `resource/` — our archived copy of the magnet (from P3)

`<slug>` = kebab-cased title, ≤60 chars, matching `capture-item.mjs`'s slug rule
(`toLowerCase().replace(/[^a-z0-9]+/g,"-")`).

**Legacy note — retrieval must glob BOTH shapes.** 49 old flat `.md` files still live directly in
`received/`. Any lookup must glob **both** `received/*.md` and `received/*/notes.md`. Migrate a
flat file into a folder only when you actually touch it (lazy migration) — never bulk-migrate.

### P5 — write the Sheet row
```
node scripts/capture-item.mjs --type lead_magnet \
  --title "<real title>" --source "<author>" --source-url "<author profile>" \
  --post-url "<post url>" --link "<resource link>" --takeaway "<key takeaway>" \
  --likes N --comments N --cta-keyword "<keyword>" \
  --contents "a • b • c" --content-style <style> --format-tag F# \
  --visual-type <type> --lm-form <form> --lm-kind <type> \
  --vault-path content/lead-magnets/received/<slug>/
```
For a drained **queued** row, add `--update-row <n>` so it's updated in place — never a duplicate
append.

### P6 — fold into the Knowledge Base
For each item, in `playbook/knowledge/<domain>.md`:
1. Add one line to the **`## Sources ingested`** section, formatted exactly:
   `<title> — <creator> (<notes path>)` — matching the pattern already in `deliverability-infra.md`.
2. Append the item's Key takeaways bullets under an **`## Inbox (unprocessed takeaways)`** section
   (create it if the file doesn't have one yet).

This is capture, not synthesis. Full synthesis into the mega-playbook stays a separate, deliberate
act — `deliverability-infra.md` is the written standard for what "done" synthesis looks like.

### P7 — re-pin the Sheet formatting (MANDATORY, always last)
`node scripts/format-all-tabs.mjs --tab LeadMagnets` — appended rows auto-grow their height until
this re-pins them to 21px. Skipping this leaves the tab visibly broken.

## Favorite-only flow (bare post URLs, nothing to archive)
For each FAVORITE-ONLY item:
1. WebFetch the post → hook, expert, likes, comments.
2. `node scripts/add-template-library-entry.mjs --hook "<hook>" --expert "<name>" --url "<post url>"
   --likes N --comments N --starred true` (add `--domain <slug>` and `--format F#` when classifiable).
3. If the post signals a format trend, note it in `playbook/FORMAT-LIBRARY.md`'s "hot right now" line.
4. Enrich any existing Template Library **starred** rows that have a blank `suggested_format`
   (these come from the extension's star button) — classify and fill the format.

No vault folder, no `resource/`, no Sheet LeadMagnets row — a favorite is a hook to steal, not a
resource to archive. (If a "favorite" turns out to carry a magnet link, reclassify it as FULL
CAPTURE and run P2-P6.)

## End-of-run summary
Print a table: item → vault path → Sheet row (or "updated row N") → `resource_archived` status.
Then, explicitly:
- **⏳ Pending archive:** every item still at `resource_archived: link-only` (these re-surface next run).
- **Failures:** anything that couldn't be fetched/archived/written — named, never silently dropped.

## Git
Stage **only** the files this run created or changed — the exact vault folders, the touched
knowledge docs, any FORMAT-LIBRARY.md edit. **Never `git add -A`** (parallel-session rule — other
sessions may have unrelated uncommitted work). Commit with a clear, revertible message
(`lm-intake: capture N lead magnets (<titles>)`), then push.
