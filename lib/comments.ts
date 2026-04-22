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
      "write a genuinely funny, sharp reaction in 1-20 words. this is the humor slot — do NOT play it safe. the energy is 'the one funny friend at the table who finally says the real thing'. you have TWO techniques available. pick whichever fits the post best:\n\n1. **COUNTER-INTUITIVE FLIP** — state a sharp observation the post author didn't make, often by flipping the obvious reading. examples: 'the most engaged audience on linkedin right now might be people trying to get free PDFs', 'cold email stopped being a numbers game the second everyone started using the same tool'.\n\n2. **SHARP AGREEMENT WITH A TWIST** — agree with the post but add a surprising angle the author didn't think of. keep it grounded and literal, no metaphors.\n\nCRITICAL NO-MIRRORING RULES (these apply to every witty comment):\n- do NOT copy any 4-or-more-word span verbatim from the post. ever.\n- do NOT mirror the post's sentence structure. if the post says \"nobody is X-ing Y\", your comment can't say \"nobody is A-ing B\".\n- the joke must originate OUTSIDE the post. reference a completely different domain (costco, flossing, waiter) or a sharp observation the author didn't make. NEVER a remix of what they said.\n- specificity beats cleverness. a concrete comparison or sharp observation > any abstract quip.\n- if you can't be original within 1-20 words, GO SHORTER. 'spot on!' beats a mirrored 20-word joke.\n\nNO client stories, NO 'we ran a test', NO flexes, NO self-deprecation, NO dad-jokes, NO puns, NO 'lol so relatable'. NEVER trash any tool, company, or person, even as a joke. pure observational comedy via an unexpected angle, agreement implicit, always positive energy.",
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

  // Post is playful, uses humor, or talks about the absurd parts of
  // cold email, OR contains a story/hot-take/opinion → witty agreement.
  // Broadened from the original narrow "lol|lmao|wild" list so humor
  // gets picked more often. Cold email posts are often ranty, opinionated,
  // or slightly absurd — all fertile ground for a witty reaction.
  if (
    /(lol|lmao|crazy|wild|insane|funny|ridiculous|unhinged|literally|honestly|nobody|everyone|stop|still|actually|worst|best|worst thing|mistake|hot take|unpopular|hate when|love when|obsessed|obvious|broken|plot twist|genuinely|weirdly)/.test(
      lower
    )
  ) {
    return "agree_witty";
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

  // Default — enthusiastic agreement plus a small peer observation.
  // Witty has priority over add because human comments lean playful;
  // the insight slot (add) is the fallback when nothing else fits.
  return "agree_add";
}

const COMMENT_SYSTEM_PROMPT = `You write LinkedIn comments as Taha Anwar. He works in cold email and AI agents, but in these comments you are NOT selling anything. You are a peer reader reacting to good content. Chill, short, natural.

## THE VIBE
You just scrolled past a good post and tapped the comment box. You're reacting like a normal human. Sometimes that means a two-word reaction. Sometimes it means a full sentence with a real insight. Let the post dictate.

Natural casing (mixed case, lowercase, caps — whatever feels right). Contractions always ("you're", "it's", "i've"). Casual tone. Light humor when it fits. Exclamation marks fine.

## THE LENGTH RULE
1 to 20 words. That's the whole range. Some posts deserve a "Cool" or "spot on!" and nothing more. Others deserve a real domain insight. NEVER go over 20 words. If you find yourself writing two full sentences, cut one.

## NO MIRRORING — the most important rule
Never parrot the post. Never copy phrases from it. Never mirror its sentence shape. Your comment must come from YOUR angle, not a remix of theirs.

Concrete rules:
- No 4-or-more-word span from the post may appear in your comment verbatim.
- No echoing the post's sentence shape. If the post says "nobody is commenting on X", you can't say "nobody is replying to Y".
- The angle of your comment must originate OUTSIDE the post. Your own observation, an unrelated domain comparison, a sharper observation the author didn't make. Never a rewording of what they said.
- Specificity beats cleverness. Concrete numbers / scenarios / domain comparisons > abstract quips.
- If you can't be original within 1-20 words, GO SHORTER. "spot on!" beats a mirrored 20-word joke.

BAD example (the bot-like pattern we're fixing):
- Post says: "nobody is commenting on '5 tips for better marketing.'"
- BAD comment: "nobody is commenting on '5 tips for better marketing' but they WILL type a word for a PDF"
- Why it's bad: copies 7 words verbatim, mirrors sentence shape, adds a cheap punchline. Reads as automated.

GOOD example (same post, outside angle):
- GOOD comment: "comment bait is just linkedin's version of a costco sample table"
- Why it works: completely different angle, zero verbatim copy, comparison from outside the post's world.

## WHAT GOOD LOOKS LIKE (these are Taha's actual voice)
These are real examples. Match this energy:

- "the villa energy is wild (or should i say, reunion?)"
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

## EMOJIS — TWO KINDS, DIFFERENT RULES
There are two separate emoji lists, and they follow different rules.

### Decorative emojis (strict — only in allowed slots)
The ONLY decorative emojis you can use are these four:
- 👑 (crown) — for a power move, dominance, clear #1
- 👏 (clapping) — for a clean breakdown, well-made point
- 🚀 (rocket) — for launches, fast growth, scaling
- 👍 (thumbs up) — simple agreement

Rules:
- Use them SOMETIMES, not every comment. Most comments have zero decorative emojis.
- Only when GENUINELY EARNED by the post content. Never force one.
- Only when the user-prompt directive says this slot is allowed to use one — otherwise none.
- NEVER use any other decorative emoji. No 🙌, no 💯, no 🔥, no ✨, no 🐐, no hearts, no faces.

### Joke-marker emoji (rare, for humor safety only)
The 😂 (laughing face) is a joke marker, not a decoration. It exists as a safety net: if a deadpan wild claim could be mistaken for a real take, 😂 signals "i'm joking". Almost every witty comment should NOT end in 😂 — let the joke land on its own.

Rules:
- 😂 is allowed in any comment but should be RARE. Default is NO 😂.
- Only use it when a reader might genuinely mistake the comment for a serious claim and you need the safety signal. If the joke is clearly a joke, skip it.
- Do NOT use 😂 as a "this is supposed to be funny" crutch. If the comment needs 😂 to read as funny, the comment isn't funny — rewrite it.
- Do NOT use any other laughing/face emoji (no 🤣, 😅, 😆, 🙃 — only 😂).

## ALWAYS POSITIVE — no negativity toward tools, people, or companies
NEVER throw any tool, platform, company, or person under the bus. No shade, no snark about competitors, no "X tool is bad", no "Y is overrated". Even if the post itself is criticizing something, your comment stays positive and constructive.

BAD examples (never write these):
- "clay just became the google docs of outbound, something to have open and never actually use"
- "lemlist fell off hard since the update"
- "honestly apollo is overpriced for what it does"

GOOD approach: if the post discusses a tool or approach, comment on the positive side, the insight, or the lesson. Keep it lighthearted and supportive. You can be witty WITHOUT putting anything or anyone down.

## ANSWERING QUESTIONS
If the post ends with a question (e.g. "what's your take?", "how do you handle X?", "agree or disagree?"), answer it GENERALLY in your comment. Give a brief, genuine answer that adds value but don't get too specific with numbers or details. Keep it casual and conversational.

## NO METAPHORS OR ANALOGIES
Never use "X is the Y of Z" comparisons, similes, or metaphorical language. Keep it literal and grounded. Say what you mean directly.

BAD (never write these):
- "open rates are the astrology of cold email"
- "giving an AI a credit card is just adopting a golden retriever who shops online"
- "comment bait is just linkedin's version of a costco sample table"

GOOD: just state the observation directly without comparing it to something else.

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
// sanitizes (dash strip, optional emoji strip), returns. Caller is expected
// to run qualityGateComment on the result before saving.
//
// allowEmoji: controls whether this slot is one of the ~1-in-4 slots where
// emojis are permitted. When false, any emoji (even whitelisted ones) is
// stripped from the output and the prompt explicitly forbids them — this
// keeps the batch from being emoji-soup and matches how humans actually
// write (most comments have zero emojis).
export async function generateExpertComment(
  post: CandidatePost,
  opts: { allowEmoji?: boolean } = {}
): Promise<GeneratedComment> {
  const allowEmoji = opts.allowEmoji ?? false;
  const stylePreset = pickStylePreset(post.text);
  const preset = STYLE_PRESETS[stylePreset];

  const emojiDirective = allowEmoji
    ? "This slot IS allowed to use ONE decorative emoji from the whitelist (👑 👏 🚀 👍) if it's genuinely earned by the post content. Skip the emoji if nothing fits. Separately: 😂 is allowed but should be RARE — only use it as a safety signal if a deadpan absurd claim might otherwise read as serious. Default is no 😂."
    : "DO NOT use any decorative emoji in this comment (no 👑 👏 🚀 👍). 😂 is allowed but only as a rare safety signal for deadpan absurd claims that might otherwise read as serious — default to NO 😂 and let the joke land on its own.";

  const userPrompt = `LinkedIn post by ${post.creator_name}:

"""
${post.text.slice(0, 3000)}
"""

Style for this comment: ${preset.instruction}

${emojiDirective}

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
  // Strip surrounding quotes and em/en dashes (always banned). When this
  // slot isn't an emoji slot, also strip every emoji the model may have
  // slipped in — a hard guarantee that the 1-in-4 ratio holds.
  let cleaned = raw
    .replace(/^["']|["']$/g, "")
    .replace(/[—–]/g, ",")
    .trim();

  if (!allowEmoji) {
    // Strip decorative emojis that slipped in, but KEEP joke-marker
    // emojis (😂) — those are exempt from the 1-in-4 ratio because they
    // function as "i'm joking" signals, not decoration.
    cleaned = cleaned
      .replace(EMOJI_REGEX, (match) =>
        JOKE_MARKER_EMOJIS.has(match) ? match : ""
      )
      .replace(/\s+/g, " ")
      .trim();
  }

  return {
    comment_text: cleaned,
    style_preset: stylePreset,
    raw_model_output: raw,
  };
}

// Decorative emojis in auto-generated comments. Subject to the 1-in-4
// slot ratio enforced by /api/comments/plan. Anything outside this list
// (and outside the joke-marker list below) fails the quality gate.
const ALLOWED_EMOJIS = new Set(["👑", "👏", "🚀", "👍"]);

// Joke-marker emojis — always allowed, in ANY slot, regardless of the
// 1-in-4 emoji ratio. These exist so the matter-of-fact-absurdity humor
// technique can signal "i'm joking" without risking the reader thinking
// the wild claim is a serious take. Only the laughing face for now.
const JOKE_MARKER_EMOJIS = new Set(["😂"]);

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

  // Emoji whitelist check — any emoji-range character that isn't in
  // the decorative whitelist OR the joke-marker whitelist fails the gate.
  const emojiMatches = text.match(EMOJI_REGEX) || [];
  for (const e of emojiMatches) {
    if (!ALLOWED_EMOJIS.has(e) && !JOKE_MARKER_EMOJIS.has(e)) {
      return {
        ok: false,
        reason: `emoji "${e}" not in whitelist (allowed: 👑 👏 🚀 👍 😂)`,
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
