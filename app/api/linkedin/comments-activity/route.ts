import { NextRequest, NextResponse } from "next/server";
import { saveMyComments, loadMyComments } from "@/lib/sheets";

export const dynamic = "force-dynamic";

// /api/linkedin/comments-activity — tracks the user's OWN comments (Option 2).
// The extension reads them read-only from your LinkedIn activity and POSTs here.
//
// POST (token-protected): { items: [{ url, author?, minutesAgo? }] }
//   Appends new ones to the MyComments Sheet tab (deduped by post url).
// GET: { dates: [...] } — the dates the commenting-activity heatmap counts.

export async function GET() {
  try {
    const { dates, urls } = await loadMyComments();
    // `urls` lets the extension skip re-sending comments already saved (dedup is
    // also enforced on POST, so this is an efficiency layer, not the guarantee).
    return NextResponse.json({ ok: true, dates, urls: Array.from(urls) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e), dates: [], urls: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const expected = process.env.LINKEDIN_SYNC_TOKEN;
    if (!expected) {
      return NextResponse.json({ ok: false, error: "LINKEDIN_SYNC_TOKEN not configured on server" }, { status: 500 });
    }
    if (req.headers.get("x-sync-token") !== expected) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const body = (await req.json()) as { items?: { url?: string; author?: string; minutesAgo?: number; text?: string }[] };
    const items = (Array.isArray(body.items) ? body.items : []).filter((i) => i.url) as { url: string; author?: string; minutesAgo?: number; text?: string }[];
    const result = await saveMyComments(items);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
