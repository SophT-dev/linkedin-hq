import Anthropic from "@anthropic-ai/sdk";
import { checkVoiceCompliance, lowerSanitize, VoiceCheck } from "./voice-rules";

const MODEL = "claude-sonnet-4-6";
function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// ============================================================
// Auto-comment generator for the linkedin-hq creator feed
//
// Called from /api/comments/plan after the n8n flow scrapes a batch of
// LinkedIn posts. For each candidate post, we pick one of 5 style presets,
// generate a single comment in Taha's voice, run the voice quality gate,
// and return the result. Quality-failed comments are still logged to the
// Comments tab so we can see what got rejected and tune over time.
//
// Voice rules live in lib/voice-rules.ts (machine-readable mirror of the
// linkedin-batch skill's Voice Rules section).
// ============================================================

export type StylePreset =
  | "agree_add"
  | "contrarian"
  | "sharp_question"
  | "bts_story"
  | "tactical_tip";

interface PresetSpec {
  id: StylePreset;
  instruction: string;
}

// The 5 style presets. Each is a focused prompt fragment fed alongside the
// post text. All apply the full voice rules from the system prompt.
export const STYLE_PRESETS: Record<StylePreset, PresetSpec> = {
  agree_add: {
    id: "agree_add",
    instruction:
      "agree with the post's main claim and add one specific number, real example, or stat from cold email or AI agents that strengthens it. start with a single short statement, not a hedge.",
  },
  contrarian: {
    id: "contrarian",
    instruction:
      "respectfully push back on one specific claim in the post. lead with what's right about it, then say where you'd disagree based on real cold email work, with one concrete example.",
  },
  sharp_question: {
    id: "sharp_question",
    instruction:
      "ask one specific, useful question that pushes the conversation forward. not rhetorical. not 'great post.' a real question that the author would actually want to answer because it makes them think. keep it under 20 words.",
  },
  bts_story: {
    id: "bts_story",
    instruction:
      "share a 2-3 sentence behind-the-scenes from your own cold email or AI agent work that connects to the post's theme. real numbers, real outcomes, no metaphors.",
  },
  tactical_tip: {
    id: "tactical_tip",
    instruction:
      "drop one specific tactic the reader can apply today that builds on the post. one sentence setup, one sentence tactic. nothing more.",
  },
};

// Heuristic style picker. Looks at the post text and decides which preset
// fits best. Cheap, deterministic, no model call needed.
//
// Order matters — first match wins.
export function pickStylePreset(postText: string): StylePreset {
  const lower = (postText || "").toLowerCase();

  // If the post text already contains a question, asking another question
  // back is awkward — pick something else.
  const hasQuestion = lower.includes("?");

  // Strong universal claims → contrarian opportunity
  if (
    /(always|never|everyone|nobody|all (founders|sdrs|agencies)|the only way)/.test(
      lower
    )
  ) {
    return "contrarian";
  }

  // How-to / numbered list patterns → tactical_tip
  if (
    /(here's how|step \d|^\d+\.|^- |^\* )/m.test(lower) ||
    /(how to|the playbook|the framework)/.test(lower)
  ) {
    return "tactical_tip";
  }

  // Personal narrative markers → bts_story
  if (
    /(last (week|month|year|tuesday|monday|friday)|i (just|recently|spent|built|tried|ran))/.test(
      lower
    )
  ) {
    return "bts_story";
  }

  // The post asks the reader something → answer it with our own take, don't
  // ask another question. Skip sharp_question.
  if (hasQuestion) {
    return "agree_add";
  }

  // Default
  return "agree_add";
}

const COMMENT_SYSTEM_PROMPT = `You write LinkedIn comments as Taha Anwar, founder of Bleed AI. He runs cold email campaigns for B2B founders, sales teams, and outbound agencies, and builds AI agent infrastructure for outbound.

Voice rules (NON-NEGOTIABLE):
- everything lowercase. every character. no exceptions except urls.
- no em dashes (—). no en dashes (–). use commas or periods.
- no rhetorical questions. no question marks at all unless asking a real specific question the author would answer.
- no hedging ("in my opinion", "i think", "this might be wrong but"). just say it.
- no metaphors as standalone claims. metaphors only inside real stories.
- specific over generic. real numbers from real work over vague claims.
- friendly text-message energy. like one founder telling another founder something true.
- write the way alex hormozi talks on a quiet podcast — long flowing sentences when explaining, short ones only as a punch.

BANNED WORDS (instant fail, never use): tough, quiet, leverage, utilize, unlock, robust, comprehensive, streamlined, tailored, cutting-edge, ensure, maximize, noise, crucial, vital, essential, pivotal, seamless, empower, elevate, revolutionize, harness, foster, delve, realm, synergy, holistic, bandwidth, navigate, dive, explore, landscape, journey, ecosystem, transform, 10x, game changer, level up, needle mover, low-hanging fruit, actionable insights, value-add, circle back, moving the needle.

BANNED PHRASES: "let me tell you", "here's the thing", "the truth is", "you need to understand", "i'll be honest", "let that sink in", "the secret to", "nobody talks about this", "this changed everything", "in today's world", "in this day and age", "now more than ever", "as we all know", "it goes without saying", "at the end of the day", "when push comes to shove".

Length: 30 to 280 characters. Shorter is better. LinkedIn comments perform best between 50 and 150 chars.

Output: ONLY the comment text. No preamble. No quotes around it. No explanation. Just the comment that will be posted as-is.`;

export interface CandidatePost {
  url: string;
  text: string;
  creator_name: string;
  reactions?: number;
  comments?: number;
}

export interface GeneratedComment {
  comment_text: string;
  style_preset: StylePreset;
  raw_model_output: string;
}

// Generates one comment for one post. Picks a style preset, calls the model,
// sanitizes (lowercase + dash strip), returns. Caller is expected to run
// qualityGateComment on the result before saving.
export async function generateExpertComment(
  post: CandidatePost
): Promise<GeneratedComment> {
  const stylePreset = pickStylePreset(post.text);
  const preset = STYLE_PRESETS[stylePreset];

  const userPrompt = `LinkedIn post by ${post.creator_name}:

"""
${post.text.slice(0, 2000)}
"""

Style for this comment: ${preset.instruction}

Write the comment now. Lowercase only. 30-280 chars. No quotes around it, no preamble.`;

  const client = getClient();
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    system: COMMENT_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const raw =
    res.content[0]?.type === "text" ? res.content[0].text.trim() : "";
  // Strip any quotes the model wrapped around its output, and run the
  // standard sanitizer (lowercase + em/en dash → comma).
  const stripped = raw.replace(/^["']|["']$/g, "").trim();
  const cleaned = lowerSanitize(stripped);

  return {
    comment_text: cleaned,
    style_preset: stylePreset,
    raw_model_output: raw,
  };
}

// Wraps the voice-rules check + adds comment-specific length bounds.
export function qualityGateComment(text: string): VoiceCheck {
  if (!text || text.trim().length === 0) {
    return { ok: false, reason: "empty comment" };
  }
  if (text.length < 30) {
    return { ok: false, reason: `too short (${text.length} chars, min 30)` };
  }
  if (text.length > 280) {
    return { ok: false, reason: `too long (${text.length} chars, max 280)` };
  }
  return checkVoiceCompliance(text);
}

// Pulls the 19-digit activity id out of a LinkedIn post URL and wraps it
// in the canonical URN format the comment endpoint expects.
//
// Handles both URL shapes:
//   https://www.linkedin.com/posts/username_slug-activity-7234567890123456789-abcd
//   https://www.linkedin.com/feed/update/urn:li:activity:7234567890123456789/?...
//
// Returns null if no 19-digit id can be extracted.
export function extractPostUrn(url: string): string | null {
  if (!url) return null;

  // Already-formed URN inside the URL
  const urnMatch = url.match(/urn:li:activity:(\d{18,19})/);
  if (urnMatch) return `urn:li:activity:${urnMatch[1]}`;

  // /posts/ shape with -activity-XXX-suffix
  const postsMatch = url.match(/-activity-(\d{18,19})-/);
  if (postsMatch) return `urn:li:activity:${postsMatch[1]}`;

  // Loose fallback — any 19-digit number in the URL
  const looseMatch = url.match(/(\d{19})/);
  if (looseMatch) return `urn:li:activity:${looseMatch[1]}`;

  return null;
}
