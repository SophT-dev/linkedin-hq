import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function GET() {
  const results: Record<string, string> = {};

  results.google_ai_key = process.env.GOOGLE_AI_KEY ? "SET" : "MISSING";
  results.sheets_id = process.env.GOOGLE_SHEETS_ID && process.env.GOOGLE_SHEETS_ID !== "your_google_sheet_id_here" ? "SET" : "MISSING or placeholder";

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY!);

  for (const modelName of ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-pro", "gemini-1.0-pro"]) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Say OK");
      results[modelName] = "OK — " + result.response.text().trim().slice(0, 30);
      break; // stop at first working model
    } catch (err) {
      results[modelName] = "FAILED: " + String(err).slice(0, 120);
    }
  }

  try {
    const { readSheet } = await import("@/lib/sheets");
    await readSheet("Config", "A:B");
    results.sheets = "OK";
  } catch (err) {
    results.sheets = "FAILED: " + String(err).slice(0, 120);
  }

  return NextResponse.json(results, { headers: { "Cache-Control": "no-store" } });
}
