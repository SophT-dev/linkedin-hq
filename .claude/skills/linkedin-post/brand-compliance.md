# Sub-skill: brand compliance

Read by `linkedin-post/SKILL.md` as the final gate before showing ANY draft to Sophiya. Job:
catch drift before she has to.

## The single source of truth for voice

**`../linkedin-batch/SKILL.md`'s "Voice Rules" section, in full — do not duplicate it here or
anywhere else.** That file is the single source of truth for Taha's voice (grammar, banned
words/phrases, authenticity tags, funnel/format/topic mix, the final checklist). Read it fresh
every time you use this sub-skill; don't rely on a cached memory of it, since it gets updated
(most recently: Stage 11's brand-compliance pass added `genuinely`, `silently`, `broken`, and
"before a single email goes out" to the banned lists).

## What this sub-skill adds on top (brand, not voice)

Voice Rules governs *how it sounds*. This sub-skill governs *does it look and read as Bleed AI*,
per `Bleed AI Branding/BRAND.md`:

- [ ] Visual brief describes a dark `#07070d` background (or the day-mode variant, if that's what
      was requested — see `Bleed AI Branding/CLAUDE-DESIGN-SYSTEM.md`), ONE red `#b1130f`/`#ff3d38`
      emphasis (not a rainbow), Inter heavy headline, droplet mark present — per BRAND.md §3-4. If
      the post format is text-only with no visual, note that explicitly rather than skip the check
      — though per BRAND.md §4 this should not happen; every post gets a visual.
- [ ] **Once `visual-generation.md` (Phase 7) has actually produced a rendered file**, check the
      artifact itself, not just the brief that described it — the same four checks above (dark/day
      background, one red emphasis, Inter headline, droplet mark) plus the 1080×1350 canvas. This
      is a second, independent check because a brief can pass while the actual render drifts (see
      the `tam-pie-visual.html` vs. `tam-pie-visual-branded-day.html` drift this whole visual
      pipeline was built to catch). Point back to `visual-generation.md`'s taste checklist for
      anything beyond brand tokens (does it read in 2 seconds, does it explain the idea) — don't
      define a second competing version of that checklist here.
- [ ] A specific number or concrete detail in the first line, not a vague claim.
- [ ] No mega-cap company as the emotional anchor (Voice Rules already checks this; re-confirm).
- [ ] Say the uncomfortable/true thing rather than a safe generality — BRAND.md's "truth over
      comfort" pillar. If a draft reads like it's hedging or could apply to any agency, flag it.
- [ ] Lead magnet (if any) is described as dark/Inter/JetBrains-Mono/droplet-marked — "looks like
      a premium product, not a Google Doc" per BRAND.md §4.

## Known open contradictions — do NOT silently pick a side

Two real, unresolved conflicts between `BRAND.md`'s general copy-voice notes and
`linkedin-batch/SKILL.md`'s Voice Rules (logged in the Flags tab, 2026-07-08):
1. BRAND.md lists "here's the thing" / "to be honest" as on-brand; Voice Rules bans them as
   AI-tells.
2. BRAND.md says short/punchy sentences; Voice Rules deliberately wants long, flowing ones.

**Voice Rules wins for anything published on LinkedIn** — it's the more recent, LinkedIn-tested
document and BRAND.md itself now footnotes this. Don't re-litigate it per draft; just follow
Voice Rules and move on. If Sophiya ever resolves the Flags row, this note should be deleted.

## Output

A pass/fail per draft, with the specific rule cited for any fail — never a vague "this doesn't
feel on-brand." If a draft fails, fix it before showing it, don't show a known-bad draft with a
disclaimer.
