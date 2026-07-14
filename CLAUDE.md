# LinkedIn HQ — Claude Context

## What this project is
Taha Anwar's (Bleed AI) personal LinkedIn operating system. Mobile-first Next.js web app on Vercel + two Claude Code skills, PLUS (as of 2026-07-08) a wider content system — a 6,642-post tagged expert corpus distilled into a Template Library and Knowledge Base docs (renamed from "Domain Synthesis" 2026-07-10, see below), a Content Calendar, a Post Ideas backlog, Visual Swipe, a Drive-based media store, and Sheets-based performance tracking — so drafting a post pulls from proven templates and real research instead of starting blank. One bookmarked URL on phone for intel scanning; `/linkedin-batch` for multi-post batches, `/linkedin-post` for one post drafted from the fuller pipeline (Content Calendar, Template Library, real lead-magnet suggestions). Everything else lives in one Google Sheet.

**Read this file top to bottom if you're new here** — it's the one place that explains what exists, what each piece is for, and how they connect. See "## Content System" below for the full build.

## Live URLs
- App: https://linkedin-hq.vercel.app
- GitHub: https://github.com/SophT-dev/linkedin-hq
- Vercel project owner: sophiya136-2634

## Content & strategy files (this is the home for ALL LinkedIn work — not COOKED)

**Two folders hold our stuff** (the rest is the Next.js app): `playbook/` (all the thinking) + `content/` (the render workshop). Everything is consolidated — one strategy doc, one playbook doc, no duplicates.

- **`playbook/` — all knowledge, 6 flat files + one growing subfolder:**
  - `STRATEGY.md` — the **WHY & WHO**: positioning, USP, dual-brand (Taha+Sophiya), profile, 90-day roadmap, the rules.
  - `PLAYBOOK.md` — the **HOW**: 9 experts' lessons, 10 principles, Michel Lieben's operating manual, creative formats, pre-batch checklist. (Merged from the old Authority + Michel playbooks.)
  - `FORMAT-LIBRARY.md` — living swipe file, 12 proven formats (F1-F12) w/ real engagement + links, incl. F12 Synthesis/Mega-Playbook (see Content System below). **I keep this current.**
  - `POST-STRUCTURE-LIBRARY.md` — **added 2026-07-08, a real gap Sophiya caught**: FORMAT-LIBRARY.md covers content *angle* (F1-F12), this covers physical *layout* — line length, white space, bullets vs. arrows, brick vs. broken, number density. 5 named structures (S1-S5) read from ~60 real high-signal posts. Standing rule: every draft commits to ONE named structure from here, never freehand, same as hooks.
  - `COPYWRITING-BIBLE.md` — the master copywriting reference distilled from Ogilvy (*Ogilvy on Advertising*) + Sugarman (*The Adweek Copywriting Handbook*). Principles + mechanics + a big **Swipe File** (Part C: steal-and-adapt hooks, guarantees, ad structures) + a pre-publish checklist. Raid this when writing any hook/post/lead magnet. (Books live as PDFs in `linkedin-hq/`.) Not the same as `playbook/knowledge/copywriting.md` below — the Bible is book-sourced craft principles, the KB doc is corpus-cited real-post consensus. Cross-linked, not merged.
  - `RESOURCES.md` — external links/resources.
  - **`playbook/knowledge/` — the Knowledge Base (renamed from "Domain Synthesis" 2026-07-10):**
    one condensed mega-playbook per corpus domain (e.g. `deliverability-infra.md`), built from real
    high-signal posts + received lead magnets, every claim cited to its source. Growing over time —
    most files are still empty scaffolds (H1 + "what belongs here" + a "Sources ingested" list),
    only `deliverability-infra.md` has the real synthesis written. See Content System below for the
    full domain list and the build process. **Naming note:** don't confuse this with the unrelated
    `linkedin-hq/knowledge-base/` folder at repo root — that's a client-facing course product
    (`cold-email-mastery/`), nothing to do with this internal research base.
- **`content/` — the render workshop only** (standing organization rules live in `content/README.md`
  — that's the one source of truth, don't duplicate its details here): `make-gif.cjs` + `assets/`
  (brand images) + `sources/` (editable source visuals, e.g. `toolstack-*.html`) + `meme-templates/`
  (reusable raw meme images) + `posts/<person>/linkedin/<date>-<slug>/` (final published deliverables
  only, split into `media/`/`pinned-comment/`/`proof/`). Finished work does **not** pile up flat in
  `content/` root — every generated visual has a defined home before it's considered done.
  - **Render any visual → LinkedIn GIF:** `cd content && node make-gif.cjs <absolute-path-to-input.html> <output.gif> [width] [fps] [recMs] [winStart] [winLen]` (needs an absolute source path). Bundled `ffmpeg-static` + puppeteer, one shared palette + bayer dither = no flicker. Ship GIF only (no MP4).
- **The record lives in the Posts tab now, not Notion (as of Stage 12, 2026-07-08).** Every post's likes/comments/views/worked-verdict is tracked in this Sheet's Posts tab (columns L-Q) via `scripts/sync-post-stats.mjs`, replacing the Notion Content Command Center's role. **Winner scoring:** `score = likes + comments×3`; winner ≥ 80, flop ≤ 15, else neutral (comments worth 3×). The full strategy for making Taha a cold-email celebrity — score rule, reach-not-content diagnosis, a **deep mine of the 6,642-post scraped corpus** (11 top creators), the format-median truth (**announcements + case-studies win; contrarian-take is overused/lowest-median**, correcting an earlier note), Michel Lieben's growth mechanics, the Claude-Code build-in-public wave as Taha's unfair advantage, the 30/30 engagement ritual, and the revamped 5-pillar plan — lives in **`playbook/WINNER-RATE-PLAYBOOK.md`** (built 2026-07-11; re-run `scripts/analyze-posting-cadence.mjs` for cadence, re-derive §3 from `../campaign-master/knowledge-base/learning-center/_tagged.jsonl`). Lead magnets still publish to Notion for the doc itself (`/api/notion/publish`) — only the performance-tracking role moved. The old `content/REGISTRY.md` and the Notion CCC are both retired.
- **⭐ STANDING RULE — every lead-magnet Notion page goes under the "Lead Magnets" page, nowhere else.** Parent page = **"Lead Magnets"**, page id `293ddcc6-efa6-8090-918f-eed790c338e3` (URL `notion.so/bleedai/Lead-Magnets-293ddcc6efa68090918feed790c338e3`). Every magnet we build lives here as a sibling child page (Deliverability Checklist, the TAM guide, etc. are the existing ones — match that spot). **Do NOT leave a magnet under the default "Company Databases" parent** (`23d8d5a2-d921-432c-9ee8-cab2dc1b8db6`) that `bleed-ai-brain`'s `NOTION_PARENT_ID` / `notion-page-from-md.cjs` create under — that helper drops the page in the wrong place, so pass the Lead Magnets id explicitly as the parent when you create it. **Create it in the right parent from the start:** the Notion `PATCH /v1/pages` "move" (changing `parent`) silently no-ops with our integration token (returns 200 but keeps the old parent), so you cannot move a misplaced page after the fact — recreate under the correct parent and archive the stray copy. After publishing, remember the page still needs **Share → Publish to web** turned on before a "comment the keyword" lead magnet link is openable by the public.
- **Brand (all assets):** `../Bleed AI Branding/BRAND.md` is the master — dark `#07070d` + red `#b1130f`/`#ff3d38`, Inter + Instrument Serif + JetBrains Mono, the droplet. Never invent brand colors per-file.
- **Content rules:** approval-first (pitch idea-pairs → Sophiya approves → THEN write; saves API/agency). Every post ships a lead magnet + a 1080×1350 visual. Weekly batches. Tag the tool brands in posts. Verify any price live before quoting. Sophiya's comments = short, warm, teammate-casual, no cost/bill talk.
- **⭐ Master growth curriculum:** `playbook/LINKEDIN-GROWTH-MASTERCLASS.md` (built 2026-07-11) is the lesson-by-lesson LinkedIn-growth playbook — deep research on Lara Acosta, Pierre Herubel, Adam Robinson, Justin Welsh, Jasmin Alić, Ruben Hassid + the 2025/26 algorithm science (360Brew LLM feed, van der Blom's 1.8M-post report, AuthoredUp format/length data) synthesized with our own corpus. Read it for positioning, the algorithm, hook/structure craft, distribution, monetization, and Taha's pro strategy. Pairs with `WINNER-RATE-PLAYBOOK.md` (Taha-specific) and `PLAYBOOK.md` (the original 9-expert reference).
- **⭐ Copywriting rule (always):** ANY LinkedIn copy — post, hook, comment, or lead-magnet landing page, whether via the skill or written ad-hoc in chat — must be built on `playbook/COPYWRITING-BIBLE.md`. Pull hooks from Part A§3 + B§1 + the Part C swipe file, find angles via the 31 triggers (A§6), and run the Part D pre-publish checklist before showing anything. The Bible governs *craft* (why it pulls); voice rules in SKILL.md govern *how it sounds* — use both, they don't conflict.

## Content System (built 2026-07-08 onward — Stages 1-8 done)

**Why this exists:** before this, sources were scattered with no map, drafting a post meant starting blank, and lead magnets/visuals worth stealing were captured nowhere. This build connects what already existed (the 6,642-post tagged corpus, this Sheet) and adds the few genuinely missing pieces — one stage at a time, each tested before the next.

**Three standing philosophies (apply to every post/lead magnet):**
1. **Synthesis over volume** — condense scattered info into one asset that saves the reader time (`playbook/knowledge/` Knowledge Base docs are the mechanism).
2. **Show the work** — cite real numbers/sources/tools, never invent a stat.
3. **Prove before automating** — one real post/capture end-to-end before touching `/linkedin-batch` or adding cron jobs.

**Status (2026-07-08):** Stages 1-15 all touched; two things remain genuinely gated on Sophiya
(not skippable, not something to force through autonomously — see Stage 15 note below). The full
stage-by-stage build plan (with test criteria for each) is the working document for this — ask
Sophiya for the latest copy if you need the full detail; the tabs/scripts/docs below are the
durable result.

- **Stage 10 (COOKED Company Snapshot):** added Story/Wins/Losses/Growth subsections to
  `COOKED/CLAUDE.md`, sourced from real WinsLog rows, PROOF-LIBRARY.md, and the Calendly pull —
  never invented.
- **Stage 11 (brand compliance):** fixed 3 objective gaps between `BRAND.md` and
  `linkedin-batch/SKILL.md`'s banned words/phrases. Flagged 2 real, unresolved voice
  contradictions in the Flags tab rather than silently picking a side.
- **Stage 12 (performance tracking):** ported Notion CCC's scoring logic into the Posts tab
  (see above). Dry-run tested; the live `--run` test needs a real published post first.
- **Stage 13 (`linkedin-post` skill):** built and smoke-tested (see its own section below). The
  full milestone — Sophiya reviewing, approving, and publishing a real post — is still pending
  her.
- **Stage 14 (Daily TLDR):** built and tested against live data (see its own section below).
- **Stage 15 (comment bot):** the auto Visual Swipe capture mechanism is built (see below).
  Rotating the Apify key and importing/activating the n8n workflow are real, external,
  hard-to-reverse actions — deliberately left for Sophiya, not attempted autonomously.

**The `linkedin-post` skill (Stage 13)** — `[.claude/skills/linkedin-post/SKILL.md](.claude/skills/linkedin-post/SKILL.md)`,
invoke with `/linkedin-post`. Drafts ONE post from the next Content Calendar slot (or an explicit
Post Ideas row / Knowledge Base doc (`playbook/knowledge/`) / WinsLog entry), always 2-3 options each citing a real
Template Library hook source + a real proven structure (S1-S5) + a real fact, each with 2-3
starred lead magnet options. Structured as a master + 4 sub-skills in the same folder
(`hook-selection.md`, `post-structure-selection.md`, `lead-magnet-suggestion.md`,
`brand-compliance.md`) — read fresh each time, not cached. **Standing rule (2026-07-08): no
original hooks, no original structures, for the first few weeks — every draft traces to a real
template for both.** Hooks are also checked against LinkedIn's "...see more" truncation (~140
chars mobile, ~200-250 desktop, third-party observed — hard limit set at 120-130 visible
characters, see `COPYWRITING-BIBLE.md`'s pre-publish checklist). Reuses `linkedin-batch`'s Voice
Rules (never duplicates them) and its Phase 8 lead-magnet build pipeline (never rebuilds it).
Reads the Sheet via `node scripts/read-tab.mjs --tab "<name>"` (no Vercel API route exists yet
for the Stage 1-7 tabs). **Data plumbing smoke-tested with real data (Phases 1-2); the full
milestone — Sophiya reviewing/approving/publishing a real post — is still pending her.**
`/linkedin-batch` remains untouched and available for multi-post batches.

**Three more standing rules added 2026-07-08 (after Sophiya's first live run of the skill):**
1. **Topic guardrail** — every angle must be cold email / outbound / email marketing /
   AI-automation / running the agency, or a clear ADJACENT topic per Voice Rules. Not LinkedIn
   content strategy about itself, not anything with no real tie to the business. Checked at
   Phase 1, before the angle is even shown to her. This flagged the 2026-07-13 Content Calendar
   slot ("building our own LinkedIn content system") as off-topic — it's meta/LinkedIn-about-
   LinkedIn, not cold email/business/AI, so it needs a swap or a rewrite of that slot's angle.
2. **Angle confirmation gate** — Phase 1 now stops and asks her to confirm (or redirect) the
   picked source before Phase 2 starts. Never drafts on an unconfirmed source.
3. **Visible progress** — the skill now calls `TodoWrite` at the start of every run, tracking its
   9 phases as a live checklist, updated in real time as the run progresses.
4. **Pinned comment = meme, nothing else (new Phase 7, `pinned-comment-meme.md`)** — every
   approved draft now also gets a pinned first comment, and its only job is a meme genuinely
   relevant to that post's angle. **Lead magnets are never linked in the post or the pinned
   comment** — delivery is comment-to-DM (the post body's own CTA line asks for a keyword in the
   comments, Sophiya/Taha DM the actual resource by hand). Real capability check: there's no
   image-generation tool and no way to fetch a real copyrighted meme template photo here — so the
   meme is an **original graphic built as HTML and rendered via the existing `content/make-gif.cjs`
   pipeline** (same one used for every other brand visual), in the *joke structure* of a known meme
   format (expanding brain, expectation-vs-reality, etc.), never a re-hosted copy of someone else's
   template image.

**The `daily-tldr` skill (new initiative, 2026-07-08 — separate from the Stage 1-15 content
system above)** — `[.claude/skills/daily-tldr/SKILL.md](.claude/skills/daily-tldr/SKILL.md)`.
A calm personal-reading digest, not a status report: highlights from tracked LinkedIn creators +
r/coldemail (both already flowing into Intel, no new scraping) + subscribed newsletter emails
(TLDR newsletter only for now), written at a 6th-grade reading level, posted to the **"TLDR"**
Slack channel and archived as clean rows in the revamped DailyReports tab. **Not the same thing
as `linkedin-health-check.mjs`** (renamed from `daily-content-tldr.mjs` this same day specifically
to avoid this confusion — that one's an internal content-ops status report for COOKED's check-in).

Real, tested, working as of 2026-07-08: the Sheet-writing pipeline (`save-daily-report.mjs`) and
the Slack-posting pipeline (`post-tldr-to-slack.mjs`, extending `campaign-master/scripts/lib/
slack-notify.cjs` with Block Kit `blocks` support) both ran end-to-end with real data. The
**"TLDR" Slack channel is private** (Sophiya's choice) — its bot, **Ava** (`ava`,
`U0AM08T3GMT`), only has auto-join scopes for *public* channels, so private channels need a
one-time manual add (Sophiya added Ava herself). Channel ID `C0BFW65FB1C` is saved as
`TLDR_SLACK_CHANNEL_ID` in `.env.local`.

**One real, unresolved gap:** the Gmail MCP connector in a Claude Code session is scoped to
`owner@bleedai.com` (Taha's inbox), not `sophiya136@gmail.com` (where the TLDR newsletter
actually arrives) — confirmed by directly searching for it and finding nothing. Until this is
fixed (switch the connector, or forward the newsletter to the connected inbox), Phase 3 of the
skill (pulling the newsletter) can't run for real — everything else can.

Ships as a **manual command for now** (Sophiya's call) — she runs it, or asks for it, rather than
it running on a schedule. Convert to a scheduled cloud routine only once she's happy with the
output after running it by hand a few times.

**Google Drive — `LinkedIn/` folder** (company Shared Drive, `bleedai-bot` service account, `supportsAllDrives: true` on every call — never a personal Drive):
```
LinkedIn/
├── Post Renders/Taha/       — Taha's own published visuals
├── Post Renders/Sophiya/    — Sophiya's own published visuals
├── Lead Magnets (Ours)/     — lead magnets we built
├── Visual Swipe/            — visuals worth stealing from others (see tab above)
└── Proof Screenshots/       — content-worthy proof, dual-saved from the general PROOF folder
```
Shared utility: [scripts/lib/linkedin-drive.mjs](scripts/lib/linkedin-drive.mjs) (`resolveLinkedInSubfolder`, `uploadFileToFolder`, `uploadWithOptionalProofDualSave`). Built/fixed by `scripts/setup-linkedin-drive.mjs` (also fixed a real bug: the general PROOF folder was misfiled inside a random client's folder due to an env-var name mismatch in `lm-sales-agent`).

**Scripts** (all in `scripts/`, all read `.env.local` the same way as the rest of the app):

| Script | Does |
|---|---|
| `setup-sources-tab.mjs` | Creates/seeds the Sources tab (idempotent by name) |
| `format-all-tabs.mjs` | Applies house style to every tab — re-run after adding/changing any tab's schema |
| `build-template-library.mjs` | Extracts + ranks the Template Library from the tagged corpus |
| `extract-domain-synthesis-source.mjs --domain <name> --top N` | Pulls full-content top posts for one corpus domain, for writing/updating a `playbook/knowledge/<domain>.md` Knowledge Base doc |
| `analyze-posting-cadence.mjs` | Real posts/week + day-of-week + content-type mix per tracked expert |
| `setup-linkedin-drive.mjs` | Builds/repairs the `LinkedIn/` Drive folder tree |
| `setup-visual-swipe-tab.mjs`, `capture-visual-swipe.mjs` | Visual Swipe tab setup + the capture-one-visual flow |
| `setup-content-calendar-tab.mjs`, `setup-post-ideas-tab.mjs` | Seed the two Stage 7 tabs (won't overwrite hand-edited rows) |
| `capture-item.mjs --type lead_magnet\|idea\|webinar` | The universal capture mechanism — routes to LeadMagnets (kind=received) or Post Ideas (status=raw) |
| `capture-proof-screenshot.mjs` | For a screenshot flagged 🎯 in `COOKED/proof/SLACK-SCREENSHOT-CHECKLIST.md` — dual-saves to `LinkedIn/Proof Screenshots/` and logs a sourced Post Ideas row |
| `pull-booked-call-proof.mjs [--days 30]` | Real booked-call count via the **Calendly API** (not Google Calendar — see note below), logged to Post Ideas. Run via `cd lm-sales-agent && bin/dev node ../linkedin-hq/scripts/pull-booked-call-proof.mjs` since that's where `CALENDLY_API_TOKEN` lives (Doppler, `bleedai`/`prd_upwork-sales-agent`) |
| `sync-post-stats.mjs [--run]` | Performance tracking (Stage 12) — Apify scrape → match by `posted_url` → writes likes/comments/views/worked into the Posts tab. Dry-run by default; `--run` costs money and hits real LinkedIn profiles via Apify, needs Doppler's `APIFY_TOKEN` and explicit sign-off before the first live run |
| `read-tab.mjs --tab "<name>" [--range A1:Z1000]` | Dumps any Sheet tab as JSON — the `linkedin-post` skill's read plumbing (Stage 13), since no Vercel API route exists yet for the Stage 1-7 tabs |
| `linkedin-health-check.mjs` | Stage 14 (renamed 2026-07-08 from `daily-content-tldr.mjs` — no logic change, just avoiding a name collision with the new Daily TLDR reading digest) — distilled content-system section for COOKED's daily check-in (step 5b): Intel highlights, recent Posts performance, fresh Post Ideas, next Content Calendar slot(s) |
| `auto-capture-tracked-visuals.mjs [--threshold 50] [--hours 24]` | Stage 15 — auto-captures tracked-creator visuals above a score threshold into Visual Swipe, once the comment-bot pipeline is live and passing through `image_url` |
| `setup-daily-reports-tab.mjs` | One-time: revamped the DailyReports tab from a blob-per-day shape to one-row-per-item (2026-07-08) |
| `save-daily-report.mjs --date <YYYY-MM-DD> --items-file <path>` | Writes one day's Daily TLDR items to DailyReports — idempotent, replaces that day's rows on re-run |
| `post-tldr-to-slack.mjs --date <YYYY-MM-DD> --items-file <path> [--channel <id>]` | Posts the Daily TLDR to the "TLDR" Slack channel as grouped Block Kit sections. Needs `SLACK_BOT_TOKEN` (campaign-master's Doppler `bleedai`/`prd`, not this repo's `.env.local`) — channel ID defaults from `TLDR_SLACK_CHANNEL_ID` in `.env.local` |
| `add-intel-display-dates.mjs` | Backfills `pulled_at_display`/`posted_at_display` (Intel!O:P) from the machine ISO columns — new rows get this automatically via `appendIntel`, this is just for old rows / re-running after a manual edit |
| `setup-connects-tab.mjs`, `capture-connects.mjs --url <post_url> --expert "<name>"` | New (2026-07-09) — the "people to connect with" list. Per Sophiya's targeting rule: the people worth a real connection request are the ones already commenting on tracked cold-email experts' posts, since they're already interested in this space. `capture-connects.mjs` fetches a post's **public** page (no login, no Apify — LinkedIn server-renders a handful of top comments even logged out) and extracts each commenter's real name + profile URL into the Connects tab, deduped against what's already there. Free, zero API cost, but only surfaces the top comments LinkedIn shows a logged-out viewer — not the full thread. Run it against Template Library's top posts or any fresh high-engagement post from a tracked expert. |

**Note on "the Calendar":** Taha's booked-call tracking runs on the **Calendly API**, not a Google Calendar integration — `lm-sales-agent/scripts/calendly/sync-bookings.mjs` is the original, `pull-booked-call-proof.mjs` above reuses its org/event-type scoping read-only. The claude.ai Google Calendar MCP connector is a separate, currently-unauthorized thing — don't confuse the two.

## Architecture (v2, post 2026-04-13 refactor)
On 2026-04-13 batch generation moved out of the Vercel app and into a Claude Code skill. The Vercel app is now a thin data+intel host. The skill is where posts and lead magnets are actually written.

```
Claude Code skill (linkedin-batch)          Vercel web app
├── reads WinsLog + starred Intel           ├── /news    — reddit + google news + linkedin
├── generates N posts in Taha's voice       ├── /capture — placeholder (solo post gen coming)
├── reviews interactively with user         ├── /lead-magnet/<slug> — public landing pages
├── saves approved posts to Posts tab       └── API routes:
└── builds lead magnets end-to-end:               /api/winslog          (GET)
      - deep research (10-15 WebSearch)            /api/intel/starred    (GET)
      - outline → approve                          /api/intel/refresh    (POST) news+reddit scout
      - body → approve                             /api/intel/ingest     (POST) n8n linkedin feed
      - POST /api/notion/publish                   /api/posts/save       (POST)
      - POST /api/lead-magnet/save                 /api/posts/:id        (GET)
        (creates LeadMagnets row, rewrites        /api/notion/publish   (POST)
         Post row lead_magnet cell with            /api/lead-magnet/save (POST)
         landing URL, revalidates landing page)
```

## Stack
- Next.js 16 (App Router) + Tailwind v4 + shadcn/ui
- Google Sheets API (service account) as database
- Anthropic Claude API (`claude-sonnet-4-6`) — still used by legacy v1 AI helpers (ai-studio, comment, hook, etc) but **not** for batch generation anymore
- @notionhq/client for lead magnet publishing
- nanoid for stable post ids
- Web Speech API for voice capture (still on `/capture` placeholder)
- n8n cloud for the LinkedIn creator scraping pipeline

## Google Sheet — 13 tabs
One spreadsheet. Run `setup-v2.gs` in Google Apps Script once to initialize the original 5. If migrating from pre-2026-04-13 Posts schema (no id column), run `migrate-posts-add-id.gs` first. 7 more tabs were added during the 2026-07-08 content-system build, and the Connects tab was added 2026-07-09 (`scripts/setup-*.mjs`, one script per tab — see Content System below).

**House style:** every tab uses one shared look — frozen bold red header row, wrapped/sized columns, a filter view, and a shared status-color palette (same word = same color on every tab). Applied by `scripts/format-all-tabs.mjs`; re-run it whenever a tab's schema changes.

| Tab | Purpose |
|---|---|
| **Sources** | The map. Every content source (scraped corpus, WinsLog, Drive, playbooks, etc.), where it lives, and its status (`live \| live-partial \| live-manual \| building \| gap \| exists-unprocessed \| dormant \| retiring`). Check here first if you're not sure where something is. Columns: `name \| location \| status \| last_touched \| notes`. |
| **Intel** | Unified news feed. Reddit + Google News + LinkedIn creators. Columns: `pulled_at \| posted_at \| type \| source \| title \| url \| summary \| score \| starred \| comment_text \| comment_status \| comment_posted_at \| comment_style \| image_url \| pulled_at_display \| posted_at_display`. The four comment_* columns are added by `setup-v2.gs`'s `ensureColumns` helper and carry the auto-comment state for each LinkedIn post (one row per post, no separate Comments tab). `image_url` is Stage 15's field for the post's photo/GIF. **`pulled_at`/`posted_at` stay ISO 8601 on purpose** — several scripts do date math on them (recency windows, cutoff filters) — `pulled_at_display`/`posted_at_display` (O/P, added 2026-07-08) are the human-readable companions ("7:26 pm, 8 April 2026") for actually reading the sheet. Both get written automatically by `appendIntel` (`lib/sheets.ts`) on every new row; `scripts/add-intel-display-dates.mjs` backfills old ones. |
| **Config** | Key-value config. Keys used by the app: `linkedin_creators` (newline-separated profile URLs), `linkedin_posts_per_creator` (int). Legacy keys still supported: `daily_focus`, `strategy_context`. |
| **WinsLog** | Taha's real client wins — the authenticity moat. Seeded from `upwork proposal/CLAUDE.md`. Columns: `date \| client \| campaign \| what_we_did \| result \| lesson \| tags \| case_study_doc_link`. `tags` distinguishes win/experiment/case-study; `case_study_doc_link` is for long-form write-ups (verified stats live on bleedai.com, not duplicated here). |
| **Posts** | Generated posts saved by the skill (columns A-K, unchanged) PLUS 6 columns added in Stage 12 for performance tracking: `posted_url \| likes \| comments \| views \| worked \| stats_updated_at` (columns L-Q) — ported from `bleed-ai-brain/scripts/stats-scrape.cjs`'s Notion logic, ­now targeting this tab instead of the Notion Content Command Center. `id` is a 10-char nanoid. `lead_magnet` starts as `name | prop | cta` and is rewritten to the live landing URL after a lead magnet is built. `worked` values: `winner \| neutral \| flop` (score = likes + comments×3). Run `node scripts/sync-post-stats.mjs` (dry-run by default, `--run` to actually hit LinkedIn via Apify — costs money, needs Sophiya's go-ahead same as the original script did). |
| **LeadMagnets** | Lead magnet build pipeline. **⚠️ Read by HEADER NAME, not column position (as of 2026-07-11) — so columns can be freely reordered in the Sheet without breaking anything.** `lib/sheets.ts` (`readLeadMagnetSheet` → `loadLeadMagnets`/`createLeadMagnetRow`/`updateLeadMagnetRow`) and `scripts/capture-item.mjs` both resolve fields via a header→index map; only `readSheet` returns raw positional arrays. Current order: **`source_person`** (moved to column A 2026-07-11, it's the "Source Creator" — for our own magnets it's the profile they were published on, e.g. `Taha Anwar`; for received ones it's the external author) `\| id \| post_id \| slug \| status \| title \| hero_text \| value_props \| cta_text \| outline_md \| body_md \| notion_url \| landing_url \| gif_url \| created_at \| clicks \| conversions \| kind` (own/received) `\| source_post_url \| key_takeaway \| used_in_post \| domain`. A received lead magnet is a row with `kind=received`, logged via `node scripts/capture-item.mjs --type lead_magnet ...`. Status values (own): `researching \| outline_ready \| body_ready \| published \| error`. Status values (received): `unreviewed \| reviewed`. **If you reorder/rename columns, update `scripts/format-all-tabs.mjs`'s `LeadMagnets.widths`/`statusCol` to match.** |
| **Template Library** | Curated top ~150-200 posts from the tagged corpus (`campaign-master/knowledge-base/learning-center/_tagged.jsonl` joined to each expert's `posts.json`), ranked by likes and separately by comments. This is the swipe/hook source for drafting — read it before writing a post, don't guess a hook. Columns: `hook \| suggested_format \| expert \| domain \| likes \| comments \| shares \| comment_to_like_ratio \| engagement_tier \| url \| date_added`. `comment_to_like_ratio` is a live Sheets formula (`=IF(likes=0,0,comments/likes)`) — added 2026-07-08 so real engagement (people compelled to respond) is visible separately from vanity likes; recalculates if you hand-edit a row. **No impressions column** — LinkedIn doesn't expose view counts for posts you don't own, and Apify can't get them either; only likes/comments/shares are public data. (Our *own* posts' views, once published, are a different, real data source — see the Posts tab below.) Rebuild with `node scripts/build-template-library.mjs [--top=100]` (idempotent — clears + rewrites data rows). |
| **Visual Swipe** | Forward-only capture of visuals (infographics, screen recordings, carousels) worth stealing from other creators — not backfilled from the corpus (its image URLs are dead links by now). Capture mechanism: right-click a LinkedIn visual → "Copy image address" (the signed `media.licdn.com` CDN link works without a login, unlike the page itself) → `node scripts/capture-visual-swipe.mjs --url <link> --source <person> [--post-url ...] [--type ...] [--notes ...] [--adaptation ...]`. Downloads it, uploads to `LinkedIn/Visual Swipe/` on Drive, logs the row. Columns: `date \| visual_type \| source_person \| source_url \| notes \| our_version_adaptation \| drive_link \| status`. |
| **Content Calendar** | Rough, editable draft calendar for Taha's and Sophiya's personal profiles (Bleed AI's company page is Phase 2). Cadence is real, not guessed — see `scripts/analyze-posting-cadence.mjs`, which reads every tracked expert's actual post history. Columns: `date \| day \| profile \| post_type \| visual_type \| angle_theme \| source \| status` (status: `planned \| swapped \| posted`). Seeded/reseedable via `scripts/setup-content-calendar-tab.mjs` (won't overwrite hand-edited rows). |
| **Post Ideas** | The "never start from a blank page" backlog — concrete, fully-tagged post concepts decoupled from any date. Some rows are assigned to a Content Calendar slot (`status=scheduled`, see `scheduled_slot` column for exactly which one); most sit in backlog (`status=unused`) until picked. Also accepts raw, untriaged quick-capture rows (`status=raw`) — a fast idea or a webinar/lecture note logged via `node scripts/capture-item.mjs --type idea` or `--type webinar`, to be filled in properly later. Columns: `idea_angle \| suggested_format \| funnel_stage \| tags \| lead_magnet_ideas \| source \| status \| scheduled_slot`. Seeded via `scripts/setup-post-ideas-tab.mjs`. |
| **Connects** | New (2026-07-09) — real people worth sending a genuine connection request to, sourced from who's already commenting on tracked cold-email experts' posts (Sophiya's targeting rule: they're already interested in this space, don't cold-connect strangers). Columns: `name \| profile_url \| commented_on \| source_expert \| date_added \| status \| notes` (status: `not_contacted \| requested \| connected \| ignored`). Seeded via `scripts/setup-connects-tab.mjs`, populated via `scripts/capture-connects.mjs --url <post> --expert "<name>"`. |
| **DailyReports** | The Daily TLDR archive (revamped 2026-07-08 — the old one-blob-per-day shape was "messy and unstructured," now one row per digest item, matching every other tab). Columns: `date \| category \| headline \| summary \| source_type \| source_name \| url`. Written by the `daily-tldr` skill via `scripts/save-daily-report.mjs` (idempotent — re-running for the same day replaces that day's rows, never duplicates). Old blob-shaped data backed up to `.scratch-synthesis/dailyreports-backup-2026-07-08.json` before the schema changed. |
| **Flags** | Open questions/issues logged during the build that need a human decision later. Columns: `date \| area \| question \| detail \| resolved?` (TRUE/FALSE colored). |

## Env vars
Local in `.env.local`, production in Vercel project env. All must be set for full functionality.

| Var | Purpose |
|---|---|
| `GOOGLE_SHEETS_ID` | the one sheet |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | sheets API auth |
| `GOOGLE_PRIVATE_KEY` | sheets API auth (escape newlines as `\n`) |
| `ANTHROPIC_API_KEY` | used by legacy `/api/ai/*` routes (not by the batch skill) |
| `NOTION_TOKEN` | internal integration token from notion.so/my-integrations |
| `NOTION_PARENT_ID` | Notion page id that is publicly shared and shared with the integration — child lead magnet pages inherit this visibility |
| `INTEL_INGEST_TOKEN` | shared secret header for `/api/intel/ingest` (protects the n8n → Vercel ingress) |

## Pages (v3 — 2026-07-08: /news + /capture retired)
| Route | Purpose |
|---|---|
| `/lead-magnet/[slug]` | Public landing page. Route group `(public)`. Reads the LeadMagnets row by slug server-side. Revalidated when a skill publishes. **This is now the only real page the app serves.** |

**`/news` and `/capture` were removed 2026-07-08** (Sophiya's call — she no longer wanted a web-app UI for this; replaced by the `daily-tldr` skill, which posts to Slack + the Sheet instead). Deleted with them: `components/DailyReport.tsx`, `components/NewsItem.tsx`, `components/BottomNav.tsx`, `components/QuickCaptureButton.tsx`, `app/api/report/route.ts`, `app/api/report/generate/route.ts`, `lib/report.ts` (the Gemini/Groq report-synthesis call — orphaned once nothing called it; the new skill has the agent do synthesis inline instead, no secondary LLM call needed). `app/layout.tsx` no longer renders a bottom nav — there's nothing left to navigate to outside the public lead-magnet pages. **The rest of the app — all `/api/*` routes `/linkedin-batch` and `/linkedin-post` depend on — is untouched.**

Legacy v1 pages (`/ai-studio`, `/analytics`, `/calendar`, `/creators`, `/ideas`, `/lead-magnets`, `/reddit`, `/sources`, `/swipe-file`) still exist on disk but are unreachable from any nav (was already true before this cleanup). They can be deleted later.

`/batch` was removed entirely on 2026-04-13 when batch generation moved to the skill.

## Key files
- [lib/sheets.ts](lib/sheets.ts) — sheets wrapper. Intel + Posts + LeadMagnets loaders, `appendPosts` returns ids + rowIndices, `updatePostLeadMagnet`, `createLeadMagnetRow`, `updateLeadMagnetRow`, `saveDailyReportItems`/`getDailyReportItems`/`listReportDates` (DailyReports, revamped 2026-07-08), etc.
- [lib/claude.ts](lib/claude.ts) — Anthropic SDK wrapper for the *legacy* AI helpers (comment, hook, ideas, brief, strategy) + news scout (`fetchIntelFromWeb`). `BATCH_SYSTEM_PROMPT` and `generateBatch` were **deleted** on 2026-04-13.
- [lib/intel-filter.ts](lib/intel-filter.ts) — shared keyword relevance gate used by news scouts, reddit fetcher, and the LinkedIn creator ingest route.
- [lib/notion.ts](lib/notion.ts) — `publishLeadMagnetToNotion()` + a minimal markdown → Notion blocks converter.
- [lib/reddit.ts](lib/reddit.ts) — direct Reddit JSON fetcher for r/coldemail (OAuth pending), free, no scraping needed. Feeds Intel via `/api/intel/refresh`, which the `daily-tldr` skill calls before reading Intel.
- [setup-v2.gs](setup-v2.gs) — one-click sheet cleanup/setup. Creates WinsLog, Posts, LeadMagnets. Seeds WinsLog from Taha's real wins.
- [migrate-posts-add-id.gs](migrate-posts-add-id.gs) — one-time migration to add `id` column to existing Posts tab.
- [n8n-linkedin-creators.json](n8n-linkedin-creators.json) — n8n workflow template for the LinkedIn creator scraper. Import, set your rotated Apify credential and `x-ingest-token` header, activate.
- [.claude/skills/linkedin-batch/SKILL.md](.claude/skills/linkedin-batch/SKILL.md) — the batch generator skill. Single source of truth for Taha's voice rules.

## API routes (v2 — skill-facing + legacy)
- `GET  /api/winslog` — thin proxy, returns WinsLog rows (skill input)
- `GET  /api/intel/starred` — thin proxy, returns starred Intel rows (skill input)
- `POST /api/intel/refresh` — runs the Reddit + Google News scouts (news page refresh button)
- `POST /api/intel/ingest` — n8n LinkedIn creator pipeline entrypoint. Protected by `x-ingest-token`
- `POST /api/comments/plan` — reads Intel for LinkedIn posts that have no comment yet, picks top-engagement ones up to the daily cap, generates a comment per post in Taha's voice, runs voice quality gate, writes draft to the matching Intel row, returns approved comments to n8n. Called by the n8n creator feed AFTER `/api/intel/ingest`.
- `POST /api/comments/log` — receives `{ url, status, error? }` from n8n after each LinkedIn comment POST attempt. Looks up the Intel row by URL and updates `comment_status` (and `comment_posted_at` if posted, or `comment_text` with the error if failed).
- `POST /api/posts/save` — appends posts, returns `{ saved, items: [{id, rowIndex, hook}] }`
- `GET  /api/posts/:id` — fetch a single post by nanoid id
- `GET  /api/news` — reads Intel tab for the /news page
- `POST /api/news/star` — toggles starred flag
- `POST /api/notion/publish` — markdown body → Notion page, returns `{ notionUrl, pageId }`
- `POST /api/lead-magnet/save` — creates LeadMagnets row, rewrites source Post's lead_magnet cell with landing URL, revalidates landing page
- **Legacy** (v1 pages still on disk): `/api/ai/comment`, `/api/ai/hook`, `/api/ai/ideas`, `/api/ai/brief`, `/api/ai/strategy`, `/api/ai/creator`, `/api/checklist`, `/api/reddit`, `/api/sheets`

## ⭐ Comment voice — the "insight voice" (Michel × Sophiya, 2026-07-11) — the CURRENT voice for ALL comments
The comment voice was completely reworked 2026-07-11 after Sophiya reviewed real generated comments
and rejected the old Taha short peer-reaction voice ("spot on!", "Cool", 1-20 word quips) as too
thin. The new voice — `generateInsightComment` / `qualityGateInsightComment` in `lib/comments.ts` —
blends **Michel Lieben's expert/educational comment style** with **Sophiya's real voice**
(`playbook/SOPHIYA-VOICE.md`, read live at call time — the one source of truth, don't duplicate the
prose). Key rules baked into the prompt (all from her direct feedback that day):
- **Sound ALIVE, not like a summary.** The literal "4th-grade, 6-12 words per sentence" first draft
  came back "dead, lifeless, very AI, emotionless" — simple words got turned into choppy fact-lists.
  The fix: plain words BUT a real reaction, conviction, natural rhythm. The prompt carries explicit
  DEAD-vs-ALIVE examples (marked "style only, never reuse the words/scenario").
- **2 lines max** (~12-28 words, gate hard-caps at 34). No walls of text.
- **Three JOBS** (`InsightMode` = `educational | witty | question`): the Suggest button returns one of
  each (educational insight, witty/funny/relatable, compliment + a real question) so the 3 chips are
  a genuine choice, not 3 rewordings. The auto-bot (`/api/comments/plan`) rotates the 3 across the
  daily batch.
- **CTA all-caps:** `detectCtaTriggerWord` finds a lead-magnet keyword ("comment GUIDE below") and the
  comment is guaranteed to include it IN ALL CAPS so the author's automation DMs the resource.
- **SKIP:** if a post is too thin to add real value (bare link, one-liner), the model returns `SKIP`
  and the caller drops it instead of fabricating — the safety rule that stops off-topic hallucinated
  comments (it correctly skipped a bare-link post in testing).
- Leading `Honestly,`/`Probably,` is code-stripped (the model overused it as an opener).
- **Deploy gotcha (learned the hard way):** the generator reads `SOPHIYA-VOICE.md` at runtime, and
  Next's serverless bundler drops non-traced files → every generation threw ENOENT and the endpoint
  silently returned `[]` on Vercel. Fixed via `outputFileTracingIncludes` in `next.config.ts` for the
  three comment routes. If you add another route that reads a repo file at runtime, add it there too.
- **Free-tier note:** comments run on Gemini free → Groq free fallback (`lib/ai.ts`). Groq's daily
  token cap (~100k TPD) is real and heavy *testing* can exhaust both, making the endpoint return `[]`
  transiently. Normal use (a few clicks/day, auto-bot cap 5/day) never comes close.
- Test harness: `scripts/test-comment-voices.mjs` (batch review → `COMMENT-VOICE-TEST.md`;
  `--demo3` prints 3-mode takes for a few real posts). Keeps its own copy of the prompt for offline
  review — `lib/comments.ts` is the production source of truth.

## Manual comment system — live now (verified 2026-07-09, voice reworked 2026-07-11)
Before the automated bot below, there's a simpler, already-working manual layer: the **Chrome
extension** at [extension/](extension/) ("Bleed AI — LinkedIn Comment Assistant"). It injects a
✨ Suggest comment button above the comment box on any LinkedIn post — desktop only, suggest-only,
nothing auto-posts. Calls the live `POST /api/comments/suggest` route (reuses `lib/comments.ts`'s
insight-voice engine + quality gate as the bot, no Sheet writes, no Slack), returns 3 drafts — one
**educational**, one **witty/relatable**, one **compliment + question** (see the insight-voice
section above) — Sophiya/Taha pick one, edit, send themselves. One-time install is in
[extension/README.md](extension/README.md) (`chrome://extensions` → Developer mode → Load unpacked →
select the `extension/` folder). **iPhone:** the extension is desktop-only; the chosen plan (full detail
in `IPHONE-COMMENT-SHORTCUT-PLAN.md`) is an iOS **AssistiveTouch/Back-Tap Shortcut** that screenshots →
on-device OCR → `/api/comments/suggest` → picker → clipboard (a true third-party overlay over LinkedIn
is impossible on iOS). Fallback: `/api/comments/suggest-from-url` via LinkedIn's public JSON-LD
`articleBody`. Not built yet as of 2026-07-11.

## Auto-comment loop on LinkedIn creator posts (v2, shipped 2026-04-14)

Closes the loop on the LinkedIn creator feed: every 4 hours when n8n scrapes the latest posts from the creators in the `linkedin_creators` Config row, it now also generates a comment in Taha's voice for the top-engagement ones and posts them to LinkedIn under his account, with Slack notifications for visibility.

**Flow:** Apify scrape → POST `/api/intel/ingest` (writes posts to Intel tab) → POST `/api/comments/plan` (reads Intel for LinkedIn posts that have no comment yet, picks the top by score up to `comments_daily_cap`, generates a comment via Claude using one of 5 style presets selected heuristically, runs the voice quality gate from `lib/voice-rules.ts`, writes draft to the matching Intel row, returns approved list) → split → random 30-90s wait → POST to LinkedIn `/v2/socialActions/{urn}/comments` via existing parasite OAuth credential → branch on success/fail → POST `/api/comments/log` with the post URL → Slack notify `#linkedin-comments`.

**Daily cap:** `comments_daily_cap` row in the Config tab, default 5. The plan route counts Intel rows where `comment_status=posted` and `comment_posted_at` starts with today, and stops generating once the cap is hit.

**Safety:**
- Voice quality gate enforces lowercase, no em dashes, no banned words/phrases, no rhetorical questions, no @mentions, length 30-280 chars
- 30-90s randomized wait between comments humanizes the cadence so it doesn't burst-post
- Slack notification is the kill switch — if a comment looks bad, you click the link in Slack and delete it manually from LinkedIn

**Style presets** (`lib/comments.ts` `STYLE_PRESETS`): `agree_add` (default, agrees and adds a stat), `contrarian` (pushes back on a strong claim), `sharp_question` (asks a real follow-up), `bts_story` (shares a 2-3 sentence behind-the-scenes), `tactical_tip` (drops one specific tactic). The picker is a heuristic over the post text.

**Still dormant as of 2026-07-08 — two real gates before this can go live:**
1. **Rotate the leaked Apify key** via the Apify console (not something any tool here can do).
2. **Import + activate** `n8n-linkedin-creators.json` in n8n.
Both are deliberately left for Sophiya — #2 in particular is the switch that turns on
*unsupervised* comment-posting to LinkedIn under Taha's real account, and the safety mechanism
above ("Slack is the kill switch") only works if she's actually there to watch it.

**Auto Visual Swipe capture (Stage 15, added 2026-07-08 — built, same dormant gates apply):**
once this pipeline is live, tracked-creator visuals get captured with zero manual action, not
just their text. `/api/intel/ingest` now accepts an `image_url` field per item (Intel tab gained
a matching column, N) — the n8n workflow just needs to pass through whatever image/GIF field the
Apify actor already returns (same field the corpus's `posts.json` uses). Then run
`node scripts/auto-capture-tracked-visuals.mjs [--threshold 50] [--hours 24]` (not yet wired to
any cron — run it manually after each ingest cycle, or fold into the n8n workflow as a final
step, once the pipeline itself is live) to auto-capture anything above the score threshold
straight into Visual Swipe, deduped against what's already there. The manual "copy image
address" path (`capture-visual-swipe.mjs`) remains for one-off posts Sophiya finds outside the
tracked list.

**Files:** [lib/voice-rules.ts](lib/voice-rules.ts), [lib/comments.ts](lib/comments.ts), [app/api/comments/plan/route.ts](app/api/comments/plan/route.ts), [app/api/comments/log/route.ts](app/api/comments/log/route.ts), and the `attachCommentToIntelRow` / `loadLinkedInPostsNeedingComment` / `countCommentsPostedToday` helpers in [lib/sheets.ts](lib/sheets.ts).

**n8n side:** `n8n-linkedin-creators.local.json` (gitignored) has the secrets pre-filled for import. The committed `n8n-linkedin-creators.json` has placeholders.

**Pre-flight test:** `n8n-gate0-comment-test.json` is a one-off throwaway workflow that posts a single test comment to verify the LinkedIn API accepts the OAuth credential. Always run this after reconnecting the LinkedIn credential to confirm it's healthy.

## Theming — IMPORTANT
⚠️ **Any UI change must be checked in both light and dark mode.** All colors use CSS variables — never hardcode oklch in components.

- Light: warm maroon/dusty-rose surfaces, deep maroon accents, dark text
- Dark: near-black surfaces, red accents, light text
- Toggle: `components/ThemeToggle.tsx` (fixed top-right), persists via localStorage
- Anti-flash script in `layout.tsx` reads localStorage before render
- Tailwind v4 dark mode: `@variant dark (&:where(.dark, .dark *))` in globals.css — no `tailwind.config` darkMode setting

### CSS variables (defined in `app/globals.css` `:root` and `.dark`)
| Variable | Purpose |
|---|---|
| `--surface-1` | Main card backgrounds |
| `--surface-2` | Elevated panels |
| `--surface-3` | Input backgrounds |
| `--surface-4` | Secondary/muted backgrounds |
| `--surface-pulse` | Skeleton loading animation |
| `--nav-bg` | Bottom nav background |
| `--border-subtle` | Subtle borders |
| `--border-accent` | Red/maroon-tinted borders |
| `--color-accent` | Primary accent color |

## The linkedin-batch Claude Code skill
This is where batch generation and lead magnet building happen. Lives at [.claude/skills/linkedin-batch/SKILL.md](.claude/skills/linkedin-batch/SKILL.md).

Invoke it in a Claude Code session with `/linkedin-batch`. The skill:
1. Parses `[count] [seed brief]` args
2. Pulls WinsLog + starred Intel from the Vercel proxies
3. Optionally runs 2–3 WebSearch calls if the seed brief names a topic
4. Writes N posts following the full voice rules block embedded in SKILL.md
5. Enters a free-form review loop with the user until they approve
6. Saves the approved posts via `POST /api/posts/save`
7. Asks which posts deserve a full lead magnet
8. For each selected: deep research (10–15 WebSearch) → outline → approve → body → approve → publish to Notion → save to LeadMagnets → rewrite source Post row with landing URL

**Voice rules in SKILL.md are the single source of truth.** Anything about Taha's voice — lowercase, no em dashes, banned words/phrases, 4 authenticity tags, funnel mix, format mix, 6 topic layers + adjacent — lives there. Do not duplicate those rules anywhere else in the codebase.

## n8n workflows
### LinkedIn Creators (file: `n8n-linkedin-creators.json`) — template ready, not active
Schedule (4h) → read `linkedin_creators` from Config tab → Apify LinkedIn Profile Posts actor per creator → normalize → aggregate → `POST /api/intel/ingest` with `x-ingest-token` header.

**Prereqs before activating:**
1. Rotate the Apify API key — the old one was leaked in a prior n8n workflow export. Log into the Apify console, revoke it, generate a fresh one, and use the fresh one in the n8n Apify credential. Do not put the old or new key in any committed file.
2. Create an Apify credential in n8n with the rotated key.
3. Set `x-ingest-token` in the HTTP Request node to match `INTEL_INGEST_TOKEN` in Vercel env.
4. Populate the `linkedin_creators` config key with newline-separated profile URLs.
5. Set `linkedin_posts_per_creator` (default 5 if missing).
6. Activate the schedule trigger.

### Reddit Monitor (file: `n8n-reddit-monitor.json`) — partial
Still needs Reddit OAuth credential setup before it can run. Not blocking anything — the direct JSON fetcher in `lib/reddit.ts` is what `/api/intel/refresh` uses today.

## Taha's voice — where to find it
Only one place: [.claude/skills/linkedin-batch/SKILL.md](.claude/skills/linkedin-batch/SKILL.md) under the **Voice Rules** heading. The legacy `TAHA_SYSTEM_PROMPT` in `lib/claude.ts` is a different, shorter voice description used by the v1 `/api/ai/*` helpers — it's not the real batch voice.

## What still needs doing (ordered, as of 2026-07-08)
1. **Rotate the leaked Apify key** (Apify console) — the one remaining hard blocker on the comment
   bot and on `sync-post-stats.mjs`'s first live run.
2. **Import + activate** `n8n-linkedin-creators.json` in n8n — do this WITH Sophiya present, not
   unsupervised (see the Auto-comment loop section's safety note).
3. **Run `/linkedin-post` for real** — pick a Content Calendar slot, review/edit the drafts,
   approve a lead magnet, publish it herself. This is Stage 13's actual milestone test; everything
   up to Phase 5 is already smoke-tested.
4. Once a real post exists with a `posted_url`: run `sync-post-stats.mjs --run` to close Stage
   12's loop, and feed the winning hook back into the Template Library.
5. Reconcile the two open brand-voice contradictions logged in the Flags tab (Stage 11).
6. Build out `/capture` as the solo post generator + quick capture (superseded in spirit by
   `/linkedin-post`, but the Vercel page itself is still an empty placeholder).
7. GIF screen-recorder for published lead magnet landing pages (older v2 backlog item, still open).

## Important rules
- NEVER hardcode colors — CSS variables only
- NEVER duplicate Taha's voice rules outside SKILL.md (this now applies to `linkedin-post`'s
  sub-skills too — they reference `linkedin-batch/SKILL.md`, never copy it)
- NEVER commit `.env.local` (gitignored, but worth a reminder)
- NEVER rotate a shared credential or activate live external automation (n8n schedules, Apify
  keys) without Sophiya actually present — building the mechanism and activating it are different
  risk categories, see Stage 15
- ALWAYS update this CLAUDE.md whenever meaningful architectural changes ship
