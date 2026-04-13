import { NextRequest, NextResponse } from "next/server";
import { appendPosts } from "@/lib/sheets";

export const dynamic = "force-dynamic";

// Accepts either the legacy GeneratedPost shape (from the old /batch UI, now
// retired) or the new skill-authored shape. Both paths normalize into the
// Posts tab row format and return stable ids + row indices.
interface IncomingPost {
  hook?: string;
  body?: string;
  format?: string;
  funnel_stage?: string;
  visual_brief?: string;
  lead_magnet?:
    | string
    | {
        name?: string;
        one_line_value_prop?: string;
        suggested_cta?: string;
      };
  sources_used?: string[] | string;
  authenticity_tag?: string;
}

function serializeLeadMagnet(lm: IncomingPost["lead_magnet"]): string {
  if (!lm) return "";
  if (typeof lm === "string") return lm;
  const parts = [
    lm.name || "",
    lm.one_line_value_prop || "",
    lm.suggested_cta || "",
  ];
  return parts.join(" | ");
}

function serializeSources(s: IncomingPost["sources_used"]): string {
  if (!s) return "";
  if (typeof s === "string") return s;
  return s.join(" ; ");
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { posts: IncomingPost[] };
    const posts = body.posts || [];
    if (!Array.isArray(posts) || posts.length === 0) {
      return NextResponse.json({ error: "posts array required" }, { status: 400 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const rows = posts.map((p) => ({
      batch_date: today,
      hook: p.hook || "",
      body: p.body || "",
      format: p.format || "text",
      funnel_stage: p.funnel_stage || "TOFU",
      visual_brief: p.visual_brief || "",
      lead_magnet: serializeLeadMagnet(p.lead_magnet),
      sources_used: serializeSources(p.sources_used),
      authenticity_tag: p.authenticity_tag || "",
      status: "draft",
    }));

    const result = await appendPosts(rows);
    return NextResponse.json({ ok: true, saved: result.saved, items: result.items });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
