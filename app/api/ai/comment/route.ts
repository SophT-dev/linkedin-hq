import { NextRequest, NextResponse } from "next/server";
import { generateComment } from "@/lib/claude";

export async function POST(req: NextRequest) {
  const { postText, platform, goal, extraContext } = await req.json();

  if (!postText || !platform || !goal) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const comments = await generateComment(postText, platform, goal, extraContext);
    return NextResponse.json({ comments });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to generate comments" }, { status: 500 });
  }
}
