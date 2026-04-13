import Anthropic from "@anthropic-ai/sdk";
import { isIntelRelevant } from "./intel-filter";

const MODEL = "claude-sonnet-4-6";
function getClient() { return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }); }

// ============================================================
// Intel fetcher — uses Claude's web search to pull fresh items
// from general news. Reddit comes from the direct JSON fetcher in
// lib/reddit.ts. LinkedIn comes from the n8n → /api/intel/ingest
// pipeline.
// ============================================================

export interface FetchedIntelItem {
  type: "reddit" | "news" | "linkedin";
  source: string;  // subreddit name or publisher/domain or linkedin creator
  title: string;
  url: string;
  summary: string; // 1 line, no quotes from user content
  posted_at: string; // ISO date of the original publication (may be empty if unknown)
}

export interface ScoutDebug {
  scout: string;
  ok: boolean;
  count: number;
  error?: string;
  note?: string;
}

interface ClaudeContentBlock {
  type: string;
  text?: string;
}

// Each scout is a small focused web-search call. Splitting the work into
// many small calls keeps each request under the org's per-minute input
// token cap (every web_search result is stuffed back into the model's input).
interface IntelScout {
  type: FetchedIntelItem["type"];
  source: string;
  query: string;
  cap: number;
}

// Relevance whitelist lives in lib/intel-filter.ts so the news scouts,
// reddit fetcher, and LinkedIn creator ingest all share one copy.
const INTEL_SCOUTS: IntelScout[] = [
  {
    type: "news",
    source: "Google News (cold email)",
    query:
      "Recent news articles from the last 7 days SPECIFICALLY about cold email outreach, email deliverability, sender reputation, DMARC/SPF/DKIM enforcement, mailbox warmup, inbox placement, or B2B cold email tooling (Smartlead, Instantly, Lemlist, Lavender, Apollo). REJECT articles about generic email marketing, newsletters, transactional email, CRM platforms, or unrelated SaaS news.",
    cap: 6,
  },
];

function buildScoutPrompt(scout: IntelScout): string {
  return `You are an intel scout for a B2B cold email expert. Use the web_search tool ONCE to find recent items matching this query:

QUERY: ${scout.query}

Return at most ${scout.cap} items. Each item must be from the LAST 14 DAYS — skip anything older.

CRITICAL RULES:
- summary must be exactly 1 line, max 200 characters, plain English. Describe the THEME — never quote user-generated content verbatim.
- url must start with https:// and must be a real URL from the search results.
- title must be the actual headline of the page or thread.
- posted_at must be the original publication date in ISO 8601 format (e.g. "2026-04-09T14:30:00Z"). If you can't determine the exact time, use just the date with a midnight UTC time. If you truly can't tell the date from the search result, return an empty string for posted_at.
- Return ONLY valid JSON, no preamble, no markdown fences, no commentary.

Schema:
{
  "items": [
    { "title": "...", "url": "https://...", "summary": "...", "posted_at": "2026-04-09T00:00:00Z" }
  ]
}`;
}

// Walks a string and returns the first balanced {...} substring, or null.
// Handles strings (so braces inside JSON string values are ignored).
export function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (c === "\\") {
        escape = true;
      } else if (c === '"') {
        inString = false;
      }
      continue;
    }
    if (c === '"') {
      inString = true;
    } else if (c === "{") {
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

async function runScout(
  scout: IntelScout
): Promise<{ items: FetchedIntelItem[]; debug: ScoutDebug }> {
  const debug: ScoutDebug = { scout: scout.source, ok: false, count: 0 };
  const client = getClient();
  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      tools: [
        { type: "web_search_20250305", name: "web_search", max_uses: 1 },
      ],
      messages: [{ role: "user", content: buildScoutPrompt(scout) }],
    });

    let finalText = "";
    for (const block of res.content as ClaudeContentBlock[]) {
      if (block.type === "text" && block.text) finalText = block.text;
    }
    if (!finalText) {
      debug.error = "no text block in response";
      return { items: [], debug };
    }

    const jsonStr = extractFirstJsonObject(finalText);
    if (!jsonStr) {
      debug.error = `no JSON object found; preview: ${finalText.slice(0, 160)}`;
      return { items: [], debug };
    }

    let parsed: { items?: Array<{ title?: string; url?: string; summary?: string; posted_at?: string }> };
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      debug.error = `parse failed: ${e instanceof Error ? e.message : String(e)}; preview: ${finalText.slice(0, 120)}`;
      return { items: [], debug };
    }
    if (!Array.isArray(parsed.items)) {
      debug.error = "no items array in JSON";
      return { items: [], debug };
    }

    const validShape = parsed.items.filter(
      (it) =>
        it &&
        typeof it.url === "string" &&
        it.url.startsWith("http") &&
        typeof it.title === "string" &&
        typeof it.summary === "string"
    );

    const relevant = validShape.filter((it) =>
      isIntelRelevant(it.title!, it.summary!)
    );
    const droppedForRelevance = validShape.length - relevant.length;

    const items = relevant
      .slice(0, scout.cap)
      .map((it) => ({
        type: scout.type,
        source: scout.source,
        title: it.title!.slice(0, 220),
        url: it.url!,
        summary: it.summary!.slice(0, 240),
        posted_at: typeof it.posted_at === "string" ? it.posted_at : "",
      }));

    debug.ok = true;
    debug.count = items.length;
    if (droppedForRelevance > 0) {
      debug.note = `dropped ${droppedForRelevance} off-topic item(s)`;
    }
    return { items, debug };
  } catch (e) {
    debug.error = e instanceof Error ? e.message : String(e);
    return { items: [], debug };
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchIntelFromWeb(): Promise<{
  items: FetchedIntelItem[];
  debug: ScoutDebug[];
}> {
  const out: FetchedIntelItem[] = [];
  const debug: ScoutDebug[] = [];
  for (const scout of INTEL_SCOUTS) {
    const result = await runScout(scout);
    out.push(...result.items);
    debug.push(result.debug);
    await sleep(1500);
  }
  return { items: out, debug };
}

// ============================================================
// Batch generator — REMOVED on 2026-04-13.
//
// Batch generation moved into the linkedin-batch Claude Code skill. The
// skill lives at .claude/skills/linkedin-batch/SKILL.md and is the single
// source of truth for the voice rules (what used to be BATCH_SYSTEM_PROMPT).
// Claude Code generates the batch directly in-chat using its own model
// capacity — no Vercel API call, no separate cost.
//
// The helpers below (TAHA_SYSTEM_PROMPT, generateComment, scoreHook,
// generatePostIdeas, generateMorningBrief, strategyChat) are still used by
// the legacy /api/ai/* routes (comment, hook, ideas, brief, strategy) kept
// around for the older v1 pages that are still on disk but unreachable
// from the v2 nav.
// ============================================================

async function ask(prompt: string, systemPrompt?: string): Promise<string> {
  const res = await getClient().messages.create({
    model: MODEL,
    max_tokens: 1024,
    ...(systemPrompt ? { system: systemPrompt } : {}),
    messages: [{ role: "user", content: prompt }],
  });
  return res.content[0]?.type === "text" ? res.content[0].text : "";
}

export const TAHA_SYSTEM_PROMPT = `You are Taha Anwar's LinkedIn and Reddit content AI assistant.

ABOUT TAHA:
- Cold email expert and founder of Bleed AI
- Helps B2B founders, sales teams, and agencies scale their outreach with AI-powered cold email
- Builds and operates at the intersection of cold email strategy + AI automation (Bleed AI)
- Audience: B2B founders, sales directors, growth-stage companies, outreach agencies

TAHA'S VOICE:
- Casual but authoritative — sounds like a smart friend who knows his stuff
- Direct and specific — no generic advice, always concrete and actionable
- No fluff, no filler — every sentence earns its place
- Conversational — uses contractions, real language, not corporate speak
- Expert-level — drops specific numbers, frameworks, and insights
- Occasionally asks a punchy rhetorical question to drive the point home
- Short paragraphs (1-3 lines max on LinkedIn)
- Avoids buzzwords like "synergy", "leverage", "unlock", "game-changer"

FUNNEL AWARENESS:
- TOFU (Top of Funnel): Educate, entertain, share insights, build trust. No selling.
- MOFU (Middle of Funnel): Frameworks, case studies, how-tos, process breakdowns.
- BOFU (Bottom of Funnel): Social proof, results, testimonials, soft CTA to lead magnet or DM.

PLATFORM DIFFERENCES:
- LinkedIn: Slightly more professional. Line breaks between every 1-3 sentences. Hooks are crucial.
- Reddit: Raw, community-first. No selling EVER. Be genuinely helpful. Sound like a peer, not a guru.

GOAL: Build authority → attract inbound interest → funnel to lead magnets → convert to clients.`;

export async function generateComment(
  postText: string,
  platform: "linkedin" | "reddit",
  goal: string,
  extraContext?: string
): Promise<string[]> {
  const platformNote =
    platform === "linkedin"
      ? "This is a LinkedIn post. Write professional but casual comments. Short (2-5 lines). Add value or insight."
      : "This is a Reddit thread. Be genuinely helpful, conversational, peer-to-peer. No selling whatsoever.";

  const text = await ask(
    `Generate 3 distinct comment options for the following ${platform} post.

GOAL: ${goal}
PLATFORM: ${platformNote}
${extraContext ? `EXTRA CONTEXT: ${extraContext}` : ""}

POST:
"""
${postText}
"""

Return exactly 3 comments, separated by ---
Each comment should feel different (different angle, different length, different hook).
No labels, no numbering — just the 3 comments separated by ---.`,
    TAHA_SYSTEM_PROMPT
  );

  return text.split("---").map((c) => c.trim()).filter(Boolean).slice(0, 3);
}

export async function scoreHook(hook: string): Promise<{ score: number; reasoning: string; improved: string[] }> {
  const text = await ask(
    `Score this LinkedIn hook and give brutal, specific feedback.

HOOK: "${hook}"

Respond in this exact JSON format:
{
  "score": <number 1-10>,
  "reasoning": "<2-3 sentences of specific feedback>",
  "improved": ["<improved version 1>", "<improved version 2>"]
}`,
    TAHA_SYSTEM_PROMPT
  );

  try {
    const clean = text.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return { score: 0, reasoning: "Could not parse response.", improved: [] };
  }
}

export async function generatePostIdeas(
  funnelStage: string,
  format: string,
  seedTopic: string,
  extraContext?: string
): Promise<Array<{ hook: string; angle: string; leadMagnet: string; funnelStage: string }>> {
  const text = await ask(
    `Generate 5 LinkedIn post ideas for Taha.

FUNNEL STAGE: ${funnelStage}
FORMAT: ${format}
SEED TOPIC: ${seedTopic || "cold email, AI outreach, B2B lead gen"}
${extraContext ? `EXTRA CONTEXT: ${extraContext}` : ""}

Respond in this exact JSON format — an array of 5 objects:
[
  {
    "hook": "<attention-grabbing first line for the post>",
    "angle": "<1-2 sentence explanation of the post angle/content>",
    "leadMagnet": "<suggested lead magnet to attach or mention>",
    "funnelStage": "${funnelStage}"
  }
]`,
    TAHA_SYSTEM_PROMPT
  );

  try {
    const clean = text.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return [];
  }
}

export async function generateMorningBrief(
  creators: string[],
  recentCaptures: string[],
  config: Record<string, string>
): Promise<string> {
  return ask(
    `Write a morning brief for Taha. Max 4 lines total. No fluff.

CONTEXT: ${config["daily_focus"] || "build authority, engage, post"} | Tracks: ${creators.slice(0, 3).join(", ") || "cold email experts"}

3 lines only:
1. One sharp, specific insight about cold email or LinkedIn right now (real stat, trend, or pattern — not generic advice)
2. One concrete action for today with a specific angle (e.g. "Comment on X's post about Y, add your take on Z")
3. One ruthlessly practical reminder

No headers. No bullet points. Just 3 punchy lines separated by line breaks.`,
    TAHA_SYSTEM_PROMPT
  );
}

export async function strategyChat(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  config: Record<string, string>
): Promise<string> {
  const contextNote = config["strategy_context"] || "";
  const systemPrompt = TAHA_SYSTEM_PROMPT + (contextNote ? `\n\nCURRENT CONTEXT: ${contextNote}` : "");

  const res = await getClient().messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });
  return res.content[0]?.type === "text" ? res.content[0].text : "";
}
