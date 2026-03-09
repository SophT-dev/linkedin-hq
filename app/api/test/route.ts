import { NextResponse } from "next/server";
import { client } from "@/lib/claude";

export async function GET() {
  const results: Record<string, string> = {};

  // Check env vars are present (don't expose values)
  results.anthropic_key = process.env.ANTHROPIC_API_KEY ? "SET" : "MISSING";
  results.sheets_id = process.env.GOOGLE_SHEETS_ID && process.env.GOOGLE_SHEETS_ID !== "your_google_sheet_id_here" ? "SET" : "MISSING or placeholder";
  results.service_email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? "SET" : "MISSING";
  results.private_key = process.env.GOOGLE_PRIVATE_KEY ? "SET" : "MISSING";

  // Test Claude
  try {
    const res = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 20,
      messages: [{ role: "user", content: "Say OK" }],
    });
    results.claude = "OK — " + (res.content[0] as { text: string }).text;
  } catch (err) {
    results.claude = "FAILED: " + String(err);
  }

  // Test Sheets
  try {
    const { readSheet } = await import("@/lib/sheets");
    await readSheet("Config", "A:B");
    results.sheets = "OK";
  } catch (err) {
    results.sheets = "FAILED: " + String(err);
  }

  return NextResponse.json(results);
}
