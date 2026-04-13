import { NextRequest, NextResponse } from "next/server";
import { loadPostById } from "@/lib/sheets";

export const dynamic = "force-dynamic";

// GET /api/posts/:id — fetch a single post row by nanoid id. Used by the
// linkedin-batch skill when it resumes a lead magnet build mid-flow and
// needs to re-read the source post.
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const post = await loadPostById(id);
    if (!post) {
      return NextResponse.json(
        { ok: false, error: `post not found: ${id}` },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, post });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
