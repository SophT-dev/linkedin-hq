import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function GET() {
  const results: Record<string, string> = {};

  results.anthropic_key = process.env.ANTHROPIC_API_KEY ? "SET" : "MISSING";
  results.sheets_id = process.env.GOOGLE_SHEETS_ID && process.env.GOOGLE_SHEETS_ID !== "your_google_sheet_id_here" ? "SET" : "MISSING or placeholder";

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 20,
      messages: [{ role: "user", content: "Say OK" }],
    });
    const text = res.content[0]?.type === "text" ? res.content[0].text : "";
    results.claude = "OK — " + text.trim();
  } catch (err) {
    results.claude = "FAILED: " + String(err).slice(0, 150);
  }

  try {
    const { readSheet } = await import("@/lib/sheets");
    await readSheet("Config", "A:B");
    results.sheets = "OK";
  } catch (err) {
    results.sheets = "FAILED: " + String(err).slice(0, 150);
  }

  return NextResponse.json(results, { headers: { "Cache-Control": "no-store" } });
}
