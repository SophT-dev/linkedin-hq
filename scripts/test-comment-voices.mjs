// One-off test harness (2026-07-11) — REVIEW the comments the bot generates.
//
// Purpose: Sophiya wants to see real generated comments on real posts before
// flipping the auto-comment bot on, and she wants them to read like Michel
// Lieben's comments (opinionated, expert, educational, insightful, zero
// negativity). This script generates, per real post, TWO comments side by side:
//
//   Column A — CURRENT BOT (Taha peer-reaction voice, live production path):
//     hits the deployed /api/comments/suggest and takes the heuristic-primary
//     suggestion. This is genuinely what the bot posts today.
//
//   Column B — MICHEL-STYLE EXPERT (proposal): a new prompt tuned to the voice
//     Sophiya described. Generated locally via Gemini (same provider lib/ai.ts
//     uses). NOT yet wired into the app — this is the candidate retune we're
//     reviewing.
//
// Output: a markdown review doc she can read top to bottom and mark up.
//
// Run:  node scripts/test-comment-voices.mjs
// Re-run after tweaking MICHEL_SYSTEM_PROMPT below to iterate on voice.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..");
const CORPUS = path.resolve(
  REPO,
  "..",
  "campaign-master",
  "knowledge-base",
  "learning-center"
);

// ---- env (.env.local) -----------------------------------------------------
function loadEnv() {
  const raw = readFileSync(path.join(REPO, ".env.local"), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}
loadEnv();

const SUGGEST_URL = "https://linkedin-hq.vercel.app/api/comments/suggest";
const SUGGEST_TOKEN =
  process.env.SUGGEST_TOKEN ||
  "3088768ac5a002b7e72a6955a52fa07c1d5704addc143516";

// ---- the candidate voice prompt (this is what we're tuning) ---------------
// Reads Sophiya's real voice doc live (same as lib/comments.ts's Sophiya
// generator) so tuning that doc changes behavior without touching this script.
const COMMENT_VOICE_DOC = readFileSync(
  path.join(REPO, "playbook", "voice.md"),
  "utf8"
);

const MICHEL_SYSTEM_PROMPT = `You write ONE LinkedIn comment. You just read a post from someone in cold email, outbound, or AI agents, and you want to add a comment that actually teaches the reader something real.

Your voice blends two things:
1) Michel Lieben's comment style: expert, has a real opinion, educational, always positive, never negative or dismissive. You build on the post with a real angle or a simple reason it didn't spell out.
2) Sophiya's real voice, profiled below. Follow it exactly, including which filler to strip and which to keep.

===== SOPHIYA VOICE PROFILE =====
${COMMENT_VOICE_DOC}
===== END VOICE PROFILE =====

## SOUND ALIVE, NOT LIKE A SUMMARY (the most important rule)
You are a real person who just read this and actually HAD a reaction. You have a take. You feel something about it. Write like you're texting a smart friend who gets this world. Simple words, but full of life and a real point of view.

The number one thing to avoid: sounding like a flat summary or a textbook. Dead comments line up facts with no pulse. Alive comments have a reaction, a strong opinion, and a natural rhythm.

DEAD (never write like this, this is the exact problem):
- "This works because you make your value the firm part. Buyers see you believe in it. That stops the discount ask."
- "The big difference is how much work it feels like. An audit means homework. A Loom is quick info they can watch."

ALIVE (write like this instead):
- "This is such a power move. The second you start explaining your price, you've already lost. Sitting in that silence makes them argue their way back to yes."
- "Nobody says yes to a 'free audit' anymore, we all know a pitch is coming right after. But a quick Loom? That feels like a gift, not a trap. Tiny change, way more replies."

Same simple words. The alive ones just have a real opinion, a little emotion, and they flow like a person talking.

## THE VOICE
- Plain, everyday words. No jargon, nothing fancy. Sound like a smart friend, not a consultant. (Never these fancy words: perceived, high-commitment, mechanism, optimize, facilitate, infrastructure, differentiator, leverage. Say the plain version.)
- But NOT choppy or robotic. Let it breathe. Mix short lines with a slightly longer one. Read it out loud in your head, it should sound like a person, not a list.
- Have a real opinion and say it with conviction. React. It is good to sound like you actually care about this.
- A genuine reaction to what they SAID is great ("this is such a power move", "wild how fast this changed"). Generic praise about the post as a thing is not ("great post", "so true", "so insightful"). React to the content, with feeling.
- Teach something real, but through your take, not a lecture. One concrete point, felt, not explained flatly.
- Positive and kind. Never put down any tool, person, or company, even if the post does.

## LENGTH — KEEP IT TO 2 LINES MAX
Two short sentences at most. Roughly 12 to 28 words total. React and land ONE point, then stop. Never a third sentence. Never a wall of text. Short and punchy beats complete.

## IF THE POST IS TOO THIN
If the post is just a link, a bare one-liner, or has no real idea to build on, you cannot add real value. Then output ONLY this one word: SKIP

## HARD RULES
- No em dashes or en dashes. Use commas or periods.
- No @mentions.
- No markdown. No asterisks, no underscores for emphasis. Plain text only.
- No made-up numbers, no invented client wins.
- No corporate buzzwords: leverage, utilize, unlock, robust, comprehensive, streamlined, seamless, synergy, holistic, empower, elevate, revolutionize, delve, landscape, journey, ecosystem, actionable insights, value-add, moving the needle, game changer, needle mover, cutting-edge.
- Do NOT start the comment with "Honestly" or "Probably". They are part of her voice, but only as rare mid-sentence emphasis, never a habit and never the first word. Most comments should use neither. Drop all other filler ("sort of", "kind of", "basically", "I think" used as a hedge).

## OUTPUT
Just the comment text, or the single word SKIP. No quotes, no preamble, no explanation.`;

// Three distinct JOBS for the 3 suggestions, so each is a genuinely different
// kind of comment, not three rewordings. All still in the one new alive voice.
const MODE_DIRECTIVES = {
  educational:
    "\n\n## THIS SUGGESTION'S JOB: EDUCATIONAL\nBe the expert in the room. Teach ONE real, concrete thing that builds on the post, the kind of line another practitioner would screenshot. Opinionated and expert, but still alive and plain-spoken, never a dry lecture.",
  witty:
    "\n\n## THIS SUGGESTION'S JOB: WITTY / FUNNY / RELATABLE\nBe genuinely funny and relatable here, the friend at the table who finally says the thing everyone is thinking. Light, warm humor or a knowing nod. It should make the author smile. NEVER mean, never put down any tool, person, or company, even as a joke. No forced puns, no metaphors (no 'X is the Y of Z'). If nothing funny truly fits, go relatable instead of forcing a joke.",
  question:
    "\n\n## THIS SUGGESTION'S JOB: COMPLIMENT + A REAL QUESTION\nStart with a genuine, SPECIFIC compliment about something they actually said, point to the exact part you liked, not a generic 'great post'. Then ask ONE real clarifying question you'd honestly want them to answer. Warm and curious.",
};

// ---- Gemini call (mirrors lib/ai.ts generateText, gemini-2.5-flash) -------
async function genMichel(postText, creatorName, mode) {
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_KEY });
  const modeDirective = mode ? MODE_DIRECTIVES[mode] || "" : "";
  const userPrompt = `LinkedIn post by ${creatorName}:

"""
${postText.slice(0, 3000)}
"""
${modeDirective}

Write the comment now. 15-40 words. No quotes around it, no preamble.`;
  const res = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: userPrompt,
    config: { systemInstruction: MICHEL_SYSTEM_PROMPT },
  });
  let out = (res.text ?? "")
    .replace(/^["']|["']$/g, "")
    .replace(/[—–]/g, ",")
    .replace(/[*_`]/g, "") // strip markdown emphasis so it posts clean
    .trim();
  if (/^skip\.?$/i.test(out)) return "SKIP";
  return out;
}

// ---- current bot (live production suggest endpoint) -----------------------
async function genCurrentBot(postText, creatorName) {
  const res = await fetch(SUGGEST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-suggest-token": SUGGEST_TOKEN,
    },
    body: JSON.stringify({ postText, creatorName }),
  });
  if (!res.ok) return { primary: `(endpoint ${res.status})`, all: [] };
  const json = await res.json();
  const all = (json.suggestions || []).map((s) => `${s.text}  _(${s.style})_`);
  return { primary: json.suggestions?.[0]?.text || "(none passed the gate)", all };
}

// ---- pick a diverse set of real posts -------------------------------------
const CREATORS = [
  "josh-braun",
  "nick-abraham",
  "aidan-collins",
  "eric-nowoslawski",
  "richard-illingworth",
  "kenny-damian",
  "michel-lieben",
  "charles-tenot",
];

function loadPosts(creator) {
  try {
    const d = JSON.parse(
      readFileSync(path.join(CORPUS, creator, "linkedin", "posts.json"), "utf8")
    );
    return Array.isArray(d) ? d : d.posts || d.data || [];
  } catch {
    return [];
  }
}

function eng(p) {
  const e = p.engagement || {};
  return (e.likes || e.reactions || p.reactions || 0) + (e.comments || 0) * 3;
}

function isLeadMagnet(t) {
  return /(comment|type|drop|reply|say)\s+["']?[a-z]{2,20}/i.test(t) &&
    /(dm|send|link|guide|template|playbook|checklist|free)/i.test(t);
}

function selectPosts() {
  const chosen = [];
  let gotLeadMagnet = false;
  for (const c of CREATORS) {
    const posts = loadPosts(c)
      .map((p) => ({ creator: c, text: (p.content || "").trim() }))
      .filter((p) => p.text.length >= 140 && p.text.length <= 900);
    posts.sort((a, b) => eng(b) - eng(a));
    // take this creator's top post
    if (posts[0]) chosen.push(posts[0]);
    // try to guarantee at least one lead-magnet-style post in the set
    if (!gotLeadMagnet) {
      const lm = posts.find((p) => isLeadMagnet(p.text));
      if (lm) {
        chosen.push(lm);
        gotLeadMagnet = true;
      }
    }
  }
  // dedup by first 60 chars, cap at 9
  const seen = new Set();
  const out = [];
  for (const p of chosen) {
    const k = p.text.slice(0, 60);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
    if (out.length === 9) break;
  }
  return out;
}

// ---- run ------------------------------------------------------------------
function nameFromSlug(slug) {
  return slug
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

// Demo mode: show "3 takes, same voice" for a few real posts, printed to
// console. Run with:  node scripts/test-comment-voices.mjs --demo3
async function demoThreeTakes() {
  const posts = selectPosts().slice(0, 3);
  for (const p of posts) {
    const author = nameFromSlug(p.creator);
    const takes = await Promise.all([
      genMichel(p.text, author, "educational"),
      genMichel(p.text, author, "witty"),
      genMichel(p.text, author, "question"),
    ]);
    const labels = ["EDUCATIONAL", "WITTY/FUNNY", "COMPLIMENT+Q"];
    console.log("\n============================================================");
    console.log(`POST — ${author}:`);
    console.log(p.text.slice(0, 320).replace(/\n+/g, " "));
    console.log("\n3 suggestions (same voice, 3 different jobs):");
    takes.forEach((t, i) => console.log(`  [${labels[i]}] ${t}`));
    await new Promise((r) => setTimeout(r, 400));
  }
}

async function main() {
  if (process.argv.includes("--demo3")) {
    await demoThreeTakes();
    return;
  }
  const posts = selectPosts();
  console.log(`Testing ${posts.length} real posts...\n`);

  const lines = [];
  lines.push("# Comment voice test — current bot vs new voice (Michel x Sophiya, plain words)");
  lines.push("");
  lines.push(
    `_Generated ${new Date().toISOString().slice(0, 10)}. ${posts.length} real scraped posts from tracked creators._`
  );
  lines.push("");
  lines.push(
    "**A (current bot)** = what the auto-bot posts today (Taha short peer-reaction voice, live `/api/comments/suggest`)."
  );
  lines.push(
    "**B (new voice)** = expert + educational like Michel, in Sophiya's voice, written at a 4th-grade reading level. `SKIP` = post too thin to add real value. Not yet live — this is the candidate."
  );
  lines.push("");
  lines.push("---");
  lines.push("");

  let i = 0;
  for (const p of posts) {
    i++;
    const author = nameFromSlug(p.creator);
    process.stdout.write(`[${i}/${posts.length}] ${author}... `);
    let bot, michel;
    try {
      [bot, michel] = await Promise.all([
        genCurrentBot(p.text, author),
        genMichel(p.text, author),
      ]);
    } catch (e) {
      console.log(`FAILED: ${e.message}`);
      continue;
    }
    console.log("ok");

    lines.push(`## ${i}. ${author}`);
    lines.push("");
    lines.push("> " + p.text.replace(/\n+/g, "\n> "));
    lines.push("");
    lines.push(`**A — current bot:** ${bot.primary}`);
    if (bot.all.length > 1) {
      lines.push("");
      lines.push(`<sub>all 3 bot options: ${bot.all.join(" · ")}</sub>`);
    }
    lines.push("");
    const bLabel = michel === "SKIP" ? "**B — new voice:** _SKIP (post too thin to add real value)_" : `**B — new voice:** ${michel}`;
    lines.push(bLabel);
    lines.push("");
    lines.push("_Your call:_ ");
    lines.push("");
    lines.push("---");
    lines.push("");

    await new Promise((r) => setTimeout(r, 500));
  }

  const outPath = path.join(REPO, "COMMENT-VOICE-TEST.md");
  writeFileSync(outPath, lines.join("\n"), "utf8");
  console.log(`\nWrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
