// Shared AI client for linkedin-hq. Switched from OpenAI to a free-tier-first
// stack 2026-07-06 (Sophiya: don't want to run this on any metered key at all
// if a free option exists).
//
// Primary: Gemini's free tier. Generous for this app's volume (1,500 grounded
// search requests/day on 2.5 models, 5,000/month on 3.x; a much larger
// non-grounded quota). The project behind GOOGLE_AI_KEY has billing enabled
// (it's also used for paid Nano Banana image gen elsewhere in Bleed AI), so a
// quota trip here COULD turn into a real charge if left alone.
//
// Fallback: Groq. Genuinely free forever — no credit card on file, no paid
// tier at all, just rate limits (30 RPM / ~1,000 RPD per model). So instead of
// ever spilling into Gemini's paid tier, a Gemini quota error (HTTP 429) drops
// straight to Groq, which cannot bill regardless of volume. `groq/compound`
// has real built-in web search (via Tavily, server-side), so this is a
// genuine fallback for the search-backed calls too — not a fabricated one.
import { GoogleGenAI, ApiError as GeminiApiError } from "@google/genai";
import Groq from "groq-sdk";

const GEMINI_TEXT_MODEL = "gemini-2.5-flash";
const GEMINI_SEARCH_MODEL = "gemini-2.5-flash";
const GROQ_TEXT_MODEL = "llama-3.3-70b-versatile";
const GROQ_SEARCH_MODEL = "groq/compound";

function getGemini() {
  return new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_KEY });
}
function getGroq() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

// Only treat a real quota/rate-limit response (429) as "fall back to Groq".
// Any other error (bad request, auth, etc.) should surface normally — masking
// it as a silent fallback would hide real bugs.
function isQuotaError(err: unknown): boolean {
  return err instanceof GeminiApiError && err.status === 429;
}

export interface AiResult {
  text: string;
  provider: "gemini" | "groq";
  // Set only when Groq was used because Gemini's free quota was hit — the
  // callers below fold this into their existing debug/error reporting so
  // Sophiya can see it happened instead of it being invisible.
  fallbackReason?: string;
}

// Plain text generation, no search. Used for comments, hooks, ideas, briefs,
// the daily report.
export async function generateText(
  prompt: string,
  systemPrompt?: string
): Promise<AiResult> {
  try {
    const res = await getGemini().models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
      ...(systemPrompt ? { config: { systemInstruction: systemPrompt } } : {}),
    });
    return { text: res.text ?? "", provider: "gemini" };
  } catch (err) {
    if (!isQuotaError(err)) throw err;
    const messages: Array<{ role: "system" | "user"; content: string }> = systemPrompt
      ? [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ]
      : [{ role: "user", content: prompt }];
    const res = await getGroq().chat.completions.create({
      model: GROQ_TEXT_MODEL,
      messages,
    });
    return {
      text: res.choices[0]?.message?.content ?? "",
      provider: "groq",
      fallbackReason: `Gemini free-tier quota hit (429) — used Groq's free tier instead`,
    };
  }
}

// Multi-turn chat (strategyChat). Gemini uses "model" for the assistant role
// instead of "assistant"; Groq (OpenAI-compatible) uses "assistant" as-is.
export async function generateChat(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  systemPrompt?: string
): Promise<AiResult> {
  try {
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    const res = await getGemini().models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents,
      ...(systemPrompt ? { config: { systemInstruction: systemPrompt } } : {}),
    });
    return { text: res.text ?? "", provider: "gemini" };
  } catch (err) {
    if (!isQuotaError(err)) throw err;
    const groqMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
      ...messages,
    ];
    const res = await getGroq().chat.completions.create({
      model: GROQ_TEXT_MODEL,
      messages: groqMessages,
    });
    return {
      text: res.choices[0]?.message?.content ?? "",
      provider: "groq",
      fallbackReason: `Gemini free-tier quota hit (429) — used Groq's free tier instead`,
    };
  }
}

// Web-search-backed generation, for the newsfeed's news scout. Gemini's
// google_search grounding first; Groq's compound model (real, server-side
// Tavily search) on quota trip — not a plain-text guess dressed up as search.
export async function generateTextWithSearch(prompt: string): Promise<AiResult> {
  try {
    const res = await getGemini().models.generateContent({
      model: GEMINI_SEARCH_MODEL,
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] },
    });
    return { text: res.text ?? "", provider: "gemini" };
  } catch (err) {
    if (!isQuotaError(err)) throw err;
    const res = await getGroq().chat.completions.create({
      model: GROQ_SEARCH_MODEL,
      messages: [{ role: "user", content: prompt }],
    });
    return {
      text: res.choices[0]?.message?.content ?? "",
      provider: "groq",
      fallbackReason: `Gemini free-tier quota hit (429) — used Groq's compound (web search) model instead`,
    };
  }
}
