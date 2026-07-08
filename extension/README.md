# Bleed AI — LinkedIn Comment Assistant (MVP A)

Inline comment suggestions in Taha's voice, **right inside LinkedIn on desktop** —
same mechanism as Draftly's comment helper. Suggest-only: it never posts. You see
a small **✨ Suggest comment** button above each comment box, tap it, pick one of
3 suggestions, and it drops into the box for you to edit + send.

This is the daily **comment-sprint** tool: open LinkedIn on the laptop, scroll,
fire off sharp on-brand comments fast.

## How it works
- `content.js` — runs on linkedin.com, watches for comment boxes, injects the button + suggestion chips.
- `background.js` — calls the `/api/comments/suggest` endpoint in linkedin-hq (reuses Taha's voice engine). **The only file with config.**
- It's **desktop-only.** Chrome extensions can't run in LinkedIn's phone app (nobody's can — it's a sealed app).

## One-time install (~30 seconds)
1. Open **Chrome** (or Edge) → go to `chrome://extensions`
2. Turn on **Developer mode** (top-right toggle)
3. Click **Load unpacked** → select this `extension/` folder
4. Done. Open `linkedin.com`, click **Comment** on any post → the ✨ button is there.

To update after code changes: hit the ↻ refresh icon on the extension card.

## Config (in `background.js`)
| Field | What |
|---|---|
| `API_BASE` | Where linkedin-hq is deployed. `https://linkedin-hq.vercel.app` for live, `http://localhost:3009` for local testing. |
| `SUGGEST_TOKEN` | Shared secret. **Must match `SUGGEST_TOKEN` in the linkedin-hq Vercel env**, otherwise the endpoint returns 401. |

> Before it works live, the linkedin-hq app must be deployed with the new
> `/api/comments/suggest` route **and** `SUGGEST_TOKEN` set in Vercel env to the
> same value baked into `background.js`.

## Notes / known limits
- LinkedIn's DOM class names change over time. If the button stops appearing, the selectors in `content.js` (`findPostContainer`, the `.comments-comment-box` checks) may need a refresh.
- **2026-07-09:** LinkedIn switched the comment editor from Quill (`.ql-editor`) to Tiptap/ProseMirror. `content.js`'s `EDITOR_SELECTOR` now matches both, keyed off the editor's `aria-label` (`"Text editor for creating comment"`) and its `.tiptap.ProseMirror` classes as a fallback. If the button stops appearing again, right-click the comment box → Inspect → Copy element on the actual `contenteditable="true"` container (not just the empty `<p>` inside it) and check whether the aria-label or classes changed again.
- Suggestions run through the same voice quality gate as the auto-comment bot, so anything off-voice is filtered before you see it.
- Cost: ~3 Sonnet calls per click (the voice engine uses `claude-sonnet-4-6`). Could be dropped to Haiku later if cost matters.
