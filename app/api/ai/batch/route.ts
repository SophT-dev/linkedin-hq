import { NextRequest, NextResponse } from "next/server";
import { generateBatch } from "@/lib/claude";
import { loadWinsLog, loadStarredIntel } from "@/lib/sheets";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      seedBrief?: string;
      count?: number;
    };
    const count = Math.max(1, Math.min(10, Number(body.count) || 5));
    const seedBrief = (body.seedBrief || "").trim();

    // Load wins + starred intel in parallel
    const [wins, starred] = await Promise.all([
      loadWinsLog(),
      loadStarredIntel(),
    ]);

    const intelInput = starred.map((s) => ({
      type: s.type,
      source: s.source,
      title: s.title,
      url: s.url,
      summary: s.summary,
      posted_at: s.posted_at,
    }));

    const result = await generateBatch({
      count,
      seedBrief,
      wins,
      intel: intelInput,
    });

    return NextResponse.json({
      ok: true,
      posts: result.posts,
      meta: {
        winsCount: wins.length,
        starredCount: starred.length,
        seedBriefProvided: seedBrief.length > 0,
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}
