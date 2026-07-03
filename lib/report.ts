import OpenAI from "openai";
import { IntelRow } from "./sheets";

// Cheap model on purpose — one batched call per day over the day's items.
// Switched from Anthropic to OpenAI 2026-07-03, see lib/claude.ts.
const MODEL = "gpt-5.4-nano";

// Generate a single scannable daily intel report from one day's items.
// Cost control: ONE call/day, inputs truncated to ~400 chars/item. Typically a
// few cents/month total.
export async function generateDailyReport(
  dateLabel: string,
  items: IntelRow[]
): Promise<string> {
  if (!items.length) {
    return `# Daily Report — ${dateLabel}\n\n_No new intel captured for this day._`;
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const lines = items
    .map(
      (it, i) =>
        `[${i}] (${it.type}) ${it.source}: ${(it.summary || it.title || "")
          .replace(/\s+/g, " ")
          .slice(0, 400)}`
    )
    .join("\n");

  const system =
    "You are a sharp cold-email/outbound analyst writing a DAILY INTEL REPORT for Sophiya, who runs an AI cold-outbound agency (Bleed AI). You compress the day's LinkedIn posts, articles, and tool updates into a scannable at-a-glance report. Be specific and actionable, never generic. No fluff, no AI-tell words (genuinely, leverage, ensure, seamless), no em dashes.";

  const user = `Today's captured items (${dateLabel}):

${lines}

Write a markdown daily report in EXACTLY this shape (omit any section that has nothing):

# Daily Report — ${dateLabel}

## 📌 TLDR
A tight 3 to 5 sentence catch-up covering EVERYTHING below in plain language: the big themes across the experts' posts, anything notable specific people said, and any tool or product news. Written so she can read ONLY this and be fully caught up on the day. Name names and be concrete. No bullet points here, just a short paragraph.

## 👀 What the experts posted
Group by PERSON. One bullet each:
- **Name** — what they posted about + the key insight in one line. If useful, add how Sophiya could apply it to her agency.
Only include people who actually posted today. One line per person.

## 📰 Articles & News
- one bullet per article/news item.

## 🛠️ Tool Updates
- one bullet per tool/product update.

## 💡 Worth acting on
- 1 to 3 concrete things Sophiya could test or do today based on the above.

Keep it tight and scannable. No links (she has the feed for those).`;

  const res = await client.responses.create({
    model: MODEL,
    instructions: system,
    input: user,
  });

  let text = "";
  for (const block of res.output) {
    if (block.type === "message") {
      for (const c of block.content) {
        if (c.type === "output_text") text = c.text;
      }
    }
  }
  return text.trim();
}
