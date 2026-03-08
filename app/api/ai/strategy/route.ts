import { NextRequest, NextResponse } from "next/server";
import { strategyChat } from "@/lib/claude";
import { getConfig } from "@/lib/sheets";

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: "Missing messages" }, { status: 400 });
  }

  try {
    const config = await getConfig();
    const reply = await strategyChat(messages, config);
    return NextResponse.json({ reply });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to get strategy response" }, { status: 500 });
  }
}
