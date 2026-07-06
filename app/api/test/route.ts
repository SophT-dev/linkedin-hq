import { NextResponse } from "next/server";
import { generateText } from "@/lib/ai";

export async function GET() {
  const results: Record<string, string> = {};

  results.google_ai_key = process.env.GOOGLE_AI_KEY ? "SET" : "MISSING";
  results.groq_key = process.env.GROQ_API_KEY ? "SET" : "MISSING";
  results.sheets_id = process.env.GOOGLE_SHEETS_ID && process.env.GOOGLE_SHEETS_ID !== "your_google_sheet_id_here" ? "SET" : "MISSING or placeholder";

  try {
    const res = await generateText("Say OK");
    results.ai = `OK (${res.provider}) — ${res.text.trim()}`;
  } catch (err) {
    results.ai = "FAILED: " + String(err).slice(0, 150);
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
