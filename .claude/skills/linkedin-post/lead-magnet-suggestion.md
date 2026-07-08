# Sub-skill: lead-magnet suggestion

Read by `linkedin-post/SKILL.md` Phase 4. Job: for each draft, suggest 2-3 real, specific lead
magnet ideas — one starred as the recommended pick. Never a generic "free guide."

## Where to pull from, in order

1. **The draft's own source material.** If the post is built from a Domain Synthesis doc, the
   most obvious lead magnet is a slice of that doc turned into a standalone checklist/template
   (see `DOMAIN-SYNTHESIS-deliverability-infra.md` §5 "How to use this doc" for a worked example —
   its own §3 QA checklist is close to lead-magnet-ready as-is).
2. **The Post Ideas tab's `lead_magnet_ideas` column** — if this draft came from a Post Ideas row,
   the lead magnet ideas are usually already there. Use them, adapt if the draft angle shifted.
2b. **LeadMagnets tab, `kind=received` rows** — lead magnets Sophiya's actually seen work on other
   people's posts (logged via `capture-item.mjs --type lead_magnet`). If one's format/angle fits
   this draft's topic, it's real proof that shape converts — cite it as inspiration, don't copy it.
3. **WinsLog** — a real client result can often BE the lead magnet's spine (a template, a
   checklist, or a teardown of exactly how that result happened).

## Format of the output

For each draft, 2-3 options in this shape, one starred:
```
lead magnet options:
  ⭐ [name, 4-8 words] — [value_prop, ≤120 chars] — source: [Domain Synthesis doc §N /
     Post Ideas row / WinsLog: client]
  [option 2, same shape]
  [option 3, same shape]
```

## Handoff — reuse the existing build pipeline, don't rebuild it

Once Sophiya picks a lead magnet, this sub-skill's job is done. Building it is
`/linkedin-batch`'s existing, working pipeline (deep research → outline → approve → body →
approve → publish to Notion → `/api/lead-magnet/save` → live landing page → tracked in
LeadMagnets). The orchestrator hands off there — see `linkedin-post/SKILL.md` Phase 6.
