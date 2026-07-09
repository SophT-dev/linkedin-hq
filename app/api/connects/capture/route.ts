import { NextRequest, NextResponse } from "next/server";
import { readSheet, appendRow } from "@/lib/sheets";

// New (2026-07-10) — the /networking page's "Capture from post" action.
// Ports the exact fetch+parse logic from scripts/capture-connects.mjs into
// a route handler so it can be called from the UI instead of the CLI.
// Free, no Apify/login needed — LinkedIn's public post page (no session)
// server-renders a handful of top comments with the commenter's name and
// profile URL.

const TAB = "Connects";

const norm = (u: string) => (u || "").split("?")[0].replace(/\/$/, "").toLowerCase();

function extractCommenters(html: string) {
  const matches = [...html.matchAll(/comment__author[^>]*href="([^"]+)"[^>]*>\s*([^<]+)/g)];
  const seen = new Set<string>();
  const out: { name: string; profileUrl: string }[] = [];
  for (const match of matches) {
    const href = match[1];
    const rawName = match[2];
    const profileUrl = href.split("?")[0];
    const name = rawName.replace(/\s+/g, " ").trim();
    const key = norm(profileUrl);
    if (seen.has(key)) continue;
    seen.add(key);
    // Skip company pages (not a person to connect with)
    if (profileUrl.includes("/company/")) continue;
    out.push({ name, profileUrl });
  }
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url = typeof body?.url === "string" ? body.url.trim() : "";
    const expert = typeof body?.expert === "string" ? body.expert.trim() : "";

    if (!url) return NextResponse.json({ error: "Missing post url" }, { status: 400 });

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
    });
    if (!res.ok) {
      return NextResponse.json({ error: `Fetch failed: ${res.status}` }, { status: 502 });
    }
    const html = await res.text();
    const commenters = extractCommenters(html);

    if (commenters.length === 0) {
      return NextResponse.json({ added: 0 });
    }

    const existingRows = await readSheet(TAB, "A2:B10000");
    const existingUrls = new Set((existingRows || []).map((r) => norm(r[1])));

    const newCommenters = commenters.filter((c) => !existingUrls.has(norm(c.profileUrl)));

    const now = new Date().toISOString().slice(0, 10);
    for (const c of newCommenters) {
      await appendRow(TAB, [c.name, c.profileUrl, url, expert, now, "not_contacted", ""]);
    }

    return NextResponse.json({ added: newCommenters.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to capture connects" }, { status: 500 });
  }
}
