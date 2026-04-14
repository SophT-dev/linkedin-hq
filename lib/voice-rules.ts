// Machine-readable mirror of Taha's voice rules. The human-readable source
// of truth lives in .claude/skills/linkedin-batch/SKILL.md under "Voice Rules".
// If either changes, update both — the skill is what generates content,
// this file is what verifies content already generated (quality gates).

export const BANNED_WORDS: string[] = [
  "quiet",
  "quietly",
  "breaks",
  "leverage",
  "utilize",
  "unlock",
  "robust",
  "comprehensive",
  "streamlined",
  "tailored",
  "cutting-edge",
  "ensure",
  "maximize",
  "noise",
  "crucial",
  "vital",
  "essential",
  "pivotal",
  "seamless",
  "empower",
  "elevate",
  "revolutionize",
  "harness",
  "foster",
  "delve",
  "realm",
  "synergy",
  "holistic",
  "bandwidth",
  "navigate",
  "dive",
  "explore",
  "landscape",
  "journey",
  "ecosystem",
  "transform",
  "10x",
  "game changer",
  "level up",
  "needle mover",
  "low-hanging fruit",
  "actionable insights",
  "value-add",
  "circle back",
  "moving the needle",
];

export const BANNED_PHRASES: string[] = [
  "let me tell you",
  "here's the thing",
  "the truth is",
  "you need to understand",
  "i'll be honest",
  "let that sink in",
  "the secret to",
  "nobody talks about this",
  "this changed everything",
  "in today's world",
  "in this day and age",
  "now more than ever",
  "as we all know",
  "it goes without saying",
  "at the end of the day",
  "when push comes to shove",
];

const EM_DASH_REGEX = /[—–]/;

// Lowercases everything, strips em/en dashes (replaced with commas).
// This is the same sanitizer the linkedin-batch skill applies before output.
export function lowerSanitize(text: string): string {
  return (text || "")
    .toLowerCase()
    .replace(/—/g, ",")
    .replace(/–/g, ",");
}

export interface VoiceCheck {
  ok: boolean;
  reason?: string;
}

// Runs the full voice rule gate on a piece of text. Returns ok=false with
// a specific reason on the first violation so the caller can log + skip.
//
// Checks (in order, fail fast):
//   1. lowercase only (no uppercase letters)
//   2. no em or en dashes
//   3. no banned words (substring match, word-boundary aware where possible)
//   4. no banned phrases (substring match)
//   5. no rhetorical questions (any "?" character)
//   6. no @mentions (@ followed by a letter)
export function checkVoiceCompliance(text: string): VoiceCheck {
  if (!text || text.trim().length === 0) {
    return { ok: false, reason: "empty text" };
  }

  if (/[A-Z]/.test(text)) {
    return { ok: false, reason: "contains uppercase letters" };
  }

  if (EM_DASH_REGEX.test(text)) {
    return { ok: false, reason: "contains em or en dash" };
  }

  const lower = text.toLowerCase();

  for (const word of BANNED_WORDS) {
    // Word boundary check for single-word entries; substring for multi-word.
    const isMultiWord = word.includes(" ") || word.includes("-");
    if (isMultiWord) {
      if (lower.includes(word)) {
        return { ok: false, reason: `banned word/phrase: "${word}"` };
      }
    } else {
      const re = new RegExp(`\\b${escapeRegex(word)}\\b`);
      if (re.test(lower)) {
        return { ok: false, reason: `banned word: "${word}"` };
      }
    }
  }

  for (const phrase of BANNED_PHRASES) {
    if (lower.includes(phrase)) {
      return { ok: false, reason: `banned phrase: "${phrase}"` };
    }
  }

  if (text.includes("?")) {
    return { ok: false, reason: "contains a question (rhetorical questions banned)" };
  }

  if (/@[a-z]/i.test(text)) {
    return { ok: false, reason: "contains @mention (LinkedIn API mention syntax is fragile)" };
  }

  return { ok: true };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
