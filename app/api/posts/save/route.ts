import { NextRequest, NextResponse } from "next/server";
import { appendPosts } from "@/lib/sheets";
import type { GeneratedPost } from "@/lib/claude";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { posts: GeneratedPost[] };
    const posts = body.posts || [];
    if (!Array.isArray(posts) || posts.length === 0) {
      return NextResponse.json({ error: "posts array required" }, { status: 400 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const rows = posts.map((p) => ({
      batch_date: today,
      hook: p.hook,
      body: p.body,
      format: p.format,
      funnel_stage: p.funnel_stage,
      visual_brief: p.visual_brief,
      lead_magnet: `${p.lead_magnet?.name || ""} | ${p.lead_magnet?.one_line_value_prop || ""} | ${p.lead_magnet?.suggested_cta || ""}`,
      sources_used: (p.sources_used || []).join(" ; "),
      authenticity_tag: p.authenticity_tag,
      status: "draft",
    }));

    const result = await appendPosts(rows);
    return NextResponse.json({ ok: true, saved: result.saved });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
