import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function GET() {
  const results: Record<string, string> = {};

  results.google_ai_key = process.env.GOOGLE_AI_KEY ? "SET" : "MISSING";
  results.sheets_id = process.env.GOOGLE_SHEETS_ID && process.env.GOOGLE_SHEETS_ID !== "your_google_sheet_id_here" ? "SET" : "MISSING or placeholder";
  results.service_email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? "SET" : "MISSING";
  results.private_key = process.env.GOOGLE_PRIVATE_KEY ? "SET" : "MISSING";

  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Say OK");
    results.gemini = "OK — " + result.response.text().trim();
  } catch (err) {
    results.gemini = "FAILED: " + String(err);
  }

  try {
    const { readSheet } = await import("@/lib/sheets");
    await readSheet("Config", "A:B");
    results.sheets = "OK";
  } catch (err) {
    results.sheets = "FAILED: " + String(err);
  }

  return NextResponse.json(results);
}
