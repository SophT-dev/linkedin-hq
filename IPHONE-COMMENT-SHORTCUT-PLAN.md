# iPhone comment suggestions — V2 plan (saved 2026-07-11)

**Goal:** while scrolling the native LinkedIn iOS app, fire one trigger that reads the post ON SCREEN
and generates a comment in our voice, with the fewest taps and no manual copy/paste. Reuses the
already-deployed `POST /api/comments/suggest` engine (the same new Michel×Sophiya "insight voice").

## Verdict (research-backed, sources in the session transcript 2026-07-11)
- A third-party app **cannot** draw a floating widget over LinkedIn on iOS — there is no Android-style
  overlay permission. This is an OS-architecture rule, confirmed via Apple Developer Forums. So the
  "hovering Bleed AI widget over LinkedIn" she pictured is impossible for a custom app.
- The closest **stock-iOS** thing is **AssistiveTouch** — iOS's own system floating button that sits on
  top of every app, whose tap can run a Shortcut. Plus **Back Tap** (double-tap the back of the phone)
  as an even more reliable, cleaner-screenshot trigger. Bind both to the same Shortcut.
- **Custom keyboard extension = dead end:** a keyboard cannot read the host app's text (only what's
  typed into it) and cannot screenshot/OCR. Rejected.

## Recommended approach (chosen by Sophiya)
AssistiveTouch (and/or Back Tap) → a Shortcut that: **screenshot → on-device OCR → POST to
`/api/comments/suggest-from-ocr` → Choose-from-List picker → copy pick to clipboard.** ~2 taps per
comment. Zero App Store review, near-zero maintenance. (The OCR posts to the noise-stripping
`/suggest-from-ocr` route, not raw `/suggest` — see "Biggest risk + the fix" below, now BUILT.)

**Cost:** OCR is Apple on-device (free, no API). Generation is the same free Gemini→Groq path as the
desktop extension (`lib/ai.ts`) — kept Gemini-primary per her 2026-07-11 choice. iPhone path adds **$0**
over desktop. Only limit is the free daily quota, which normal use never hits.

## The Shortcut — "LI Comment" (build once in the Shortcuts app)
1. **Take Screenshot**
2. **Extract Text from Image** ← input = the Screenshot from step 1 (on-device OCR, iOS 15+)
3. **Get Contents of URL**
   - URL: `https://linkedin-hq.vercel.app/api/comments/suggest-from-ocr`
   - Method: `POST`
   - Header: `x-suggest-token` = `3088768ac5a002b7e72a6955a52fa07c1d5704addc143516`
   - Request Body: `JSON` → field `ocrText` (Text) = the Extracted Text variable
   *(The server strips the LinkedIn UI chrome — author header, timestamp, reaction/comment counts, the
   Like·Comment·Repost·Send bar, "…more", other people's comments — before generating, so you no
   longer need a clean OCR. Send the whole screenshot's text; the route cleans it.)*
4. **Get Dictionary Value** → `suggestions` (from Contents of URL)
5. **Repeat with Each** (the suggestions list): inside → **Get Dictionary Value** `text` (from Repeat
   Item) → **Add to Variable** `choices`
6. **Choose from List** ← `choices`
7. **Copy to Clipboard** ← Chosen Item
8. **Show Notification** → "Copied — long-press the comment box and Paste"

*(One-time OCR sanity check, optional: temporarily add a **Quick Look** ← Extracted Text step before
step 3 to eyeball what OCR read on a real post, then delete it. The noise-strip route makes this
non-essential now.)*

## Fallback Shortcut — "LI Comment (URL)" (perfect text via Share Sheet)
When OCR is too messy, or the post is long/collapsed, share the post URL instead — the server fetches
the full clean post body from LinkedIn's public JSON-LD (no login). Build a second Shortcut:
1. Set **"Show in Share Sheet"** ON in the Shortcut's settings; **Accepts** = URLs.
2. **Get Contents of URL**
   - URL: `https://linkedin-hq.vercel.app/api/comments/suggest-from-url`
   - Method: `POST`
   - Header: `x-suggest-token` = `3088768ac5a002b7e72a6955a52fa07c1d5704addc143516`
   - Request Body: `JSON` → field `postUrl` (Text) = the Shortcut Input (the shared URL)
3. **Get Dictionary Value** → `suggestions` → **Repeat with Each** → `text` → **Add to Variable**
   `choices` → **Choose from List** → **Copy to Clipboard** → **Show Notification** (same tail as above).

Daily use: on a post → tap the LinkedIn **… → Copy link to post** (or Share → your Shortcut) → pick a
suggestion → paste. ~2 extra taps than OCR, but the text is exact and never truncated.

## Bind the triggers
- **AssistiveTouch (floating button):** Settings → Accessibility → Touch → AssistiveTouch → On →
  Custom Actions → Single-Tap → Shortcuts → **LI Comment**.
- **Back Tap (backup):** Settings → Accessibility → Touch → Back Tap → Double Tap → **LI Comment**.
- **Action Button** (iPhone 15 Pro+): Settings → Action Button → Shortcut → **LI Comment**.

## Daily tap-flow
Expand the post ("…more") → tap the button (or double-tap back) → wait ~2-4s → tap one of the 3
suggestions (copies it) → long-press the comment box → Paste → edit → send.

## Biggest risk + the fix — BUILT (2026-07-14)
OCR quality, not the trigger:
1. **Truncation** — if the post is collapsed behind "…more", OCR only reads the preview. Mitigation:
   expand the post first (one tap), OR use the URL-fallback Shortcut below (never truncates).
2. **Noise** — the screenshot also OCRs LinkedIn UI (author, "Like · Comment · Repost", other
   commenters), polluting the text. **FIXED:** `POST /api/comments/suggest-from-ocr`
   (`app/api/comments/suggest-from-ocr/route.ts`) now runs a `stripLinkedInChrome()` helper that
   removes the author header + headline, the "• 1st/2nd/3rd" badge, the relative timestamp/"Edited",
   the "…more"/"see more" links, the reaction/comment/repost counts, the Like·Comment·Repost·Send
   action bar, "Activate to view larger image", "Add a comment…", nav labels, and everything below the
   action bar (other people's comments) — conservatively, line by line, erring toward keeping real
   sentences. It then runs the identical 3-mode insight-voice pipeline as `/suggest` and returns
   `{ suggestions }`. The Shortcut posts the raw OCR to this route in field `ocrText`. (Unit-tested
   offline on a realistic noisy sample: all chrome stripped, both body sentences survived.)

**De-risk:** the strip route means a messy OCR no longer matters. If you ever want to eyeball the raw
OCR, temporarily add a Quick Look before the POST step (see Shortcut note above).

## Rock-solid fallback — BUILT (2026-07-14)
A logged-out fetch of a LinkedIn post URL returns the **full clean post body** from the page's JSON-LD
`articleBody` (same public-fetch trick as `scripts/capture-connects.mjs`). **BUILT:**
`POST /api/comments/suggest-from-url` (`app/api/comments/suggest-from-url/route.ts`) validates the URL
is `linkedin.com`, fetches the public page with a browser User-Agent, parses `articleBody` (and the
author's name) out of the JSON-LD, and runs the same 3-mode pipeline. If the fetch is blocked or no
`articleBody` is present it returns a clear `502 { error: "could not fetch post text ..." }` — never
fabricated text. Wired to the Share-Sheet "LI Comment (URL)" Shortcut above, field `postUrl`.
(Verified live from a dev box: real josh-braun public posts returned clean `articleBody` of 1,026 and
1,315 chars with the author name, logged-out, un-truncated.)

## Status — BUILT (2026-07-14), pending Sophiya wiring the Shortcuts
Both server routes are built, type-checked, and added to `next.config.ts`'s `outputFileTracingIncludes`
(the voice.md runtime-read tracing fix — without it the routes ENOENT and silently return `[]` on
Vercel). Next action: Sophiya builds the two Shortcuts above (OCR primary, URL fallback) and binds the
OCR one to AssistiveTouch / Back Tap. The `x-suggest-token` is unchanged from the original plan, so
the same token works.
