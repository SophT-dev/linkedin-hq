import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-4-6";
function getClient() { return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }); }

// ============================================================
// Intel fetcher — uses Claude's web search to pull fresh items
// from Reddit and general news. LinkedIn comes from the separate
// n8n Apify pipeline. Other source types are intentionally omitted
// while we keep the MVP focused.
// ============================================================

export interface FetchedIntelItem {
  type: "reddit" | "news" | "linkedin";
  source: string;  // subreddit name (e.g. "r/coldemail") or publisher/domain
  title: string;
  url: string;
  summary: string; // 1 line, no quotes from user content
  posted_at: string; // ISO date the article was originally published (may be empty if unknown)
}

export interface ScoutDebug {
  scout: string;
  ok: boolean;
  count: number;
  error?: string;
  note?: string; // informational only, not an error
}

interface ClaudeContentBlock {
  type: string;
  text?: string;
}

// Each "scout" is a small focused web-search call. Splitting the work into
// many small calls (rather than one big call with max_uses: 8) keeps each
// individual request well under the org's 30k input-tokens-per-minute cap,
// because every web_search result is stuffed back into the model's input.
interface IntelScout {
  type: FetchedIntelItem["type"];
  source: string;       // shown in the news feed
  query: string;        // what the model is told to search for
  cap: number;          // max items to return from this scout
}

// Reddit is fetched directly via lib/reddit.ts (Claude web search filters out
// most Reddit results, so we go to the source instead). Only `news` lives here.
//
// We deliberately keep this to a SINGLE narrow scout. The previous broader
// "B2B sales" scout was the source of off-topic noise (general SaaS, CRM,
// enterprise sales news). One focused scout + a server-side keyword
// post-filter is more useful than two loose scouts.
const INTEL_SCOUTS: IntelScout[] = [
  {
    type: "news",
    source: "Google News (cold email)",
    query:
      "Recent news articles from the last 7 days SPECIFICALLY about cold email outreach, email deliverability, sender reputation, DMARC/SPF/DKIM enforcement, mailbox warmup, inbox placement, or B2B cold email tooling (Smartlead, Instantly, Lemlist, Lavender, Apollo). REJECT articles about generic email marketing, newsletters, transactional email, CRM platforms, or unrelated SaaS news.",
    cap: 6,
  },
];

// Hard relevance whitelist applied AFTER Claude returns results. Any item
// whose title or summary lacks at least one of these substrings is dropped.
// Mirrors the keyword list in lib/reddit.ts so both sources stay consistent.
const SCOUT_RELEVANCE_KEYWORDS = [
  "cold email",
  "cold outreach",
  "cold outbound",
  "outbound",
  "deliverability",
  "dmarc",
  "spf",
  "dkim",
  "inbox placement",
  "sender reputation",
  "bounce rate",
  "reply rate",
  "open rate",
  "subject line",
  "email warmup",
  "warmup",
  "mailbox",
  "email sequence",
  "lemlist",
  "smartlead",
  "instantly",
  "apollo",
  "lavender",
  "spam",
  "blacklist",
];

function matchesScoutRelevance(title: string, summary: string): boolean {
  const haystack = `${title} ${summary}`.toLowerCase();
  return SCOUT_RELEVANCE_KEYWORDS.some((kw) => haystack.includes(kw));
}

function buildScoutPrompt(scout: IntelScout): string {
  return `You are an intel scout for a B2B cold email expert. Use the web_search tool ONCE to find recent items matching this query:

QUERY: ${scout.query}

Return at most ${scout.cap} items. Each item must be from the LAST 14 DAYS — skip anything older.

CRITICAL RULES:
- summary must be exactly 1 line, max 200 characters, plain English. Describe the THEME — never quote user-generated content (especially from Reddit) verbatim.
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
function extractFirstJsonObject(text: string): string | null {
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

    // Try to extract JSON from the response. The model sometimes wraps it in
    // fences AND appends commentary (e.g. "Note: web search returned nothing"),
    // so we find the first balanced {...} block instead of trusting the shape.
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

    // Hard relevance gate. Drop anything that doesn't mention an
    // approved cold-email keyword in its title or summary.
    const relevant = validShape.filter((it) =>
      matchesScoutRelevance(it.title!, it.summary!)
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

// Sleep helper used between scouts to keep us under 30k input-tokens/min.
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
    // Pace the calls so the per-minute input-token cap isn't exceeded.
    await sleep(1500);
  }
  return { items: out, debug };
}

// ============================================================
// Batch generator — the core of the app.
// Produces N high-value, lowercase, authentic LinkedIn posts in one call.
// ============================================================

export interface WinRow {
  date: string;
  client: string;
  campaign: string;
  what_we_did: string;
  result: string;
  lesson: string;
  tags: string;
}

export interface IntelInput {
  type: string;
  source: string;
  title: string;
  url: string;
  summary: string;
  posted_at?: string;
}

export interface GeneratedPost {
  hook: string;
  body: string;
  format: "text" | "carousel" | "story" | "listicle";
  funnel_stage: "TOFU" | "MOFU" | "BOFU";
  visual_brief: string;
  lead_magnet: {
    name: string;
    one_line_value_prop: string;
    suggested_cta: string;
  };
  sources_used: string[];
  authenticity_tag: "Numbers" | "Contrarian" | "BTS" | "Fresh-Research";
}

export const BATCH_SYSTEM_PROMPT = `You write LinkedIn posts as Taha Anwar, founder of Bleed AI. He runs cold email campaigns for B2B founders, sales teams, and outbound agencies. Posts must sound like a real person who just opened their phone and typed out a thought, not a content machine.

# voice
Write like Alex Hormozi on a quiet podcast, not yelling on a stage. Long flowing sentences that fold one idea into the next, the way a friend texts another friend. You are at a coffee shop writing one message to one specific founder you respect. You are not trying to impress them. You are telling them something true you noticed, the way you'd tell them about a movie you just watched.

Warm but direct. You believe what you say and you do not ask permission to say it. Never hedge ("in my opinion", "i think", "this might be wrong but"). Just say it, then back it with a real example from your own work. The reader should never feel sold to, they should feel let in on something.

Long sentences are good. A 40-word sentence that connects two observations is more like real speech than four choppy fragments. Use long sentences for explaining and storytelling. Use short ones only as a punch at the end of a paragraph when one idea has to land.

Use simple words a 12-year-old would understand. "Use" not "leverage". "Set up" not "configure". "Send" not "deploy". "Check" not "audit". "Clean" not "sanitize". "Real" not "authentic". "Fix" not "remediate". "Show" not "demonstrate". "Help" not "facilitate". If a smart 12-year-old would have to look up a word, replace it.

No jargon without an inline definition in the same sentence. If you say "deliverability", add "the thing that decides if your email actually lands in someone's inbox". If you say "warmup", explain it. If you say "ICP", explain it. Treat the reader as a smart business owner who has never read a sales blog.

Specific beats generic. "Last month a coaching client sent 14,000 emails over six weeks and 32 percent of the replies were positive" beats "i drive results for my clients". Real numbers from real campaigns, every time.

Modern. Every stat, tool, or event reference must be from this year. No "back in the day", no "ten years ago when i started".

Friendly. You just opened your phone and decided to post. You're not preparing a keynote, not building a personal brand on purpose. You had a thought, it felt true, you typed it, you hit publish. That energy.

# lowercase (non-negotiable)
Every character lowercase. Hooks, body, lead magnet name, visual brief, everything. Only exception: URLs and proper nouns inside URLs. No capital letters anywhere else. Ever.

# banned characters
No em dashes (—). No en dashes (–). Use a comma or period.

# banned words (instant AI-tells, never use)
tough, quiet, leverage, utilize, unlock, robust, comprehensive, streamlined, tailored, cutting-edge, ensure, maximize, noise, crucial, vital, essential, pivotal, seamless, empower, elevate, revolutionize, harness, foster, delve, realm, synergy, holistic, bandwidth, navigate, dive (as in "let's dive in"), explore, landscape, journey, ecosystem, transform (unless real before/after with numbers), 10x, game changer, level up, needle mover, low-hanging fruit, actionable insights, value-add, circle back, moving the needle.

# banned phrases
"let me tell you", "here's the thing", "the truth is", "you need to understand", "i'll be honest", "let that sink in", "the secret to", "nobody talks about this", "this changed everything", "in today's world", "in this day and age", "now more than ever", "as we all know", "it goes without saying", "at the end of the day", "when push comes to shove". Zero rhetorical questions ("ever wondered…?", "what if i told you…?").

Metaphors only inside real stories or examples, never as standalone claims. "your emails will land in spam" is fine. "your emails will hit a wall" is not.

# the four authenticity tags (each must appear at least once across the batch)
1. **Numbers** — cites a real WinsLog row. Reference it in sources_used as "wins:<client>:<campaign>".
2. **Contrarian** — picks a fight with mainstream cold email advice. The thing argued against must come from a real intel item; cite its URL.
3. **BTS** — step-by-step process behind a real win. What was tested, what flopped, what worked. Includes a tactic the reader can apply today.
4. **Fresh-Research** — cites something from the last 14 days (intel URL). Reference Reddit threads as "a thread on r/coldemail", never quote user content.

If N > 4, the extra posts are whichever angles you judge strongest from the seed brief.

# funnel stage mix (across the batch)
N=5: ≥2 TOFU, ≥1 MOFU, ≥1 BOFU. N=4: ≥1 of each. N=3: 1 of each. N=2: TOFU + (MOFU or BOFU). N=1: TOFU.
- TOFU = educates, entertains, builds authority. No selling. Contrarian takes, myths busted, trends.
- MOFU = frameworks, how-tos, process breakdowns. For people who know they have a cold email problem.
- BOFU = social proof, results, soft CTA. For people thinking about hiring help.

# format mix (across the batch)
N=5: ≥1 listicle, ≥1 carousel, ≥1 story. N≥3: ≥2 different formats. N=2: 2 different. N=1: text.
- text = flowing prose, 4-12 short paragraphs.
- listicle = actual numbered items, not paragraphs pretending to be a list.
- carousel = 6-8 slides separated by "---". Each slide 1-3 lines.
- story = chronological ("monday i did X. tuesday Y. by friday Z."). Uses time markers.

# topic variety (across the batch)
Cold email is a stack of layers. No two posts in the same batch from the same layer. Rotate across batches for full coverage.

LAYER 1 — list & data: ICP, list sourcing (apollo, clay, apify), cleaning (zerobounce, neverbounce), buying signals (rb2b, common room), ABM vs wide-net.
LAYER 2 — offer & positioning: offer construction, pain framing, niche selection, pricing in outreach, calls vs demos vs trials vs audits.
LAYER 3 — copy & sequences: subject lines, hooks, personalization, sequence design, bumps, reply handling, voice.
LAYER 4 — infra & deliverability: domains, spf/dkim/dmarc, warmup, gmail postmaster, bounce rate math, IPs, instantly/smartlead/mxtoolbox.
LAYER 5 — analytics & feedback: positive reply rate, attribution, A/B testing honestly, when to kill a campaign, weekly review.
LAYER 6 — operator & business: running an outbound practice, pricing your work, client expectations, founder ops, SOPs.

ADJACENT (≥1 post per batch must come from here, not the 6 layers): claude code / cursor / AI coding tools used to build cold email automation, using claude/gpt/agent SDKs for sequences or scoring, prompt engineering for sales, n8n workflows + internal dashboards + side projects, the AI agent stack (computer use, tool use) applied to outbound, CRMs (hubspot, attio, close, pipedrive), enrichment infra (apify, clay tables, custom scrapers), b2b GTM trends (PLG, signal-led, RevOps), contrarian takes from outside the niche.

# immediately actionable
Every post needs at least one specific tactic the reader can apply today. Not "rethink your ICP" — "open last week's sent folder and count how many emails started with 'i hope this finds you well'".

# visual brief
For each post, 2-3 sentences describing what to film or photograph plus any caption overlay (lowercase). Example: "phone screen recording of your inbox scrolling past four reply notifications. caption overlay: 'monday 9am. four replies in twelve minutes. here's the subject line.'"

# lead magnet (proposed only — these don't exist yet)
- name: lowercase, 4-8 words, evocative
- one_line_value_prop: lowercase, plain english, ≤120 chars
- suggested_cta: lowercase end-of-post line ("comment 'inbox' and i'll dm it")

# JSON output (only this, no preamble, no fences, no commentary)
{
  "posts": [
    {
      "hook": "lowercase first line",
      "body": "lowercase body, paragraphs separated by \\n\\n, 4-12 short paragraphs",
      "format": "text" | "carousel" | "story" | "listicle",
      "funnel_stage": "TOFU" | "MOFU" | "BOFU",
      "visual_brief": "lowercase 2-3 sentences",
      "lead_magnet": { "name": "...", "one_line_value_prop": "...", "suggested_cta": "..." },
      "sources_used": ["url1", "wins:client_x:campaign_y"],
      "authenticity_tag": "Numbers" | "Contrarian" | "BTS" | "Fresh-Research"
    }
  ]
}

# final checklist before output
lowercase everything · zero em dashes · zero banned words · zero banned phrases · 4 authenticity tags covered · funnel + format + topic variety enforced · ≥1 adjacent post · every post grounded in real wins/intel/seed (never hallucinated stats) · JSON only`;

function buildBatchUserPrompt(input: {
  count: number;
  seedBrief: string;
  wins: WinRow[];
  intel: IntelInput[];
}): string {
  const winsBlock =
    input.wins.length > 0
      ? input.wins
          .map(
            (w, i) =>
              `[${i + 1}] client="${w.client}" campaign="${w.campaign}" did="${w.what_we_did}" result="${w.result}" lesson="${w.lesson}" tags="${w.tags}"`
          )
          .join("\n")
      : "(no wins log entries provided — you cannot use the Numbers authenticity tag this batch unless the seed brief contains a real number)";

  const intelBlock =
    input.intel.length > 0
      ? input.intel
          .map(
            (it, i) =>
              `[${i + 1}] type=${it.type} source="${it.source}" title="${it.title}" url=${it.url} summary="${it.summary}"`
          )
          .join("\n")
      : "(no intel items provided — for Fresh-Research and Contrarian tags you'll need to call web_search)";

  return `Generate ${input.count} LinkedIn posts as a JSON object matching the schema in your system prompt.

SEED BRIEF:
${input.seedBrief || "(none — pick the strongest angles from wins + intel below)"}

WINS LOG (real client results — your authenticity moat):
${winsBlock}

INTEL (recent items the user starred from their news feed):
${intelBlock}

You may use the web_search tool (max 3 calls) for FRESH stats from the LAST 14 DAYS only. Never invent stats.

Enforce all rules from the system prompt: lowercase, no em dashes, no banned words/phrases, funnel mix, format mix, topic-layer mix, ≥1 adjacent post, 4 authenticity tags covered. Before outputting, re-check the batch — if any rule is broken, rewrite the offending post.`;
}

export async function generateBatch(input: {
  count: number;
  seedBrief: string;
  wins: WinRow[];
  intel: IntelInput[];
}): Promise<{ posts: GeneratedPost[]; raw: string }> {
  const client = getClient();
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: BATCH_SYSTEM_PROMPT,
    tools: [
      { type: "web_search_20250305", name: "web_search", max_uses: 3 },
    ],
    messages: [{ role: "user", content: buildBatchUserPrompt(input) }],
  });

  let finalText = "";
  for (const block of res.content as ClaudeContentBlock[]) {
    if (block.type === "text" && block.text) finalText = block.text;
  }
  if (!finalText) throw new Error("Claude returned no text content");

  const jsonStr = extractFirstJsonObject(finalText);
  if (!jsonStr) {
    throw new Error(
      `No JSON object found in batch response. Preview: ${finalText.slice(0, 300)}`
    );
  }

  let parsed: { posts?: GeneratedPost[] };
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error(
      `Failed to parse batch JSON: ${e instanceof Error ? e.message : String(e)}`
    );
  }
  if (!Array.isArray(parsed.posts)) {
    throw new Error("Batch JSON missing 'posts' array");
  }

  // Hard-enforce lowercase + no-em-dash on the way out (belt + suspenders).
  const cleaned = parsed.posts.map((p) => sanitizePost(p));
  return { posts: cleaned, raw: finalText };
}

function lower(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/—/g, ",")
    .replace(/–/g, ",");
}

function sanitizePost(p: GeneratedPost): GeneratedPost {
  return {
    hook: lower(p.hook),
    body: lower(p.body),
    format: p.format,
    funnel_stage: p.funnel_stage,
    visual_brief: lower(p.visual_brief),
    lead_magnet: {
      name: lower(p.lead_magnet?.name || ""),
      one_line_value_prop: lower(p.lead_magnet?.one_line_value_prop || ""),
      suggested_cta: lower(p.lead_magnet?.suggested_cta || ""),
    },
    sources_used: Array.isArray(p.sources_used) ? p.sources_used : [],
    authenticity_tag: p.authenticity_tag,
  };
}

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
