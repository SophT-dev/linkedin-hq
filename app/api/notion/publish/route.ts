import { NextRequest, NextResponse } from "next/server";
import { publishLeadMagnetToNotion } from "@/lib/notion";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/notion/publish
// body: { title: string, body_md: string }
// returns: { notionUrl, pageId }
export async function POST(req: NextRequest) {
  try {
    const { title, body_md } = (await req.json()) as {
      title?: string;
      body_md?: string;
    };
    if (!title || !body_md) {
      return NextResponse.json(
        { ok: false, error: "title and body_md are required" },
        { status: 400 }
      );
    }
    const result = await publishLeadMagnetToNotion({ title, body_md });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
