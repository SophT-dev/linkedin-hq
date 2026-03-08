import { NextRequest, NextResponse } from "next/server";
import { generatePostIdeas } from "@/lib/claude";

export async function POST(req: NextRequest) {
  const { funnelStage, format, seedTopic, extraContext } = await req.json();

  if (!funnelStage || !format) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const ideas = await generatePostIdeas(funnelStage, format, seedTopic, extraContext);
    return NextResponse.json({ ideas });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to generate ideas" }, { status: 500 });
  }
}
