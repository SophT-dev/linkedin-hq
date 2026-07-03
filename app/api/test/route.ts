import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function GET() {
  const results: Record<string, string> = {};

  results.openai_key = process.env.OPENAI_API_KEY ? "SET" : "MISSING";
  results.sheets_id = process.env.GOOGLE_SHEETS_ID && process.env.GOOGLE_SHEETS_ID !== "your_google_sheet_id_here" ? "SET" : "MISSING or placeholder";

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const res = await client.responses.create({
      model: "gpt-5.4-nano",
      input: "Say OK",
    });
    let text = "";
    for (const block of res.output) {
      if (block.type === "message") {
        for (const c of block.content) {
          if (c.type === "output_text") text = c.text;
        }
      }
    }
    results.openai = "OK — " + text.trim();
  } catch (err) {
    results.openai = "FAILED: " + String(err).slice(0, 150);
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
