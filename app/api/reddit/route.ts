import { NextRequest, NextResponse } from "next/server";
import { readSheet, appendRow } from "@/lib/sheets";

// n8n posts here — deduplicates by URL before saving
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, url, subreddit, published } = body;

  if (!title || !url) {
    return NextResponse.json({ error: "Missing title or url" }, { status: 400 });
  }

  try {
    // Check for existing entry with same URL
    const existing = await readSheet("RedditFlagged", "A:F");
    const isDuplicate = existing.some((row) => row[1] === url);
    if (isDuplicate) {
      return NextResponse.json({ skipped: true, reason: "duplicate" });
    }

    await appendRow("RedditFlagged", [
      title,
      url,
      published || new Date().toISOString(),
      subreddit || "",
      "FALSE",
      "",
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
