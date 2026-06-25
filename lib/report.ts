import Anthropic from "@anthropic-ai/sdk";
import { IntelRow } from "./sheets";

// Cheap model on purpose — one batched call per day over the day's items.
const MODEL = "claude-haiku-4-5";

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

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

## 🎯 Today in one line
One sentence: the overall theme across everything below.

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

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 1600,
    system,
    messages: [{ role: "user", content: user }],
  });

  return res.content[0]?.type === "text" ? res.content[0].text.trim() : "";
}
