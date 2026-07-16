# archive-resource.md — the per-form archive drill

**HARD RULE (Sophiya's call, 2026-07-16): a link is NOT a capture.** Expert-hosted resources —
Notion pages, git repos, PDFs, Gamma decks, YouTube videos — get deleted, moved, or gated within
weeks. We **ALWAYS** archive our own copy into the item's `resource/` folder (source-post visuals
into `assets/`). The link alone is a debt.

**The `resource_archived` flag** (in each notes.md frontmatter):
- `full` — we have a complete usable copy of the resource.
- `partial` — we have the text/transcript but a big binary (video, >25MB item) lives in Drive, not git.
- `link-only` — TEMPORARY, a failure state. Every archive path was exhausted this run. This flag
  gets re-surfaced at the top of **every** `/lm-intake` run until it's resolved. Never leave an
  item here if any ladder step below could still work — escalate first.

Set the flag honestly per item. When in doubt between `partial` and `full`, use `partial`.

---

## Per form

### pdf
```
curl -sL -o resource/<name>.pdf "<url>"
```
Verify it's real before trusting it: file is **non-empty** AND the first bytes are `%PDF`
(`head -c 4 resource/<name>.pdf` → `%PDF`). An HTML error page saved as `.pdf` is a silent failure
— if it doesn't start with `%PDF`, treat it as a fetch fail and escalate (WebFetch the page, or ask
Sophiya for a working link). → `full` on success.

### git-repo
```
git clone --depth 1 "<repo url>" "<SESSION-SCRATCHPAD>/<repo-name>"
```
Clone into the **session scratchpad**, not the vault. **Size-check BEFORE copying into the tree**
(`du -sh`). Then copy into `resource/<repo-name>/` **excluding** `.git/` and `node_modules/`. If
the cleaned repo is still large, apply the size rules below (Drive, not git). → `full`.

### notion / gamma — escalation ladder (stop at the first that works)
1. **WebFetch the full text** → write to `resource/notion-export.md`. Curl every embedded image
   into `assets/` with descriptive kebab-case names. Good enough for most public pages. → `full`.
2. **Thin / JS-rendered / gated?** If step 1 returns almost nothing (Notion and Gamma render
   client-side, so a bare fetch often gets an empty shell), drive her logged-in Chrome via
   **Browser MCP**: `mcp__browsermcp__browser_navigate` to the URL, then
   `mcp__browsermcp__browser_snapshot` to extract the rendered page. Save the extracted text +
   images the same way. → `full`.
3. **Last resort, SAME RUN** (don't defer to next run — that's how links die): ask Sophiya to open
   the page and either `⋯ → Export → Markdown` (Notion) or `Ctrl+A` → copy → paste the full text
   into chat. Save what she gives you. → `full`. Only if she can't do it this run → `link-only`.

### youtube
1. **Transcript** → full transcript to `resource/transcript.md` (WebFetch the watch page /
   transcript endpoint; capture the whole thing, not a summary). This alone is usually enough to
   mine takeaways. → `partial` (text captured, video not in git).
2. **The video itself** → `yt-dlp` (free, no paid tool) when feasible, uploaded to Drive
   `LinkedIn/Lead Magnet Vault/` — **never committed to git**. Record the `drive_link` in
   frontmatter. If only the transcript lands, `partial` is correct and fine.

### pasted skills / prompts / commands / n8n JSON
Write them as **real files** under `resource/`, **preserving folder structure** — a Claude skill
folder stays a folder (`resource/<skill-name>/SKILL.md` + subfiles), an n8n workflow stays
`resource/<name>.json`, prompts/commands as `.md`/`.txt` with their original names. Don't flatten a
multi-file resource into one blob. → `full`.

### visuals (source-post media — licdn URLs EXPIRE)
`media.licdn.com` CDN links are signed and die fast. Curl every source-post image/GIF into
`assets/` immediately, with descriptive kebab-case names (`assets/hook-infographic.png`, not
`assets/image1.png`). Do this in the same run you fetch the post — don't leave the URL to rot.

---

## Size rules (git vs. Drive)
- **> 10MB per file**, or **> ~25MB total per item** → upload to Drive `LinkedIn/Lead Magnet Vault/`
  instead of committing, using the existing helpers in `scripts/lib/linkedin-drive.mjs`
  (`resolveLinkedInSubfolder`, `uploadFileToFolder`, `uploadWithOptionalProofDualSave` —
  `supportsAllDrives: true`, company Shared Drive, never a personal Drive). Record the returned
  `drive_link` in the notes.md frontmatter and set `resource_archived: partial`.
- **Videos NEVER go in git** — always Drive, regardless of size.
- Everything small and text-like (markdown exports, transcripts, prompts, JSON, cleaned repos,
  images under the cap) commits normally into `resource/` / `assets/`.
