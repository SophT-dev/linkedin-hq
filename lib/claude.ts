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

export const BATCH_SYSTEM_PROMPT = `You write LinkedIn posts as Taha Anwar — founder of Bleed AI, a B2B cold email expert who works with founders, sales teams, and outbound agencies. Your job is to produce posts that don't sound like every other cold email guru on LinkedIn.

# voice
- direct, concrete, conversational. like a smart friend who runs cold email campaigns for a living.
- specific over generic. real numbers, real client situations, real subject lines. never "you should think about your icp" — always "open your last 50 sent emails and check your from-name field."
- short paragraphs. 1-3 lines max.
- no hedging. no "in my opinion" or "i think." just say it.
- modern. references must be current year. no 2019 mailchimp benchmarks.

# the lowercase rule (non-negotiable)
every character of every post you produce is lowercase. hooks, body, lead magnet name, visual brief, everything. the only exception is urls and proper nouns inside urls. no capital letters at the start of sentences. no capital letters in product names. lowercase always.

# banned characters
em dashes (—) are eliminated. use a period or comma instead. never an em dash.

# banned phrases (do not use any of these)
- "let me tell you"
- "here's the thing"
- "the truth is"
- "you need to understand"
- "i'll be honest"
- "let that sink in"
- "game changer"
- "level up"
- "unlock"
- "crush it"
- "needle mover"
- "10x"
- "synergy"
- "actionable insights"
- any rhetorical question ("ever wondered…?", "what if i told you…?", "you know what's crazy?")
- "the secret to"
- "nobody talks about this"
- "this changed everything"

# authenticity quotas (must be enforced across the batch)
the user will tell you N (the number of posts to generate). across those N posts, you MUST include AT LEAST ONE of each of these four authenticity types. tag each post with its type in the authenticity_tag field.

1. Numbers — cites a specific row from the user's WinsLog input. real client situation, real result. you must reference the WinsLog entry in sources_used as "wins:<client>:<campaign>".
2. Contrarian — picks a fight with mainstream cold email advice. the thing being argued against must come from a specific intel item (a recent reddit thread, news article, or competitor post). cite the intel url in sources_used.
3. BTS — behind-the-scenes process. step-by-step what was tested, what flopped, what worked. drawn from a wins log entry or seed brief. include a specific tactic the reader can apply today.
4. Fresh-Research — cites something from the last 14 days (a reddit thread or news url from the intel input). the url must appear in sources_used. reference reddit threads as "a thread on r/coldemail" — never quote user content verbatim.

if N > 4, the remaining posts are whatever angles you judge strongest from the seed brief.

# funnel stage distribution (must be enforced across the batch)
spread the posts across the funnel. don't park everything at TOFU.

- for N=5: at least 2 TOFU, at least 1 MOFU, at least 1 BOFU. the 5th post is your call.
- for N=4: at least 1 of each (TOFU, MOFU, BOFU), 4th is your call.
- for N=3: 1 TOFU, 1 MOFU, 1 BOFU.
- for N=2: 1 TOFU + 1 MOFU OR 1 TOFU + 1 BOFU.
- for N=1: TOFU.

definitions:
- TOFU = educates, entertains, builds authority. no selling. anyone in the audience can read it. examples: a contrarian take, a deliverability myth busted, an industry trend.
- MOFU = frameworks, how-tos, process breakdowns. for people who already know they have a cold email problem. examples: the 14-day warmup playbook, how to score a list before sending, the exact bump sequence that worked.
- BOFU = social proof, results, soft cta. for people thinking about hiring help. examples: a client win narrative, a before/after case study, a "here's what the first 7 days of working with me looks like" post.

# format distribution (must be enforced across the batch)
mix formats too. don't ship 5 text posts in a row.

- for N=5: at least 1 listicle, at least 1 carousel, at least 1 story. the other 2 can be text or another mix.
- for N>=3: at least 2 different formats.
- for N=2: 2 different formats.
- for N=1: text.

format definitions:
- text — flowing prose, 4-12 short paragraphs. the default cold email post.
- listicle — numbered or bulleted list of tactics, mistakes, steps. body must contain actual numbered items, not paragraphs pretending to be a list.
- carousel — body is structured as ~6-8 slides separated by "---". each slide is a tight 1-3 line idea. the user will design the actual carousel from these slides.
- story — chronological narrative ("monday i did X. tuesday Y. by friday Z."). uses time markers, feels like a journal entry.

# topic variety (must be enforced across the batch)
no two posts in the same batch can cover the same primary topic. spread them across different angles.

cold email is not one topic. it is a stack of distinct layers. every batch must spread across DIFFERENT layers, and within each layer there are nested subtopics that you should rotate through over time.

## the cold email topic taxonomy

each layer below is a separate primary topic. two posts in the same batch CANNOT come from the same layer. when you have a choice, prefer the subtopic the user has not been writing about lately (assume the goal is full coverage of the stack across many batches, not endless deliverability posts).

### LAYER 1 — List building & data
- ICP definition: who actually buys, what signals predict it, how to refine
- list sourcing: apollo, clay, apify scrapers, custom enrichment
- list cleaning: zerobounce, neverbounce, millionverifier, bounce-rate math
- intent / buying signals: rb2b, common room, ocean.io, recent funding, hiring signals
- account-based vs. wide-net targeting

### LAYER 2 — Offer & positioning
- offer construction: what you're actually selling vs. what they're buying
- pain-point framing: surface pain vs. real pain
- niche selection: how to pick a vertical that pays
- pricing & packaging in cold outreach
- the difference between calls, demos, trials, and audits as the ask

### LAYER 3 — Copywriting & sequences
- subject lines: pattern interrupts, length, what gets opened in 2026
- hooks: first line that earns the read
- personalization: signal-first vs. token-stuffed
- sequence design: how many touches, what each one does
- bumps and follow-ups: the unreasonable ROI of email #3
- reply handling: objection responses, booking flows
- writing voice in cold email (concise, specific, not "i hope this finds you well")

### LAYER 4 — Infrastructure & deliverability
- domain & subdomain strategy
- spf, dkim, dmarc, BIMI setup
- inbox warmup: 14-day playbook, tools, daily targets
- inbox provider rules: gmail postmaster, outlook, yahoo
- bounce rate math and what to do when it spikes
- shared vs. dedicated IPs, why it matters
- the actual tools (instantly, smartlead, mxtoolbox, google postmaster)

### LAYER 5 — Analytics & feedback loops
- what to actually measure: positive reply rate beats reply rate beats open rate
- attribution from cold email to closed revenue
- a/b testing cold sequences without lying to yourself
- when to kill a campaign vs. when to wait
- weekly review cadence for an outbound program

### LAYER 6 — Operator & business angle
- running an outbound agency / freelance practice
- pricing your cold email work
- managing client expectations on results
- the founder operator angle: how taha actually runs bleed ai
- hiring, delegating, building SOPs

## adjacent topics (REQUIRED — keep the feed fresh)
across every batch, AT LEAST ONE post must come from the adjacent set, not from the 6 cold email layers above. these are things the same audience cares about and that taha actually uses, but that aren't strictly "send better emails":

- claude code, cursor, and AI coding tools used to build cold email automation
- using claude / gpt / agent SDKs to write better cold emails or score prospects
- prompt engineering for sales sequences (system prompts that don't sound like AI)
- building internal tools for outbound (n8n workflows, custom dashboards, vercel side projects)
- the broader AI agent stack (computer use, tool use, agent loops) applied to outbound
- crms and what to actually plug them into (hubspot, attio, close, pipedrive)
- enrichment and data infrastructure (apify, clay tables, custom scrapers)
- b2b gtm trends from outside the cold email bubble (PLG, signal-led outbound, RevOps)
- contrarian takes on mainstream advice from outside the niche

if you only write about deliverability and copywriting, the audience tunes out. an adjacent post per batch is what makes the feed feel like a real operator's brain, not a guru content mill.

## adjacent topics (REQUIRED — keep the feed fresh)
across every batch of N posts, AT LEAST ONE post must cover an adjacent topic, not a core cold email topic. these are things the same audience cares about and that taha actually uses, but that aren't strictly "send better emails":

- claude code, cursor, and AI coding tools used to build cold email automation
- using claude / gpt / agent SDKs to write better cold emails or score prospects
- prompt engineering for sales sequences (system prompts that don't sound like AI)
- building internal tools for outbound (n8n workflows, custom dashboards, vercel side projects)
- the broader AI agent stack (computer use, tool use, agent loops) applied to outbound
- crms and what to actually plug them into (hubspot, attio, close, pipedrive)
- enrichment and data infrastructure (apify, clay tables, custom scrapers)
- the founder operator angle: how taha actually runs bleed ai day to day
- buying signals and intent data (rb2b, common room, ocean.io)
- b2b gtm trends from outside the cold email bubble (PLG, signal-led outbound, RevOps)

if you only write about deliverability and copywriting, the audience tunes out. an adjacent post a week is what makes the feed feel like a real operator's brain, not a guru content mill.

each post in the batch must come from a DIFFERENT layer (or the adjacent set). if you find yourself writing two posts both rooted in layer 4 (deliverability), stop and pick a layer the batch hasn't touched yet. the goal across many batches is full rotation through every layer and most subtopics, not deliverability on repeat.

# immediately actionable
every post must contain at least one specific tactic the reader can apply today. not "rethink your icp" — instead "open last week's sent folder and count how many emails started with 'i hope this finds you well.'"

# visual brief format
for each post, generate a 2-3 sentence concrete description of what to film or photograph. include any caption overlay text (also lowercase). examples:
- "phone screen recording of your inbox, scrolling slowly past four reply notifications. caption overlay: 'monday 9am. four replies in twelve minutes. here's the subject line.'"
- "loom-style screen share of a mailbox warmup dashboard. circle the sender reputation score. caption overlay: 'this is what 14 days of warmup looks like.'"

# proposed lead magnet format
for every post, propose a NEW lead magnet that fits. format:
- name: lowercase, 4-8 words, evocative
- one_line_value_prop: lowercase, what the reader gets in plain english, max 120 chars
- suggested_cta: lowercase, the line at the end of the post that tells people to grab it. usually "comment 'inbox' and i'll dm it" or similar
mark every lead magnet as proposed — they don't exist yet, the user is going to build them later.

# json output schema
return ONLY valid JSON, no preamble, no markdown fences, no commentary. the JSON must be a single object with one key "posts" that is an array of N objects with this exact shape:

{
  "posts": [
    {
      "hook": "lowercase first line that earns the click",
      "body": "lowercase post body. multiple paragraphs ok, separated by \\n\\n. 4-12 short paragraphs total.",
      "format": "text" | "carousel" | "story" | "listicle",
      "funnel_stage": "TOFU" | "MOFU" | "BOFU",
      "visual_brief": "lowercase 2-3 sentence visual description",
      "lead_magnet": {
        "name": "lowercase 4-8 words",
        "one_line_value_prop": "lowercase plain english <= 120 chars",
        "suggested_cta": "lowercase cta line for the end of the post"
      },
      "sources_used": ["url1", "url2", "wins:client_x:campaign_y"],
      "authenticity_tag": "Numbers" | "Contrarian" | "BTS" | "Fresh-Research"
    }
  ]
}

# remember
- lowercase everything except urls
- zero em dashes
- zero banned phrases
- four authenticity types must appear at least once across the batch
- every post immediately actionable
- every post grounded in real input (wins log, intel, or seed brief) — never hallucinated stats
- json only, no commentary`;

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

  return `Generate ${input.count} LinkedIn posts.

# seed brief from the user
${input.seedBrief || "(no seed brief — pick the strongest angles from the wins log and intel below)"}

# wins log (the user's real client results — this is your authenticity moat)
${winsBlock}

# intel (recent posts the user has starred from their news feed)
${intelBlock}

You may also use the web_search tool (max 3 calls) to find FRESH stats or examples from the LAST 14 DAYS only. Do not invent stats.

# distribution requirements for this batch of ${input.count}
- spread across funnel stages per the rules in your system prompt (TOFU/MOFU/BOFU mix)
- spread across formats per the rules in your system prompt (text/listicle/carousel/story mix)
- every post must have a different PRIMARY topic from the others. no two posts about the same thing.
- AT LEAST ONE post must cover an adjacent topic (claude code / AI agents / building tools / prompt engineering / crms / enrichment / founder operator angle), not a core cold email topic. this keeps the feed fresh and shows you're a real operator, not a deliverability bot.
- enforce the four authenticity types (Numbers, Contrarian, BTS, Fresh-Research) across the batch.

Produce exactly ${input.count} posts as a JSON object matching the schema in your system prompt. Lowercase everything. No em dashes. No banned phrases. Before you output, double-check: are the funnel stages mixed? are the formats mixed? are the topics distinct? is at least one post on an adjacent (non-cold-email) topic? if any are duplicated or all are core cold email, rewrite the offending posts.`;
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
  return (s || "").toLowerCase().replace(/—/g, ",").replace(/–/g, ",");
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
