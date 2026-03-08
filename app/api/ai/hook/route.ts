import { NextRequest, NextResponse } from "next/server";
import { scoreHook } from "@/lib/claude";

export async function POST(req: NextRequest) {
  const { hook } = await req.json();

  if (!hook) return NextResponse.json({ error: "Missing hook" }, { status: 400 });

  try {
    const result = await scoreHook(hook);
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to score hook" }, { status: 500 });
  }
}
