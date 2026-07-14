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
`/api/comments/suggest` → Choose-from-List picker → copy pick to clipboard.** ~2 taps per comment.
Zero App Store review, near-zero maintenance.

**Cost:** OCR is Apple on-device (free, no API). Generation is the same free Gemini→Groq path as the
desktop extension (`lib/ai.ts`) — kept Gemini-primary per her 2026-07-11 choice. iPhone path adds **$0**
over desktop. Only limit is the free daily quota, which normal use never hits.

## The Shortcut — "LI Comment" (build once in the Shortcuts app)
1. **Take Screenshot**
2. **Extract Text from Image** ← input = the Screenshot from step 1 (on-device OCR, iOS 15+)
3. **Quick Look** ← Extracted Text — *TEMPORARY, for the OCR test only; delete after*
4. **Get Contents of URL**
   - URL: `https://linkedin-hq.vercel.app/api/comments/suggest`
   - Method: `POST`
   - Header: `x-suggest-token` = `3088768ac5a002b7e72a6955a52fa07c1d5704addc143516`
   - Request Body: `JSON` → field `postText` (Text) = the Extracted Text variable
5. **Get Dictionary Value** → `suggestions` (from Contents of URL)
6. **Repeat with Each** (the suggestions list): inside → **Get Dictionary Value** `text` (from Repeat
   Item) → **Add to Variable** `choices`
7. **Choose from List** ← `choices`
8. **Copy to Clipboard** ← Chosen Item
9. **Show Notification** → "Copied — long-press the comment box and Paste"

## Bind the triggers
- **AssistiveTouch (floating button):** Settings → Accessibility → Touch → AssistiveTouch → On →
  Custom Actions → Single-Tap → Shortcuts → **LI Comment**.
- **Back Tap (backup):** Settings → Accessibility → Touch → Back Tap → Double Tap → **LI Comment**.
- **Action Button** (iPhone 15 Pro+): Settings → Action Button → Shortcut → **LI Comment**.

## Daily tap-flow
Expand the post ("…more") → tap the button (or double-tap back) → wait ~2-4s → tap one of the 3
suggestions (copies it) → long-press the comment box → Paste → edit → send.

## Biggest risk + the fix
OCR quality, not the trigger:
1. **Truncation** — if the post is collapsed behind "…more", OCR only reads the preview. Mitigation:
   expand the post first (one tap). 
2. **Noise** — the screenshot also OCRs LinkedIn UI (author, "Like · Comment · Repost", other
   commenters), polluting `postText`. Mitigation if the 5-min test shows this: build a small server
   route `/api/comments/suggest-from-ocr` that strips known LinkedIn UI lines before generating.

**5-minute de-risk before trusting it:** the temporary Quick Look (step 3) shows exactly what OCR read
on a real post. Clean → delete Quick Look, ship. Noisy/cut-off → build the noise-strip route.

## Rock-solid fallback (verified feasible)
A logged-out fetch of a LinkedIn post URL returns the **full clean post body** from the page's JSON-LD
`articleBody` (tested live: 2,258 chars, untruncated — same public-fetch trick as
`scripts/capture-connects.mjs`). If OCR proves too noisy, build `/api/comments/suggest-from-url` and use
the Share-Sheet trigger instead (~2 extra taps, but perfect text). Keep in back pocket.

## Status
NOT built. Next action: Sophiya builds the Shortcut + runs the 5-min OCR test; if OCR is noisy she
sends the Quick Look screenshot and we add the noise-strip (or URL-fallback) route server-side.
