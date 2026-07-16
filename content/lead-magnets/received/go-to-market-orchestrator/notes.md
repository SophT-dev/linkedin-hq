---
title: "Claude Code Hooks for GTM (go-to-market-orchestrator)"
slug: "go-to-market-orchestrator"
source_person: "Jan Rasmussen"
source_person_url: "https://github.com/janskuba"
source_post_url: ""
post_likes: 0
post_comments: 0
captured_at: "2026-07-16"
domain: "ai-automation-tooling"
starred: false
# --- CONTENT ---
content_style: ""
format_tag: ""
structure_tag: ""
cta_keyword: ""
tools_mentioned: ["Slack", "Notion", "Apollo", "HubSpot", "Attio", "Airtable", "Instantly", "Smartlead", "Clay", "Zapier", "n8n", "Make", "Linear", "Figma"]
people_tagged: []
# --- VISUAL ---
visual_type: "none"
visual_files: []
# --- LEAD MAGNET ---
lm_form: "git-repo"
lm_type: "claude-system-folders"
resource_archived: "full"
resource_link: "https://github.com/janskuba/go-to-market-orchestrator"
drive_link: ""
---

# Claude Code Hooks for GTM (go-to-market-orchestrator)

## Source post
Source post unknown — resource link dumped directly (DM'd lead magnet). No CTA found on the repo.

## CONTENT breakdown
Source post not captured (bare DM link, no post context). Resource is a full git repo (780KB), cloned into `resource/go-to-market-orchestrator/`.

## VISUAL breakdown
None.

## LEAD MAGNET breakdown
- skills/ — 6 SKILL.md files (campaign-builder, lead-enrichment, personalization-writer, pipeline-reviewer, reply-classifier, signal-monitor) + modules/templates
- agents/ — 7 subagents + outbound-pipeline.md slash command chaining 5 into a CSV pipeline with checkpoints
- hooks/ — 30 hook definitions across 8 categories firing on Claude Code lifecycle events
- orchestrator/ — dispatch.py + 17 python REST handlers (slack, notion, apollo, hubspot, instantly, smartlead, clay, n8n, make, sheets...), all DRY_RUN=1 capable
- gtm-content-prompts/ — 17 prompts for decks, one-pagers, LinkedIn carousels, case studies
- examples/ — 5 role-based settings.json starter packs; scripts/ install/validate; tests/

Quality note: Reference architecture, not drop-in; hooks+orchestrator layer (dispatch contract, DRY_RUN) is something campaign-master/lm-sales-agent don't have; pipeline agents are pattern-check vs campaign-master's more mature skills.

## Key takeaways
- Three-layer model to steal: Skills = what, Agents = who, Hooks = when, Orchestrator = how it reaches external tools
- dispatch.py pattern: every hook shells into ONE dispatcher reading stdin, merging payload['action'], exec'ing the matching service handler — one contract, 17 integrations
- DRY_RUN=1 makes every handler print-and-exit — cheap safety net before touching Slack/CRM/outbound for real
- 5-stage outbound pipeline has an explicit human-review pause after auto-enrichment, before scoring
- Instantly + Smartlead + Clay handlers already exist — direct overlap with Bleed AI's live stack

## Repurpose notes
