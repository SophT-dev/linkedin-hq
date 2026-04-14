# LinkedIn HQ — Claude Context

## What this project is
Taha Anwar's (Bleed AI) personal LinkedIn operating system. Mobile-first Next.js web app on Vercel + a Claude Code skill that owns batch generation. One bookmarked URL on phone for intel scanning; one `/linkedin-batch` skill in Claude Code for producing posts and lead magnets. Everything else lives in one Google Sheet.

## Live URLs
- App: https://linkedin-hq.vercel.app
- GitHub: https://github.com/SophT-dev/linkedin-hq
- Vercel project owner: sophiya136-2634

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

## Google Sheet — 5 tabs
One spreadsheet. Run `setup-v2.gs` in Google Apps Script once to initialize. If migrating from pre-2026-04-13 Posts schema (no id column), run `migrate-posts-add-id.gs` first.

| Tab | Purpose |
|---|---|
| **Intel** | Unified news feed. Reddit + Google News + LinkedIn creators. Columns: `pulled_at \| posted_at \| type \| source \| title \| url \| summary \| score \| starred \| comment_text \| comment_status \| comment_posted_at \| comment_style`. The four comment_* columns are added by `setup-v2.gs`'s `ensureColumns` helper and carry the auto-comment state for each LinkedIn post (one row per post, no separate Comments tab). |
| **Config** | Key-value config. Keys used by the app: `linkedin_creators` (newline-separated profile URLs), `linkedin_posts_per_creator` (int). Legacy keys still supported: `daily_focus`, `strategy_context`. |
| **WinsLog** | Taha's real client wins — the authenticity moat. Seeded from `upwork proposal/CLAUDE.md`. Columns: `date \| client \| campaign \| what_we_did \| result \| lesson \| tags` |
| **Posts** | Generated posts saved by the skill. Columns: `id \| batch_date \| hook \| body \| format \| funnel_stage \| visual_brief \| lead_magnet \| sources_used \| authenticity_tag \| status`. `id` is a 10-char nanoid. `lead_magnet` starts as `name | prop | cta` and is rewritten to the live landing URL after a lead magnet is built. |
| **LeadMagnets** | Lead magnet build pipeline. Columns: `id \| post_id \| slug \| status \| title \| hero_text \| value_props \| cta_text \| outline_md \| body_md \| notion_url \| landing_url \| gif_url \| created_at \| clicks \| conversions`. Status values: `researching \| outline_ready \| body_ready \| published \| error`. |

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

## Pages (v2)
| Route | Purpose |
|---|---|
| `/news` | Mobile news feed. Reddit + Google News + LinkedIn creators. Time-window chips (1h/24h/week/all), source chips, sort chips, star-to-keep, "new since last visit" highlight. |
| `/capture` | Placeholder. Slot reserved for the solo post generator + quick capture rebuild. |
| `/lead-magnet/[slug]` | Public landing page. Route group `(public)` so BottomNav/QuickCapture/ThemeToggle don't render for strangers. Reads the LeadMagnets row by slug server-side. Revalidated when the skill publishes. |

Legacy v1 pages (`/ai-studio`, `/analytics`, `/calendar`, `/creators`, `/ideas`, `/lead-magnets`, `/reddit`, `/sources`, `/swipe-file`) still exist on disk but are unreachable from the v2 nav. They can be deleted later.

`/batch` was removed entirely on 2026-04-13 when batch generation moved to the skill.

## Key files
- [lib/sheets.ts](lib/sheets.ts) — sheets wrapper. Intel + Posts + LeadMagnets loaders, `appendPosts` returns ids + rowIndices, `updatePostLeadMagnet`, `createLeadMagnetRow`, `updateLeadMagnetRow`, etc.
- [lib/claude.ts](lib/claude.ts) — Anthropic SDK wrapper for the *legacy* AI helpers (comment, hook, ideas, brief, strategy) + news scout (`fetchIntelFromWeb`). `BATCH_SYSTEM_PROMPT` and `generateBatch` were **deleted** on 2026-04-13.
- [lib/intel-filter.ts](lib/intel-filter.ts) — shared keyword relevance gate used by news scouts, reddit fetcher, and the LinkedIn creator ingest route.
- [lib/notion.ts](lib/notion.ts) — `publishLeadMagnetToNotion()` + a minimal markdown → Notion blocks converter.
- [lib/reddit.ts](lib/reddit.ts) — direct Reddit JSON fetcher for r/coldemail (OAuth pending).
- [components/BottomNav.tsx](components/BottomNav.tsx) — 2-tab mobile nav (News + Capture). Hides itself on `/lead-magnet/*`.
- [components/QuickCaptureButton.tsx](components/QuickCaptureButton.tsx) — floating + button with voice capture. Also hides itself on `/lead-magnet/*`.
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

## Auto-comment loop on LinkedIn creator posts (v2, shipped 2026-04-14)

Closes the loop on the LinkedIn creator feed: every 4 hours when n8n scrapes the latest posts from the creators in the `linkedin_creators` Config row, it now also generates a comment in Taha's voice for the top-engagement ones and posts them to LinkedIn under his account, with Slack notifications for visibility.

**Flow:** Apify scrape → POST `/api/intel/ingest` (writes posts to Intel tab) → POST `/api/comments/plan` (reads Intel for LinkedIn posts that have no comment yet, picks the top by score up to `comments_daily_cap`, generates a comment via Claude using one of 5 style presets selected heuristically, runs the voice quality gate from `lib/voice-rules.ts`, writes draft to the matching Intel row, returns approved list) → split → random 30-90s wait → POST to LinkedIn `/v2/socialActions/{urn}/comments` via existing parasite OAuth credential → branch on success/fail → POST `/api/comments/log` with the post URL → Slack notify `#linkedin-comments`.

**Daily cap:** `comments_daily_cap` row in the Config tab, default 5. The plan route counts Intel rows where `comment_status=posted` and `comment_posted_at` starts with today, and stops generating once the cap is hit.

**Safety:**
- Voice quality gate enforces lowercase, no em dashes, no banned words/phrases, no rhetorical questions, no @mentions, length 30-280 chars
- 30-90s randomized wait between comments humanizes the cadence so it doesn't burst-post
- Slack notification is the kill switch — if a comment looks bad, you click the link in Slack and delete it manually from LinkedIn

**Style presets** (`lib/comments.ts` `STYLE_PRESETS`): `agree_add` (default, agrees and adds a stat), `contrarian` (pushes back on a strong claim), `sharp_question` (asks a real follow-up), `bts_story` (shares a 2-3 sentence behind-the-scenes), `tactical_tip` (drops one specific tactic). The picker is a heuristic over the post text.

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

## What still needs doing (ordered)
1. **User prereqs:** rotate Apify key, create Notion integration, set `NOTION_TOKEN`/`NOTION_PARENT_ID`/`INTEL_INGEST_TOKEN` in local + Vercel env
2. Run `migrate-posts-add-id.gs` on the sheet, then re-run `setup-v2.gs` to add LeadMagnets tab
3. Populate `linkedin_creators` in Config tab
4. Import and activate the n8n LinkedIn creator workflow
5. First end-to-end test run of the skill (`/linkedin-batch 3` → save → build a lead magnet on post 1)
6. Build out `/capture` as the solo post generator + quick capture (out of scope for the 2026-04-13 session)
7. GIF screen-recorder for published lead magnet landing pages (task #3 in the v2 priority queue)

## Important rules
- NEVER hardcode colors — CSS variables only
- NEVER duplicate Taha's voice rules outside SKILL.md
- NEVER commit `.env.local` (gitignored, but worth a reminder)
- ALWAYS update this CLAUDE.md whenever meaningful architectural changes ship
