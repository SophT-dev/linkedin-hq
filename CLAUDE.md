# LinkedIn HQ — Claude Context

## What this project is
A mobile-first Next.js web app that acts as Taha Anwar's complete LinkedIn operating system. One bookmarked URL on phone. Everything in one place.

## Live URL
Deployed on Vercel as `linkedin-hq` project under sophiya136-2634's Vercel account.
GitHub: https://github.com/SophT-dev/linkedin-hq

## Stack
- Next.js (App Router) + Tailwind + shadcn/ui
- Google Sheets API (service account) as database
- **Groq API** (`llama-3.3-70b-versatile`) for all AI features — free tier, env var: `GROQ_API_KEY`
- Web Speech API for voice capture
- n8n cloud for automation (Reddit monitor, morning brief, reminders)

## Credentials & Config
- Google Cloud project: `linkedin-489621`
- Service account: `linkedin-hq-sheets@linkedin-489621.iam.gserviceaccount.com`
- Credentials JSON: `c:\Users\sophi\Downloads\linkedin-489621-eee5ff52c88d.json`
- `.env.local` has all vars filled in EXCEPT `GOOGLE_SHEETS_ID` (needs to be added)
- Vercel has all 4 env vars set including the Sheet ID

## Google Sheets Database
One spreadsheet with 11 tabs. Run `setup-sheets.gs` in Google Apps Script on the sheet to initialize.

| Tab | Purpose |
|-----|---------|
| DailyLog | Daily checklist completion + streak |
| QuickCaptures | On-the-go thoughts, voice captures |
| SwipeFile | Saved LinkedIn/Reddit posts |
| ContentCalendar | Scheduled posts with funnel tags |
| Creators | Competitor/creator profiles + notes |
| Sources | YouTube, articles, podcasts |
| Analytics | Post performance stats + patterns |
| IdeasBank | Hooks, post ideas, strategies |
| RedditFlagged | n8n-populated Reddit threads |
| LeadMagnets | Lead magnet click/conversion tracking |
| Config | Key-value config (editable without code) |

## Config tab controls (customizable without code changes)
- `daily_focus` — shown in morning brief
- `strategy_context` — fed to AI strategy chat
- `target_posting_frequency` — reference
- `funnel_target_tofu/mofu/bofu` — balance targets
- `knowledge_doc_url` — link to Google Doc knowledge base
- `n8n_webhook_url` — for n8n integration

## Pages built
| Route | What it does |
|-------|-------------|
| `/` | Dashboard: checklist, streak chart, morning AI brief, creator links, Reddit alert |
| `/ai-studio` | Comment gen (LinkedIn+Reddit), hook scorer, post ideas, strategy chat |
| `/capture` | Quick capture: text + voice → Google Sheets |
| `/swipe-file` | Save posts with tags, creator filters, search |
| `/calendar` | Monthly content calendar, funnel balance tracker |
| `/creators` | Competitor grid, activity status, study notes |
| `/analytics` | Post stats, impressions chart, best format analysis |
| `/sources` | YouTube/article/podcast log |
| `/ideas` | Ideas bank with funnel tags and status |
| `/reddit` | n8n-populated Reddit threads to reply to |
| `/lead-magnets` | Lead magnet click/conversion tracker |

## Key files
- `lib/sheets.ts` — Google Sheets wrapper (readSheet, appendRow, updateRow, deleteRow, getConfig)
- `lib/claude.ts` — **Groq SDK wrapper** (NOT Claude/Anthropic) + Taha's full system prompt (TAHA_SYSTEM_PROMPT). Uses lazy `getGroq()` init to avoid build-time env errors.
- `components/BottomNav.tsx` — Mobile bottom nav (5 main tabs + More dropdown)
- `components/QuickCaptureButton.tsx` — Floating + button with voice capture
- `components/StreakChart.tsx` — 30-day area chart (recharts)
- `setup-sheets.gs` — One-click Google Sheets initialization script

## API routes
- `POST /api/sheets` — read/write/delete any sheet tab
- `GET /api/checklist` — load today's state + 30-day history
- `POST /api/checklist` — save checklist, calc streak
- `POST /api/ai/comment` — generate 3 comments in Taha's voice
- `POST /api/ai/hook` — score hook 1-10 + improved versions
- `POST /api/ai/ideas` — generate 5 post ideas with hooks + lead magnets
- `GET /api/ai/brief` — generate morning intelligence brief (fault-tolerant: works even if Sheets unavailable)
- `POST /api/ai/strategy` — strategy chat with full context
- `POST /api/reddit` — receives Reddit threads from n8n, deduplicates, saves to RedditFlagged sheet
- `POST /api/ai/creator` — given a LinkedIn URL, AI guesses name/niche/format/notes (auto-fills creator form)

## What still needs to be done
- [ ] Add `GOOGLE_SHEETS_ID` to `.env.local` for local dev
- [ ] Set up n8n Reddit Monitor workflow (see below — needs Reddit OAuth credential)
- [ ] Set up remaining n8n workflows (morning brief, Sunday reminder, Friday reminder, midnight reset)
- [ ] Add competitor LinkedIn profile URLs in the Creators tab of Google Sheets
- [ ] Update `knowledge_doc_url` in Config tab to point to actual Google Doc
- [ ] Create PWA icons (icon-192.png, icon-512.png) in /public for home screen install
- [ ] Delete `/api/test` route before going to production (exposes env var status)

## n8n workflows
### Reddit Monitor (file: `n8n-reddit-monitor.json`) — PARTIALLY DONE
- Uses n8n's built-in Reddit node (requires Reddit OAuth2 credential)
- To set up Reddit credential: go to reddit.com/prefs/apps → create "web app" → redirect URI: `https://app.n8n.cloud/rest/oauth2-credential/callback` → paste client ID + secret into n8n Credentials → Reddit OAuth2 API
- Flow: Schedule (2hr) → Reddit "Get many posts" (3 subreddits) → Normalise (Code node) → Keyword Filter → POST to `/api/reddit`
- Still need to replace `YOUR-VERCEL-URL` in the JSON before importing
- Reddit RSS feeds 403 from n8n cloud IPs — must use the native Reddit node with OAuth

### Remaining workflows (not started)
2. **Morning Brief** — 7am daily → GET `/api/ai/brief`
3. **Sunday planning reminder** — email/notification with calendar link
4. **Friday analytics reminder** — prompt to log post stats
5. **Midnight checklist reset** — archive yesterday, prep today

## Taha's voice (for AI prompts)
- Casual but authoritative, direct, no fluff
- Specific over generic — real numbers, frameworks, examples
- Cold email expert + Data.ai specialist
- Audience: B2B founders, sales teams, agencies
- Funnel: TOFU (educate) → MOFU (frameworks) → BOFU (proof/CTA)
- LinkedIn: professional-casual. Reddit: peer-to-peer, zero selling.
