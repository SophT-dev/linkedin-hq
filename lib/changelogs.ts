// Free "Tool Updates" source for the newsfeed (🛠️ category). Uses Google News
// RSS — no API key, no LLM, zero cost — to surface recent updates/launches from
// the cold-email + AI-outbound tools. Items are tagged type 'tools' downstream.
//
// Google News RSS is a reliable public endpoint and returns stable article URLs,
// so the existing appendIntel URL-dedupe works as-is.

export interface ChangelogItem {
  posted_at: string; // UTC ISO (may be empty)
  source: string;
  title: string;
  url: string;
  summary: string;
  score: number;
}

// One query per tool/topic. Tight phrasing + an action word keeps it to actual
// product news, not generic chatter. `when:14d` limits to the last two weeks.
const QUERIES = [
  '"Clay.com" (launch OR feature OR update OR audiences OR signals)',
  '"Instantly.ai" (launch OR feature OR update OR signals OR agent)',
  '"Smartlead" (launch OR feature OR update OR agent)',
  '"Apollo.io" (launch OR feature OR update)',
  '("cold email" OR outbound OR "AI SDR") (launches OR "new feature" OR update)',
];

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .trim();
}

function match1(block: string, re: RegExp): string {
  const m = block.match(re);
  return m ? m[1] : "";
}

async function fetchQuery(q: string): Promise<ChangelogItem[]> {
  const url =
    "https://news.google.com/rss/search?q=" +
    encodeURIComponent(`${q} when:14d`) +
    "&hl=en-US&gl=US&ceid=US:en";
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; BleedAINewsfeed/1.0)" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`gnews ${res.status}`);
  const xml = await res.text();

  const items: ChangelogItem[] = [];
  const blocks = xml.split(/<item>/).slice(1);
  for (const raw of blocks.slice(0, 5)) {
    const block = raw.split(/<\/item>/)[0];
    const title = decode(match1(block, /<title>([\s\S]*?)<\/title>/));
    const link = decode(match1(block, /<link>([\s\S]*?)<\/link>/));
    if (!title || !link) continue;
    const pub = match1(block, /<pubDate>([\s\S]*?)<\/pubDate>/);
    const src =
      decode(match1(block, /<source[^>]*>([\s\S]*?)<\/source>/)) || "Google News";
    let posted_at = "";
    if (pub) {
      const d = new Date(pub);
      if (!isNaN(d.getTime())) posted_at = d.toISOString();
    }
    // Google News titles are "Headline - Source" — strip the trailing source.
    const cleanTitle = title.replace(/\s[-–]\s[^-–]+$/, "").trim() || title;
    items.push({ posted_at, source: src, title: cleanTitle, url: link, summary: "", score: 0 });
  }
  return items;
}

export async function fetchChangelogIntel(): Promise<ChangelogItem[]> {
  const results = await Promise.allSettled(QUERIES.map(fetchQuery));
  const all: ChangelogItem[] = [];
  const seen = new Set<string>();
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const it of r.value) {
      if (it.url && !seen.has(it.url)) {
        seen.add(it.url);
        all.push(it);
      }
    }
  }
  return all;
}
