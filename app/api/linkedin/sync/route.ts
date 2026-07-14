import { NextRequest, NextResponse } from "next/server";
import { saveProfileStats, loadLatestProfileStats } from "@/lib/sheets";

export const dynamic = "force-dynamic";

// /api/linkedin/sync — Phase 1 of the live LinkedIn data sync.
// See docs/LIVE-LINKEDIN-DATA-RESEARCH.md.
//
// POST (from the Chrome extension's background worker, token-protected):
//   body: { followers?, connections?, profile_views_90d?, search_appearances? }
//   The extension reads these from LinkedIn's own Voyager API in the browser
//   (using the logged-in session), so no LinkedIn credentials ever touch us.
//   We just persist the numbers into the ProfileStats Sheet tab.
//
// GET (from the dashboard): returns the latest ProfileStats row, or null.

function numOrEmpty(v: unknown): number | "" {
  const n = typeof v === "string" ? parseInt(v.replace(/[^\d]/g, ""), 10) : Number(v);
  return Number.isFinite(n) ? (n as number) : "";
}

export async function GET() {
  try {
    const stats = await loadLatestProfileStats();
    return NextResponse.json({ ok: true, stats });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
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

    const body = await req.json();
    const followers = numOrEmpty(body.followers);
    // Keep connections as a raw string so LinkedIn's capped "500+" survives
    // (numOrEmpty would strip the + to 500). Exact numbers pass through fine.
    const connections = body.connections == null ? "" : String(body.connections).trim();
    if (followers === "" && connections === "") {
      return NextResponse.json({ ok: false, error: "no followers/connections in payload" }, { status: 400 });
    }

    await saveProfileStats({
      followers,
      connections,
      profile_views_90d: numOrEmpty(body.profile_views_90d),
      search_appearances: numOrEmpty(body.search_appearances),
      source: "extension",
    });

    return NextResponse.json({ ok: true, saved: { followers, connections } });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
