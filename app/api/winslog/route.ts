import { NextResponse } from "next/server";
import { loadWinsLog } from "@/lib/sheets";

export const dynamic = "force-dynamic";

// Thin proxy so the linkedin-batch Claude skill can read WinsLog without
// needing a service account key on the user's machine. No auth yet — fine
// for a single-user project on a non-guessable Vercel URL. When we harden,
// add an x-skill-token header check here.
export async function GET() {
  try {
    const rows = await loadWinsLog();
    return NextResponse.json({ ok: true, count: rows.length, rows });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
