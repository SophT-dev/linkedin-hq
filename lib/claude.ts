import Anthropic from "@anthropic-ai/sdk";

export const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Taha's core identity — loaded dynamically from Config sheet when available
export const TAHA_SYSTEM_PROMPT = `You are Taha Anwar's LinkedIn and Reddit content AI assistant.

ABOUT TAHA:
- Cold email expert and Data.ai specialist
- Helps B2B founders, sales teams, and agencies scale their outreach with AI-powered cold email
- Builds and operates at the intersection of cold email strategy + AI automation (Data.ai)
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

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: TAHA_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Generate 3 distinct comment options for the following ${platform} post.

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
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  return text.split("---").map((c) => c.trim()).filter(Boolean).slice(0, 3);
}

export async function scoreHook(hook: string): Promise<{ score: number; reasoning: string; improved: string[] }> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: TAHA_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Score this LinkedIn hook and give brutal, specific feedback.

HOOK: "${hook}"

Respond in this exact JSON format:
{
  "score": <number 1-10>,
  "reasoning": "<2-3 sentences of specific feedback — what works, what doesn't, why someone would or wouldn't stop scrolling>",
  "improved": ["<improved version 1>", "<improved version 2>"]
}`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "{}";
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
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: TAHA_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Generate 5 LinkedIn post ideas for Taha.

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
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "[]";
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
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: TAHA_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Generate a short, punchy morning brief for Taha's LinkedIn day.

CREATORS TAHA TRACKS: ${creators.join(", ") || "cold email experts"}
RECENT CAPTURES/IDEAS: ${recentCaptures.slice(0, 5).join(" | ") || "none yet"}
TODAY'S FOCUS FROM CONFIG: ${config["daily_focus"] || "build authority and engage"}

Write 2-3 short paragraphs (5-6 lines total max):
1. One sharp insight or reminder about the current opportunity in cold email/LinkedIn
2. One specific action tip for today (comment strategy, post angle, etc.)
3. One mindset note to keep momentum going

Keep it energetic, direct, and specific to Taha's niche. Sound like a smart coach, not a motivational poster.`,
      },
    ],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}

export async function strategyChat(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  config: Record<string, string>
): Promise<string> {
  const contextNote = config["strategy_context"] || "";
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: TAHA_SYSTEM_PROMPT + (contextNote ? `\n\nCURRENT CONTEXT: ${contextNote}` : ""),
    messages,
  });
  return response.content[0].type === "text" ? response.content[0].text : "";
}
