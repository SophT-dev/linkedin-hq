# Process Retro: first real `/linkedin-post` run (2026-07-08)

**Why this file exists:** this was the first live, end-to-end run of the `linkedin-post` skill —
one post (the TAM angle), one visual, one lead magnet draft. It took a very long session with a
lot of back-and-forth that shouldn't be necessary on the next run. This is an honest log of every
bottleneck, miss, and fix, so the pattern gets automated/systematized instead of repeated.
Temporary working doc — fold the "fix" items into the actual skill files (mostly already done,
noted per item) and then this file can be archived or deleted.

---

## Timeline of what actually happened (condensed)

1. Ran `/linkedin-post` cold. It picked the earliest Content Calendar slot and started drafting
   immediately — no visible steps, no angle confirmation, and the picked angle ("building our own
   LinkedIn content system") turned out to be off-topic (meta content-about-content, not cold
   email/business/AI).
2. Had to stop and retrofit three things into the skill mid-run: a topic guardrail, an angle
   confirmation gate, and a TodoWrite progress checklist. **(Fixed — now in SKILL.md.)**
3. Picked a new angle (TAM sizing), drafted a hook. It was flat — technically correct, no
   curiosity gap, no real hook psychology behind it, even though the Copywriting Bible had a
   whole unused Sam Parr voice pack sitting in it since 2026-07-02 that never got used.
4. Had to research Hormozi's Hook-Retain-Reward framework, MrBeast's curiosity-gap practice, and
   fold it into the Bible (new Part F) and hook-selection.md as a hard test. **(Fixed.)**
5. Got the actual direction of the angle backwards on the first real draft — wrote "your TAM is
   smaller than you think" when the real point (confirmed by the pie-chart visual request) was
   "your TAM is bigger than you think, you're only reaching a sliver of it." Had to redo the hook
   and body after showing a full draft, not before.
6. Oscillated on "adapt from a real template" vs. "use the new psychology research" — wrote a
   hook that was technically original (not traced to a real row) right after fixing the topic
   guardrail issue, got corrected, had to clarify in hook-selection.md that Part F is a lens for
   sharpening a real candidate, never a way to generate one from scratch. **(Fixed.)**
7. Nearly logged a real personal claim (a stat from Taha's own conversations) to WinsLog without
   asking — caught and corrected into a standing rule. **(Fixed — memory + should be reflected in
   any future skill that touches WinsLog.)**
8. Visual: built THREE fully different concepts from scratch before landing on one that worked —
   (a) a flat abstract Vox-style pie chart, (b) a "realistic" illustrated strawberry pie with a
   newspaper background, (c) an isotype/pictogram people-chart. Each pivot meant re-writing the
   HTML/CSS/SVG from zero, not iterating on the same file. This was the single biggest time sink
   of the whole session.
9. Found and fixed a real, reproducible rendering bug in the shared `render-png.cjs` tool: an SVG
   `feDisplacementMap` filter (used for a hand-drawn "cut paper" edge effect) caused content to
   ghost/bleed onto the top of the canvas. Took three separate render-and-compare cycles to
   isolate before the actual cause was confirmed. **(Fixed in the shared script — documented in
   its own code comment.)**
10. Didn't invoke the `frontend-design` skill or `design-critique` until asked directly — even
    though the master plan explicitly called for using both when building visual templates. Once
    invoked, it produced a meaningfully better design plan (token system, a real signature
    element, self-critique against the generic default) than my freehand first attempt.
11. No image-generation tool is connected in this environment — every visual had to be hand-coded
    HTML/CSS/SVG and screenshotted. This has a real ceiling: it can't produce true photorealistic
    or painterly illustration, only flat/vector work. Sophiya tried an external AI tool (Claude
    Design or Gemini) herself using a prompt I wrote; the result had its own problems (4 arrows
    instead of 2, wrong aspect ratio, off-style) that then had to be reverse-engineered and fixed
    by hand anyway.
12. Dispatched a background agent to draft the lead magnet ("The Real TAM Finder" Notion page).
    Told it to "use existing data and info we have," but didn't explicitly force it to pull from
    the Template Library corpus — it did 100% fresh external web research and never once cited
    our own scraped expert posts (Kenny Damian, Richard Illingworth, Nick Abraham), even though
    those are the exact real proof points the whole campaign is built on. Had to catch this after
    the fact and manually weave in the missing citations myself.
13. Brand tension wasn't caught until the visual work was underway: the brand-compliance sub-skill
    assumes the dark/red brand system always applies, but a single "attention-grabbing" visual
    (light newspaper background) was a deliberate, reasonable exception. Nothing in the skill
    anticipated "this one visual might intentionally break brand" as a normal scenario — it had to
    be flagged ad hoc instead of being a built-in checkpoint.

## What Sophiya was not satisfied by, specifically

- The first hook (no curiosity gap, felt like a Wikipedia sentence, not something that "grabs you
  by the throat").
- The first two visual directions (too flat/corporate-BI-chart-like, then too cartoonish/
  children's-book-like) before the third one landed.
- The lead magnet's first draft missing our own expert data.
- General pace: a huge amount of back-and-forth to get ONE post + ONE visual + ONE lead magnet
  draft to a "good" state.

## Root causes (not just symptoms)

1. **The skill was being proven out live, in production, on the first real post.** Almost every
   fix above is a standing-rule gap that should have existed before the first real run, not been
   discovered during it. This is expected for a true "Stage 13 milestone test" but means the
   NEXT run should be dramatically faster, since the gaps are now closed.
2. **Visual work had no reusable starting point.** Every visual concept was built as a one-off
   HTML file from a blank page. There's no library of proven visual "shapes" (isotype/pictogram
   chart, Vox-flat data-viz, big-number callout) to start from and parameterize.
3. **Sub-agent briefs need an explicit, non-optional "check internal sources first" instruction.**
   "Use existing data" in a prompt is not strong enough — an agent defaults to WebSearch unless
   told exactly which internal tabs/files to read first and cite from.
4. **No pre-flight design brainstorm step.** The `frontend-design` skill's own process (brainstorm
   → critique against the generic default → then build) is exactly the process that would have
   caught the "generic pie chart" and "childish illustration" problems before rendering, not
   after. It just wasn't invoked until asked.

## What to automate / fix going forward

- [x] Topic guardrail, angle confirmation gate, TodoWrite progress — now in `linkedin-post/SKILL.md`.
- [x] Curiosity-gap test (Hormozi/MrBeast) — now in `COPYWRITING-BIBLE.md` Part F + `hook-selection.md`.
- [x] "Part F sharpens a real row, never generates one" — now explicit in `hook-selection.md`.
- [x] WinsLog no-auto-write rule — saved as a standing memory.
- [x] `render-png.cjs` ghosting bug — fixed in the shared script.
- [ ] **Build a small visual-template library** (2-3 reusable HTML/SVG scaffolds — an isotype/
      pictogram chart, a Vox-flat callout/stat card, a big-number-plus-arrow layout) with
      parameterized text/numbers/colors, so a new visual starts from a proven shape instead of a
      blank file. This is the highest-leverage fix — it was the biggest time cost this session.
- [ ] **Standing rule for any research sub-agent**: always read the relevant Sheet tabs (Template
      Library, WinsLog, Intel) FIRST and explicitly cite what's found there, before external
      WebSearch — not left to the word "existing data" in a prompt. Consider baking this directly
      into `lead-magnet-suggestion.md` or wherever future lead-magnet-build prompts get written.
- [ ] **Always invoke `frontend-design`'s brainstorm-and-critique step before writing any visual's
      first line of code**, not after a first attempt disappoints. Make this the default trigger,
      not something that has to be asked for.
- [ ] **Add a "brand exception" checkbox to `brand-compliance.md`**: if a visual is deliberately
      breaking the dark/red brand system (a one-off attention-grabber), flag it once, get a yes/no,
      and move on — don't treat every deviation as a fresh surprise.
- [ ] **Investigate whether any free image-generation connector becomes available** (revisit
      periodically) — HTML/CSS/SVG has a real ceiling for "realistic illustration" requests, and
      hitting that ceiling cost real time this session.
- [ ] Consider whether the visual concept (pie chart vs. isotype chart vs. something else) should
      be picked and confirmed with Sophiya BEFORE any rendering starts, the same way the angle and
      hook already require confirmation — would have saved two full rebuild cycles.

---

## Addendum: the rest of the run through publish (same day, extended session)

The post above did get finished, approved, and published. This section logs everything that
happened between "visual approved" and "live on LinkedIn with a pinned comment" — a second wave
of slowdowns, mostly different in kind from the first batch above.

### Visual polish — many small rounds, each individually reasonable, collectively slow

14. After the isotype-pie concept was approved, Sophiya asked for a "hand-drawn sketch" pass
    (wobbly outline, cross-hatch shading, referencing two image examples she sent). Built it, but
    the wobble amplitude and hatch density were too aggressive on the first pass — the shape
    stopped reading as "a pie with a slice missing" and started reading as a blob. **Had to
    dial back wobble/hatch strength in a second pass** after she said "it doesn't even look like
    a pie." Lesson: when adding a stylistic effect on top of an already-approved clean shape,
    apply it conservatively first and let her ask for more, rather than going heavy immediately.
15. Arrow placement/direction churned across **five separate corrections** on the same two
    arrows: (1) arrows overlapped label text → fixed gap; (2) fix over-corrected, arrow floated
    disconnected from its label → re-anchored; (3) she asked for arrows to stop *outside* the pie
    with proper arrowheads (previously they penetrated into the shape with a crude two-line
    arrowhead) → rebuilt as bezier curves with real filled-triangle heads; (4) she then clarified
    via an annotated screenshot that the arrows should run the *opposite direction* (tail at the
    pie, head at the label) — a genuine ambiguity in "point at X" that a text instruction alone
    couldn't resolve; a visual mockup settled it immediately where three rounds of text couldn't.
    (5) finally asked to drop the hand-drawn wobbly outline entirely for a "clean professional"
    one — removed the wobble function and the cut-face hatching together, back to a single crisp
    stroke. **Lesson: for arrow direction/anchoring specifically, ask for (or offer to make) a
    quick annotated screenshot before iterating blind — it's a fundamentally spatial instruction
    that text repeatedly under-specifies.**
16. Built a second, fully-branded "day mode" copy of the same visual (Inter/Instrument Serif/
    JetBrains Mono, red/white instead of the sketch palette) — smooth this time, since the
    underlying geometry logic was already proven; only new bugs were label-width overflow and the
    same arrow-clears-text problem recurring in the new layout (had to re-solve it independently
    since it's a new file, not inherited from the fixed original).
17. When asked to remove the arrows from both PNGs entirely ("I'll add them myself"), this was a
    two-line edit each — fast. Good sign that the underlying files stayed maintainable despite all
    the iteration.

### The lead-magnet count problem — a real accuracy near-miss

18. Sophiya asked for a comprehensive per-expert breakdown of TAM/lead-sourcing tools across all
    11 tracked experts, run via a background agent against the 6,642-post tagged corpus. This
    surfaced a real gap: **Clay was mentioned by all 11 experts and wasn't in the lead magnet at
    all**, along with ~29 other genuinely new tools (Trigify, RB2B, Unify, Ocean.io, etc.).
19. Folded the new tools into the lead magnet doc, which changed the real source count from 38 to
    68. This number is printed in **four separate places** (the lead magnet doc's own claim, the
    post's CTA line, and both visual PNGs' CTA/caption text) — updating one and not the others
    would have shipped a real, embarrassing inconsistency (post says one number, image says
    another). Had to explicitly track down and update all four together.
20. Sophiya then directly asked "are you sure we have 68 sources??" — a fair challenge, since the
    number had been asserted rather than freshly re-verified after the edit. Had to recount by
    building an actual deduplicated list (not just re-stating the earlier arithmetic) to confirm
    it. **Lesson: any time a document is edited after a count was already stated, re-derive the
    count from the edited document, don't just carry the old number forward or trust your own
    earlier math without redoing it.**

### Notion — a credential/workspace mixup that cost a full round-trip

21. The Notion integration token in `.env.local` belonged to Sophiya's **personal** Notion
    workspace, not the `bleedai` company workspace where the target page actually lives — this
    wasn't discoverable by reading error messages alone ("Could not find page... make sure it's
    shared with integration 'Lead Magnets'" reads identically whether the page truly isn't shared
    OR the integration is in the wrong workspace entirely). Diagnosed by calling `users.me()` on
    the token to inspect its `workspace_name` directly — should be the FIRST debugging step next
    time a Notion "not shared" error appears, before assuming it's a sharing-permissions issue.
22. A one-off script (`_tmp-publish-formatted-notion.mjs`) had the OLD token **hardcoded** at the
    top, separate from `.env.local`. Updating `.env.local` alone didn't fix the actual publish
    call — had to find and fix the second copy. **Lesson: one-off scripts that read secrets
    should always read from `.env.local` at runtime, never hardcode a copy, even for a "throwaway"
    script** — it doesn't stay throwaway if it gets reused a few messages later.
23. The Notion page got formatted (colored callouts, a table, bookmarks, checkboxes) by a
    background agent, but that agent ran against the lead magnet doc **before** the Clay/68-source
    section was added. The published Notion page is now stale relative to the source markdown —
    flagged to Sophiya but not yet fixed as of this note (see pending todo).

### Voice/tone — structure was right, prose wasn't warm enough

24. Sophiya reformatted the post herself (blank-line spacing, cut a line, added a "THE FORMULA:"
    label) — saved verbatim, no issues.
25. She then asked for two content additions in the same message: mention Clay/the new tools in
    the post body itself, AND add an explicit "I spent 2+ hours compiling this" effort line for
    the show-the-work/hype philosophy. Both landed in one pass.
26. She then flagged the post didn't sound "casual, like a friend" — even though it followed the
    approved S3 (emoji-numbered) structure correctly. Root cause: the arrow bullets were correctly
    punchy, but the **connective prose sentences between them** had drifted into stat-sheet
    phrasing ("Apollo says it has X. Prospeo covers Y. That already feels like Z.") instead of
    folding observations together the way the actual Voice Rules specify (long sentences that
    connect one idea into the next, "like a friend texting a friend"). Had to re-read
    `linkedin-batch/SKILL.md`'s real Voice Rules section (not just recall it) and rewrite every
    connective sentence, leaving the bullets themselves untouched. **Lesson: a proven structure
    (S3) governs the skeleton, not the prose register — both need an explicit pass, and "follows
    the template" isn't the same check as "sounds like Taha."**

### The pinned-comment meme — three real format pivots

27. First attempt: an "Expanding Brain" meme built from scratch in HTML/SVG, using abstract
    concentric circles to represent brains. Rendered fine technically, but **the shapes didn't
    read as brains at all** — self-caught this on review before Sophiya had to. Rebuilt with an
    actual simplified brain-silhouette SVG path, scaled/lit progressively across 4 panels — this
    version worked.
28. Sophiya then asked directly why an existing tool wasn't reused (`lm-sales-agent`'s follow-up
    email GIF system). Checked before answering rather than assuming — that system turns out to
    caption-overlay real stock cartoon GIFs (sourced from Giphy, a real API key already in
    Doppler) for **private, 1:1 cold-email attachments**, a materially different exposure/copyright
    situation than a **public** LinkedIn post, which is exactly why the `pinned-comment-meme.md`
    sub-skill deliberately specifies an original graphic instead of a re-hosted template. Surfaced
    this distinction rather than silently deciding either way.
29. Sophiya then supplied her own real meme template file directly (a blank "Galaxy Brain" 3-panel
    JPG). This made the whole problem trivial and much better-looking than the hand-drawn
    version — captions overlaid cleanly on the first render. **Lesson: for meme/template-based
    content specifically, ask early whether the user already has a template file before
    hand-building one from scratch — it's a common, fast, zero-copyright-ambiguity path this
    session almost missed by defaulting straight to "build an original."**

### Updated root causes (this addendum)

5. **Spatial/visual instructions (arrow direction, "stop outside the shape") are frequently
   under-specified in text and better resolved with an annotated image than N more rounds of
   prose.** This cost the most iteration cycles in the addendum period.
6. **Any numeric claim that appears in more than one artifact (doc, post, image, caption) needs a
   single source of truth or an explicit "grep for the old number everywhere" step** before
   considering an edit done — this almost shipped a real inconsistency.
7. **Debugging an external API auth error should check identity/scope first** (e.g. `users.me()`),
   before assuming the error message's literal suggestion (a sharing/permissions problem) is the
   actual root cause.
8. **"Follows the approved structure" and "matches the required voice" are two different checks.**
   Verifying structure compliance does not verify tone — both need their own explicit pass against
   the actual source-of-truth rules file, not memory of it.

### Updated automate/fix list (this addendum)

- [ ] **When any post/lead-magnet numeric fact changes, grep the whole content family (doc, saved
      post body, all rendered visuals) for the old number before calling the edit done** — this
      should be close to a mechanical checklist item in the skill, not something re-discovered by
      the user asking "are you sure?"
- [ ] **For Notion auth/sharing errors, call `users.me()` on the token first** to confirm
      workspace identity before troubleshooting page-sharing — add this as a documented first step
      wherever Notion publishing is described.
- [ ] **Never hardcode a secret in a one-off script "since it's throwaway"** — always read from
      `.env.local` even for scripts meant to be deleted immediately after use.
- [ ] **Add a tone/voice-specific self-check separate from the structure-template check** before
      showing a draft — "does this sound like Taha talking to one person," not just "does this
      match S1-S5."
- [ ] **For any spatial/layout instruction that's been corrected twice, proactively offer to look
      at (or ask for) an annotated screenshot** rather than continuing to iterate from text alone.
- [ ] **Ask early whether the user has a real template file** (meme, brand asset, reference image)
      before defaulting to hand-building an original from scratch — this is now proven to be both
      faster and higher-quality when available.
- [ ] Re-sync the Notion lead magnet page with the current (68-source, Clay-inclusive) version of
      `real-tam-finder-body.md` — it was formatted before that section was added and is now stale.

---

## Addendum 2 (2026-07-09) — post-publish sync + the comment-system ask

30. A previously-written `posted_url`/`status` update script (from the addendum-1 session) turned
    out to have **never actually been executed** — the `Bash` call to run it was interrupted by
    the user's next message and I moved on without noticing the run never happened. The Posts tab
    still showed `status: draft` and an empty `posted_url` a full day later. **Lesson: writing a
    script is not the same as running it — a queued mutation that gets pre-empted needs to be
    explicitly re-verified, not assumed complete because it was "basically done."**
31. When Sophiya said "i edited the post again," `WebFetch` on the live post URL returned a
    **paraphrased summary with a plausible-but-unverifiable number** (87%) instead of the literal
    text — indistinguishable at a glance from a hallucination. Switched to a direct `curl` fetch of
    the raw HTML instead, and it turned out LinkedIn's public (logged-out) post page **does**
    server-render the full post body inside a `commentary` div — real, exact, word-for-word text,
    free, no login needed. **Lesson: for anything that must be captured verbatim (not summarized),
    fetch and grep the raw HTML directly instead of trusting an LLM-mediated fetch tool, even when
    the tool "worked."** Bonus finding from the same raw fetch: LinkedIn regenerates the post's URL
    slug from its current hook text — the slug itself (`87-of-founders-guess-their-tam-size-wrong`
    vs. the original `how-big-do-you-think-your-tam-is`) was a free, immediate signal that the hook
    had changed, before even reading the body.
32. Minor cross-tool friction: Git Bash's `/tmp` path isn't visible to the Windows Store Python
    alias (`python3`/`python` resolve under `AppData\Local\Microsoft\WindowsApps`, which is a
    different filesystem view) — a script that worked fine reading a curl-downloaded file via Bash
    failed with `FileNotFoundError` under Python until the file was copied into the real Windows
    scratchpad path first. Also hit a `UnicodeEncodeError` printing emoji/arrow characters
    (`↳`, `🧠`) straight to a `cp1252` Windows console — fixed both by writing Python output to a
    file and reading it back via the `Read` tool instead of printing to stdout. **Lesson: when
    mixing Bash and Python tools on Windows, don't assume a path or a print() call that works in
    one will work in the other — write to a shared real path and avoid raw console printing for
    anything with non-ASCII content.**
33. Sophiya asked to "get a regular comment system going." Before building anything, a targeted
    grep of `app/api/comments/` turned up a **complete, already-built, already-deployed
    human-in-the-loop review flow** (`/api/comments/plan` → Slack draft with ✅/❌/edit-reply →
    `/api/comments/check-reviews` reads the Slack reaction/reply) AND a **separate, fully-built
    Chrome extension** (`extension/`) with a live `/api/comments/suggest` endpoint for
    suggest-only inline drafts on any post — confirmed working by hitting the deployed endpoint
    directly with a real post and getting back 3 real, quality-gated suggestions. **None of this
    richer capability was reflected in `CLAUDE.md`'s summary**, which described a simpler
    n8n-only auto-post flow. **Lesson: before building a requested capability, grep the actual
    `app/api/` and script folders for existing routes — `CLAUDE.md`'s prose summary can lag real
    shipped work by weeks, and re-building something that already exists wastes an entire session.**
34. For the "list of people to connect with" ask, first checked whether Apify (the obvious tool)
    was even usable — it wasn't, blocked on the same leaked-key rotation as everything else Apify.
    Before assuming this made the whole task blocked, tried a plain authenticated-free `curl` fetch
    of a target post's public page and found LinkedIn **does** server-render a handful of top
    commenters' real names + profile URLs even logged out (same discovery as item 31, reused here).
    Built `capture-connects.mjs` on that basis — zero API cost, real data, immediately seeded with
    35 real names from 4 posts. **Lesson: "the obvious tool is blocked" isn't the same as "the task
    is blocked" — worth testing a free/manual path before deferring to an external dependency's
    unblock timeline.**
35. `format-all-tabs.mjs`'s tab list (`TAB_CONFIGS`) is a hardcoded object, not auto-discovered
    from the sheet — adding the new Connects tab silently formatted every *other* tab but skipped
    the new one until its entry was manually added. Easy to miss since the script still exits 0
    and reports success for the tabs it does know about. **Flag for next time a tab is added: the
    script's own header comment already says "re-run any time a new tab is added (append its
    config to TAB_CONFIGS)" — actually check the printed tab list against what was expected,
    since a silently-skipped tab won't show as an error.**

### Updated root causes (addendum 2)

9. **A queued action that gets interrupted needs an explicit re-check before being treated as
   done** — "I was about to run X" is not "X ran," especially across a context compaction or a
   redirect to a new user message.
10. **When exact/verbatim text matters, prefer a raw fetch + direct parse over any LLM-mediated
    summarization step** — even a well-behaved fetch tool will paraphrase, and paraphrase output is
    indistinguishable from hallucination without a second, literal source to check it against.
11. **Grep the actual code before assuming a requested capability doesn't exist yet** — this
    session had two capabilities (the Slack review loop, the comment-suggest extension) fully
    built and deployed that a quick codebase search surfaced immediately, avoiding duplicate work.
12. **A blocked "obvious" tool (Apify, here) doesn't automatically mean the task is blocked** —
    check for a free/manual/direct alternative before deferring to someone else's unblock timeline.

### Updated automate/fix list (addendum 2)

- [x] Verify the `posted_url`/`status` update actually landed, and sync the live post's real edits
      (hook + body) back into the Posts tab — done this session via direct HTML fetch.
- [x] Confirm the manual comment-suggestion system (Chrome extension + `/api/comments/suggest`) is
      actually live before building anything new — done, confirmed working.
- [x] Build a free (non-Apify) "who's commenting on tracked experts' posts" capture mechanism —
      done (`capture-connects.mjs` + Connects tab), seeded with 35 real names.
- [ ] Re-sync the Notion lead magnet page with the current (68-source, Clay-inclusive) version of
      `real-tam-finder-body.md` — **still open**, carried over from addendum 1.
- [ ] When a script that mutates external state (Sheets, Notion, Slack) is written but its
      execution gets interrupted, add a habit of explicitly re-confirming it ran (re-read the row)
      before marking the task done, rather than trusting the intent to run it.
- [ ] Before starting any new build in this repo, grep `app/api/` and `scripts/` for existing
      capability first — `CLAUDE.md` is a summary, not a guarantee of completeness.
      **(Still open as of this note.)**
