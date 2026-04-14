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

// 4 style presets, all agreement-based. The generator picks one based on
// the post content. Target length is 1-20 words per comment — sometimes
// a two-word reaction ("spot on!") is exactly right, sometimes a fuller
// insight fits. Let the post content decide.
export const STYLE_PRESETS: Record<StylePreset, PresetSpec> = {
  agree_add: {
    id: "agree_add",
    instruction:
      "agree with the post and add ONE real insight that extends the point. length: 1-20 words. the insight must be genuine domain knowledge — something true about how cold email or AI agents actually work, the kind of thing another practitioner would read and nod at. NOT a client story, NOT a 'we had X do Y' stat, NOT a flex. just peer-shared knowledge. examples of the shape (copy the energy, not the content): 'yess, title-to-persona mapping usually falls apart at mid-market, where roles blur constantly so its tough to pinpoint', 'We do something similar as well! Always play to the advantages of the situation, local outreach definitely has its unique benefits', '100%, the real fix is usually one trigger signal instead of three'. the insight must be backed by how the space actually works, never invented.",
  },
  agree_witty: {
    id: "agree_witty",
    instruction:
      "react with a short, playful, observational line — 1-20 words. the energy is 'scrolled past a funny post and typed the first real thing that came to mind'. examples of the shape: 'the goats in one room 🐐 (or should i say, villa?)', 'Cool', 'sounds neat'. you can use one of the allowed emojis IF it's genuinely earned by the post content (crown 👑 for a power move or dominance, goat 🐐 for elite/best-in-class, clapping 👏 for a clean breakdown, rocket 🚀 for launches/fast growth, thumbs up 👍 for simple agreement). NEVER force an emoji. if nothing about the post fits an emoji, skip it. the humor should be SPECIFIC to the post if it's more than a one-word reaction. NO dad-jokes, NO puns, NO forced punchlines.",
  },
  agree_curious: {
    id: "agree_curious",
    instruction:
      "agree briefly and, if it fits, ask ONE short genuine follow-up question. length: 1-20 words total. not rhetorical, not a gotcha. a real question you'd want the author to answer. if no natural question exists, just write a short affirming reaction like 'spot on!' or 'sounds neat' instead. don't force a question.",
  },
  agree_leadmagnet: {
    id: "agree_leadmagnet",
    instruction:
      "this post is offering a lead magnet (guide, template, checklist, playbook, etc.) in exchange for commenting a specific trigger word. read the post carefully to find the EXACT word the author asked readers to comment — it's usually after phrases like 'comment', 'type', 'drop', 'reply with', or 'say', and often in quotes or caps. include that exact word IN ALL CAPS inside your comment so the lead magnet automation sends it to Taha. keep the comment SHORT: 3-15 words, casual. the trigger word MUST appear in ALL CAPS in your output. examples of the shape (not the content, copy the energy): 'yess i need this, GUIDE please', 'dropping INBOX, looks useful', 'sounds neat, TEMPLATE'. if you can't find the exact trigger word, write the comment using a guessed common word like GUIDE but always IN CAPS.",
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
You just scrolled past a good post and tapped the comment box. You're reacting like a normal human. Sometimes that means a two-word reaction. Sometimes it means a full sentence with a real insight. Let the post dictate.

Natural casing (mixed case, lowercase, caps — whatever feels right). Contractions always ("you're", "it's", "i've"). Casual tone. Light humor when it fits. Exclamation marks fine.

## THE LENGTH RULE
1 to 20 words. That's the whole range. Some posts deserve a "Cool" or "spot on!" and nothing more. Others deserve a real domain insight. NEVER go over 20 words. If you find yourself writing two full sentences, cut one.

## WHAT GOOD LOOKS LIKE (these are Taha's actual voice)
These are real examples. Match this energy:

- "the goats in one room 🐐 (or should i say, villa?)"
- "Cool"
- "yess, title-to-persona mapping usually falls apart at mid-market, where roles blur constantly so its tough to pinpoint"
- "We do something similar as well! Always play to the advantages of the situation, local outreach definitely has its unique benefits"
- "clear breakdown 👏 very helpful"
- "spot on!"
- "sounds neat"

Notice: wildly different lengths. Some are reactions, some are insights, some have emojis, some are bone-dry. All feel like a human typed them in 5 seconds without overthinking.

## ALWAYS AGREE, NEVER SALESY
Every comment agrees with the post. No pushback, no corrections.

HARD BAN on anything that sounds like a pitch or a flex:
- No "we had X clients do Y"
- No "we ran a test and got 47%"
- No client names, no "bleed ai", no campaign numbers
- No "in my experience" followed by a humblebrag stat

## INSIGHT IS GOOD, FLEX IS BAD (the fine line)
You CAN add genuine insight when it fits. Insight = peer-level domain knowledge that extends the post's point. NOT personal wins, just true things about how cold email or AI agents actually work.

GOOD insight examples:
- "yess, title-to-persona mapping usually falls apart at mid-market, where roles blur constantly so its tough to pinpoint"
- "100%, the fix is usually picking ONE trigger signal per sequence instead of stacking three"

BAD flex examples:
- "we ran an A/B on 8k sends and saw 11% reply vs 4%"
- "our clients jumped from 40% to 70% inbox placement"

Test: if the insight would still be true if a total outsider said it, it's peer knowledge. If it requires "I did X and got Y", it's a flex. Share the first, never the second.

## SHORT REACTIONS ARE FINE, BUT NOT BOT-FLATTERY
Taha will genuinely write "Cool" or "spot on!" or "sounds neat" as a real reaction. Those are allowed and good.

But do NOT write: "great post", "love this", "so insightful", "amazing point", "fantastic read". Those are dead bot-flattery phrases. The difference: "spot on!" reacts to the CONTENT of what the author said. "great post" is praising the post as a thing. Do the first, not the second.

## LEAD MAGNET POSTS
If the post asks readers to comment a specific word to receive a lead magnet (guide, template, checklist, playbook, etc.), your comment MUST include that exact word IN ALL CAPS. Examples of what to look for in the post:
- "Comment 'GEM' below and I'll DM you the prompt"
- "Type INBOX in the comments"
- "Drop 'YES' if you want me to send this"
- "Reply with PLAYBOOK"
- "Comment below and I'll share the checklist"

Your comment should then look like: "yess i need this, GEM please" or "dropping INBOX, looks useful" — short (3-15 words), and the trigger word in ALL CAPS. Without the caps the author's automation won't see it as a valid trigger.

## EMOJIS — ALLOWED LIST, USE SOMETIMES, ONLY WHEN RELEVANT
The ONLY emojis you can use are these five:
- 👑 (crown) — for a power move, dominance, clear #1
- 🐐 (goat) — for elite, best-in-class, the real ones
- 👏 (clapping) — for a clean breakdown, well-made point
- 🚀 (rocket) — for launches, fast growth, scaling
- 👍 (thumbs up) — simple agreement

RULES:
- Use them SOMETIMES, not every comment. Most comments have zero emojis.
- Only when the emoji is GENUINELY EARNED by the post content. Never force one.
- If nothing about the post matches one of these five, use NO emoji.
- NEVER use any other emoji. No 🙌, no 💯, no 🔥, no ✨, no hearts, no faces, NOTHING outside this whitelist. The comment will be rejected if it contains any emoji not on this list.

## HARD RULES (non-negotiable)
- No em dashes (—) or en dashes (–). Use a comma or period.
- No hedging: "in my opinion", "i think", "just my two cents". Just say the thing.
- No "actually" or corrections. You're agreeing.
- No @mentions.
- No corporate buzzwords: leverage, utilize, unlock, robust, comprehensive, streamlined, seamless, synergy, holistic, empower, elevate, revolutionize, delve, landscape, journey, ecosystem, actionable insights, value-add, moving the needle, game changer, needle mover, cutting-edge.
- No banned words: quietly, breaks, quiet. Rephrase around them.
- No banned formal phrases: "let me tell you", "here's the thing", "the truth is", "you need to understand", "let that sink in", "the secret to", "nobody talks about this", "in today's world", "now more than ever", "as we all know", "it goes without saying", "at the end of the day".

## OUTPUT
Just the comment text, 1-20 words. No preamble, no quotes around it, no explanation. Plain text that will be posted as-is.`;

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
${post.text.slice(0, 3000)}
"""

Style for this comment: ${preset.instruction}

Write the comment now. 1-20 words. Natural casing. No quotes around it, no preamble.`;

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

// Allowed emojis in auto-generated comments. Anything outside this list
// fails the quality gate. Taha's voice uses these sparingly and only when
// genuinely earned by the post content.
const ALLOWED_EMOJIS = new Set(["👑", "🐐", "👏", "🚀", "👍"]);

// Regex matching the main emoji unicode blocks. Catches the common blocks
// (misc symbols & pictographs, supplemental, emoticons, transport & map,
// dingbats) which cover the overwhelming majority of emojis seen in the
// wild. Checked against the whitelist; anything matching but not allowed
// fails the gate.
const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;

// Comment-specific quality gate. Unlike the skill's voice rules (which
// enforce lowercase and ban all questions), comments allow natural casing
// and can ask genuine follow-up questions. Length is enforced in WORDS
// (1-20 words, anywhere from "Cool" to a full sentence with an insight).
// Also enforces: no em/en dashes, no banned buzzwords, no banned formal
// phrases, no @mentions, emojis only from the ALLOWED_EMOJIS whitelist.
export function qualityGateComment(text: string): VoiceCheck {
  if (!text || text.trim().length === 0) {
    return { ok: false, reason: "empty comment" };
  }

  // Word count check (1-20 words). Short reactions like "Cool" are
  // deliberately allowed. Hard cap at 20 words — if the model goes over
  // we reject rather than silently truncating.
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount < 1) {
    return { ok: false, reason: "empty comment" };
  }
  if (wordCount > 20) {
    return {
      ok: false,
      reason: `too long (${wordCount} words, max 20)`,
    };
  }

  if (/[—–]/.test(text)) {
    return { ok: false, reason: "contains em or en dash" };
  }

  // Emoji whitelist check — any emoji-range character that isn't in the
  // allowed set fails the gate.
  const emojiMatches = text.match(EMOJI_REGEX) || [];
  for (const e of emojiMatches) {
    if (!ALLOWED_EMOJIS.has(e)) {
      return {
        ok: false,
        reason: `emoji "${e}" not in whitelist (allowed: 👑 🐐 👏 🚀 👍)`,
      };
    }
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
