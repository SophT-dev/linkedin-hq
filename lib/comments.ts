import Anthropic from "@anthropic-ai/sdk";
import {
  BANNED_WORDS,
  BANNED_PHRASES,
  VoiceCheck,
} from "./voice-rules";

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
  | "agree_witty"
  | "agree_curious"
  | "agree_leadmagnet";

interface PresetSpec {
  id: StylePreset;
  instruction: string;
}

// 3 style presets, all agreement-based, all short. The generator picks
// one based on the post content. All apply the voice rules from the
// system prompt. Target length: 10-20 words per comment.
export const STYLE_PRESETS: Record<StylePreset, PresetSpec> = {
  agree_add: {
    id: "agree_add",
    instruction:
      "agree with the post in 10-20 words AND add ONE real insight that extends the point. the insight must be genuine domain knowledge — something true about how cold email or AI agents actually work, the kind of thing another practitioner would read and nod at. NOT a client story, NOT a 'we had X do Y' stat, NOT a flex. just peer-shared knowledge. examples of the shape (copy the energy, not the content): 'yessss and the reason it works is specificity signals actual research', '100%, the real fix is usually one trigger signal instead of three', 'exactly, warmup only matters if your domain is under 30 days old'. the insight must be backed by how the space actually works, never invented.",
  },
  agree_witty: {
    id: "agree_witty",
    instruction:
      "react to the post with agreement + a joke, funny aside, or relatable peer moment in 10-20 words total. think self-deprecating, relatable, 'haha yeah this is so real' energy. examples of the kind of humor: 'haha the amount of founders who still use 'hope this finds you well' is unhinged', 'not me literally doing this exact thing at 11pm last tuesday', 'wait you mean we weren't supposed to send 800 emails from one inbox'. matches the post's energy, never forced. NO client stories, NO 'we ran a test', just a casual human reaction.",
  },
  agree_curious: {
    id: "agree_curious",
    instruction:
      "agree briefly then ask ONE short genuine follow-up question in 10-20 words total. not rhetorical, not a gotcha. a real question you'd want the author to answer because you're curious how they'd handle it. short.",
  },
  agree_leadmagnet: {
    id: "agree_leadmagnet",
    instruction:
      "this post is offering a lead magnet (guide, template, checklist, playbook, etc.) in exchange for commenting a specific trigger word. read the post carefully to find the EXACT word the author asked readers to comment — it's usually after phrases like 'comment', 'type', 'drop', 'reply with', or 'say', and often in quotes or caps. include that exact word IN ALL CAPS inside your comment so the lead magnet automation sends it to Taha. keep the comment SHORT: 8-15 words, casual, enthusiastic but not flattery. the trigger word MUST appear in ALL CAPS in your output. examples of the shape (not the content, copy the energy): 'yessss i need this, GUIDE please', 'dropping INBOX, looks super useful', 'okay this sounds perfect — TEMPLATE'. if you can't find the exact trigger word, write the comment using a guessed common word like GUIDE but always IN CAPS.",
  },
};

// Heuristic style picker. Looks at the post text and decides which of the
// 4 agreement-based presets fits best.
//
// Order matters — first match wins. Lead magnet detection is highest
// priority because if we miss it, Taha doesn't get the lead magnet.
export function pickStylePreset(postText: string): StylePreset {
  const text = postText || "";
  const lower = text.toLowerCase();

  // HIGHEST PRIORITY — lead magnet post detection.
  // LinkedIn creators commonly offer a lead magnet in exchange for commenting
  // a specific word. We detect the pattern so our comment includes that word
  // in ALL CAPS and Taha receives the lead magnet.
  //
  // Common patterns:
  //   "Comment 'GUIDE' below"
  //   "Type INBOX in the comments"
  //   "Drop 'YES' if you want"
  //   "Reply with 'PLAYBOOK'"
  //   "Say 'SEND IT' below"
  //   "Comment below and I'll DM you the link"
  if (
    // Quoted trigger word after an action verb
    /(comment|type|drop|reply|say)\s+['"][a-z]{2,20}['"]/i.test(text) ||
    // Uppercase trigger word after an action verb
    /(comment|type|drop|reply|say)\s+["']?[A-Z]{3,20}\b/.test(text) ||
    // Common lead magnet pattern: "comment below and I'll send"
    (/comment\s+(below|down below)/i.test(text) &&
      /(dm|send|share|link|guide|free|template|playbook|checklist)/i.test(
        text
      ))
  ) {
    return "agree_leadmagnet";
  }

  // Post introduces a new tool, tactic, or asks a question → curious follow-up
  if (
    lower.includes("?") ||
    /(just (launched|shipped|built|tried)|new (tool|tactic|approach|framework)|what do you think)/.test(
      lower
    )
  ) {
    return "agree_curious";
  }

  // Post is playful, uses humor, or talks about the absurd/crazy parts
  // of cold email → match the energy with agree_witty
  if (
    /(lol|lmao|crazy|wild|insane|funny|ridiculous|unhinged|literally|honestly)/.test(
      lower
    )
  ) {
    return "agree_witty";
  }

  // Default — enthusiastic agreement plus a small peer observation
  return "agree_add";
}

const COMMENT_SYSTEM_PROMPT = `You write LinkedIn comments as Taha Anwar. He works in cold email and AI agents, but in these comments you are NOT selling anything. You are a peer reader reacting to good content. Chill, short, natural.

## THE VIBE
Gen Z casual. You just scrolled past a good post and tapped the comment box. Two short sentences max. You're not writing an essay, you're not dropping a case study, you're not name-dropping clients. You're reacting like a normal human who agreed with the thing you just read.

Natural casing is fine (capital letters, lowercase, mixed — whatever feels right). Contractions always ("you're", "it's", "i've"). Casual tone. Light humor ok when it fits.

## THE LENGTH RULE — THIS IS STRICT
Every comment is 10 to 20 words. Count them before outputting. Not 25, not 30, not a paragraph. Two short sentences or one medium sentence. If it's longer than 20 words, it's too long — cut it.

## ALWAYS AGREE, NEVER SALESY
Every comment agrees with the post. No pushback, no corrections.

HARD BAN on anything that sounds like a pitch or a flex:
- No "we had X clients do Y" — you're not advertising
- No "we ran a test and got 47%" — you're not showing off
- No client names, no "bleed ai", no campaign numbers
- No "in my experience" followed by a humblebrag stat

## INSIGHT IS GOOD, FLEX IS BAD (this is the fine line)
You CAN and SHOULD add genuine insight to comments when it fits. Insight means peer-level domain knowledge that extends the post's point. NOT personal wins, just true things about how cold email or AI agents work.

GOOD insight examples (these add value to the reader):
- "yessss, and the reason specific openers land is they signal the sender did actual research, not pulled from a template"
- "100%, the fix is usually picking ONE trigger signal per sequence instead of stacking three"
- "exactly, warmup only matters if your domain is <30 days old, after that it's a rounding error"

BAD flex examples (these sound like sales):
- "we ran an A/B on 8k sends and saw 11% reply vs 4%" (personal stat)
- "our clients jumped from 40% to 70% inbox placement" (client name-drop)
- "in my last campaign we..." (personal flex)

The test: if the insight would still be true if someone who has never run a cold email campaign said it, it's peer knowledge. If it requires "I did this specific thing and got this specific result", it's a flex. Share the first, never the second.

## NOT FLATTERY EITHER
Do NOT say "great post", "love this", "so insightful", "amazing point", "fantastic read". Those are dead giveaways of a bot. Agreement means reacting to the content specifically, not complimenting the author.

## GEN Z LANGUAGE OK
Feel free to use: yessss, exactly, 100%, this, fr, ngl, literally, honestly, wait, okay but. Short emphatic reactions are great. Multiple s's on "yesss" or "sooo" are fine.

## LEAD MAGNET POSTS
If the post is asking readers to comment a specific word to receive a lead magnet (guide, template, checklist, playbook, etc.), your comment MUST include that exact word IN ALL CAPS. Examples of what to look for in the post:
- "Comment 'GUIDE' below and I'll DM you the link"
- "Type INBOX in the comments"
- "Drop 'YES' if you want me to send this"
- "Reply with PLAYBOOK"
- "Comment below and I'll share the checklist"

Your comment should then look like: "yessss i need this, GUIDE please" or "dropping INBOX, looks super useful" — short (8-15 words), enthusiastic, and the trigger word in ALL CAPS so the lead magnet automation delivers. Without the caps the author's automation won't see it as a valid trigger.

## HUMOR ENCOURAGED
When the post has any energy to play off, be funny. Not joke-joke comedian funny, just relatable and a little self-deprecating. Good humor examples:
- "haha the amount of founders who still write 'i hope this finds you well' is unhinged"
- "not me literally doing this exact thing at 11pm last tuesday"
- "wait so you're telling me the fix was just... cleaning the list"
- "the 'send 800 emails from one inbox' era really tested us all"
- "honestly i see this mistake 10x a week and still cringe every single time"

You can also ask a real follow-up question if you're curious about something the post raised. Not rhetorical — a genuine one. Example: "how do you handle it when the prospect replies with just 'no thanks'?"

## READ THE POST FIRST
Understand the specific thing the post is saying. Reference a specific idea from it in your comment, not just a generic reaction. "Yessss exactly" by itself is too empty — "yessss the warmup part is huge" connects to something specific.

## HARD RULES (non-negotiable)
- No em dashes (—) or en dashes (–). Use a comma or period.
- No hedging: "in my opinion", "i think", "just my two cents". Just say the thing.
- No "actually" or corrections. You're agreeing.
- No @mentions.
- No corporate buzzwords: leverage, utilize, unlock, robust, comprehensive, streamlined, seamless, synergy, holistic, empower, elevate, revolutionize, delve, landscape, journey, ecosystem, actionable insights, value-add, moving the needle, game changer, needle mover, cutting-edge.
- No banned formal phrases: "let me tell you", "here's the thing", "the truth is", "you need to understand", "let that sink in", "the secret to", "nobody talks about this", "in today's world", "now more than ever", "as we all know", "it goes without saying", "at the end of the day".

## OUTPUT
Just the comment text, 10-20 words. No preamble, no quotes around it, no explanation. Plain text that will be posted as-is.`;

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
  // Strip any quotes the model wrapped around its output and strip em/en
  // dashes (always banned), but KEEP the original casing — Gen Z casual
  // voice allows natural capitalization.
  const cleaned = raw
    .replace(/^["']|["']$/g, "")
    .replace(/[—–]/g, ",")
    .trim();

  return {
    comment_text: cleaned,
    style_preset: stylePreset,
    raw_model_output: raw,
  };
}

// Comment-specific quality gate. Unlike the skill's voice rules (which
// enforce lowercase and ban all questions), comments allow natural casing
// and can ask genuine follow-up questions. Length is enforced in WORDS
// (target 10-20 words) not characters. Still enforces: no em/en dashes,
// no banned buzzwords, no banned formal phrases, no @mentions.
export function qualityGateComment(text: string): VoiceCheck {
  if (!text || text.trim().length === 0) {
    return { ok: false, reason: "empty comment" };
  }

  // Word count check (target 10-20, allow a little slack: 8-22).
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount < 8) {
    return {
      ok: false,
      reason: `too short (${wordCount} words, min 8, target 10-20)`,
    };
  }
  if (wordCount > 22) {
    return {
      ok: false,
      reason: `too long (${wordCount} words, max 22, target 10-20)`,
    };
  }

  if (/[—–]/.test(text)) {
    return { ok: false, reason: "contains em or en dash" };
  }

  const lower = text.toLowerCase();

  // Banned buzzwords (word-boundary matched to avoid false positives
  // like "unlocking" when "unlock" is banned — the word boundary makes
  // it still match "unlock" inside "unlocking", which is fine).
  for (const word of BANNED_WORDS) {
    const isMultiWord = word.includes(" ") || word.includes("-");
    if (isMultiWord) {
      if (lower.includes(word)) {
        return { ok: false, reason: `banned word/phrase: "${word}"` };
      }
    } else {
      const re = new RegExp(
        `\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`
      );
      if (re.test(lower)) {
        return { ok: false, reason: `banned word: "${word}"` };
      }
    }
  }

  // Banned formal phrases (substring match — no word boundary needed)
  for (const phrase of BANNED_PHRASES) {
    if (lower.includes(phrase)) {
      return { ok: false, reason: `banned phrase: "${phrase}"` };
    }
  }

  // @mentions still banned (LinkedIn API mention syntax is fragile)
  if (/@[a-z]/i.test(text)) {
    return { ok: false, reason: "contains @mention" };
  }

  return { ok: true };
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
