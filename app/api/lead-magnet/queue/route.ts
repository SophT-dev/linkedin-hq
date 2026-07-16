import { NextRequest, NextResponse } from "next/server";
import { readSheet, appendRow } from "@/lib/sheets";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/lead-magnet/queue
// body: { items: string[] }
//
// Sophiya's on-the-go intake: she gets a lead magnet link in a LinkedIn DM,
// pastes a freeform line (post URL + magnet link(s) + optional note) here.
// Each line becomes one LeadMagnets row with kind=received, status=queued --
// a Claude skill drains the queue later (fills in title/takeaway properly,
// flips status to unreviewed/reviewed same as capture-item.mjs's lead_magnet
// path). Built BY HEADER NAME (read LeadMagnets!1:1, map by header index) so
// the sheet's columns can be reordered without breaking this route -- same
// pattern as scripts/capture-item.mjs and lib/sheets.ts's LeadMagnets helpers.
const LEAD_MAGNETS_TAB = "LeadMagnets";

const URL_RE = /https?:\/\/\S+/g;

// Split a raw pasted line into its URLs and the leftover free text (the
// "note"). Trailing punctuation commonly left after a pasted URL (.,);]) is
// trimmed off so it doesn't end up glued onto the link.
function splitLine(line: string): { urls: string[]; note: string } {
  const urls = (line.match(URL_RE) || []).map((u) => u.replace(/[.,;)\]]+$/g, ""));
  const note = line.replace(URL_RE, " ").replace(/\s+/g, " ").trim();
  return { urls, note };
}

// landing_url = the magnet link, source_post_url = the LinkedIn post link.
// Heuristic: whichever URL is a linkedin.com URL is the source post; the
// other is the landing (magnet) URL. Falls back to positional (1st ->
// landing_url, 2nd -> source_post_url) when both/neither are linkedin.com.
function classifyUrls(urls: string[]): { landing_url: string; source_post_url: string } {
  if (urls.length === 0) return { landing_url: "", source_post_url: "" };
  if (urls.length === 1) {
    return /linkedin\.com/i.test(urls[0])
      ? { landing_url: "", source_post_url: urls[0] }
      : { landing_url: urls[0], source_post_url: "" };
  }
  const liUrls = urls.filter((u) => /linkedin\.com/i.test(u));
  const otherUrls = urls.filter((u) => !/linkedin\.com/i.test(u));
  if (liUrls.length && otherUrls.length) {
    return { landing_url: otherUrls[0], source_post_url: liUrls[0] };
  }
  return { landing_url: urls[0], source_post_url: urls[1] };
}

async function getHeaderIndex(): Promise<{ headers: string[]; idx: Record<string, number> }> {
  const all = await readSheet(LEAD_MAGNETS_TAB, "1:1");
  const headers = (all[0] || []).map((h) => String(h || "").trim());
  const idx: Record<string, number> = {};
  headers.forEach((h, i) => { if (h && idx[h] === undefined) idx[h] = i; });
  return { headers, idx };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { items?: string[] };
    const items = (body.items || []).map((s) => s.trim()).filter(Boolean);

    if (!items.length) {
      return NextResponse.json({ ok: false, error: "items is required (at least one non-empty line)" }, { status: 400 });
    }

    const { headers, idx } = await getHeaderIndex();
    if (!headers.length) {
      return NextResponse.json({ ok: false, error: "LeadMagnets sheet has no header row" }, { status: 500 });
    }

    const today = new Date().toISOString().slice(0, 10);

    for (const line of items) {
      const { urls, note } = splitLine(line);
      const { landing_url, source_post_url } = classifyUrls(urls);

      const row = new Array(headers.length).fill("");
      const set = (k: string, v: string) => { const i = idx[k]; if (i !== undefined) row[i] = v; };
      set("kind", "received");
      set("status", "queued");
      set("title", "queued intake");
      set("landing_url", landing_url);
      set("source_post_url", source_post_url);
      set("key_takeaway", note);
      set("created_at", today);

      await appendRow(LEAD_MAGNETS_TAB, row);
    }

    return NextResponse.json({ ok: true, queued: items.length });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

// GET /api/lead-magnet/queue -- count of status=queued rows, for the intake
// page's confirmation display.
export async function GET() {
  try {
    const all = await readSheet(LEAD_MAGNETS_TAB, "A:AZ");
    const headers = (all[0] || []).map((h) => String(h || "").trim());
    const statusCol = headers.indexOf("status");
    if (statusCol === -1) return NextResponse.json({ ok: true, count: 0 });

    const count = all.slice(1).filter((r) => (r[statusCol] || "") === "queued").length;
    return NextResponse.json({ ok: true, count });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
