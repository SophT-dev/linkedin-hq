import { NextResponse } from "next/server";
import Groq from "groq-sdk";

export async function GET() {
  const results: Record<string, string> = {};

  results.groq_key = process.env.GROQ_API_KEY ? "SET" : "MISSING";
  results.sheets_id = process.env.GOOGLE_SHEETS_ID && process.env.GOOGLE_SHEETS_ID !== "your_google_sheet_id_here" ? "SET" : "MISSING or placeholder";

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const res = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 20,
      messages: [{ role: "user", content: "Say OK" }],
    });
    results.groq = "OK — " + (res.choices[0]?.message?.content || "").trim();
  } catch (err) {
    results.groq = "FAILED: " + String(err).slice(0, 150);
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
