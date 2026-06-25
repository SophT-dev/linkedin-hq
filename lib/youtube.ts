// Curated YouTube source for the newsfeed (▶️ category). Free, no API key:
// resolves each channel's id (from a handle if needed) and reads its public RSS
// feed (youtube.com/feeds/videos.xml?channel_id=...). Items are tagged 'youtube'.

export interface YtItem {
  posted_at: string; // UTC ISO
  source: string; // channel/creator name
  title: string;
  url: string;
  summary: string;
  score: number;
}

// Curated channels (resolved channel ids). Add more with { name, handle } and
// the resolver below will turn the handle into an id at fetch time.
const CHANNELS: { name: string; id?: string; handle?: string }[] = [
  { name: "Michel Lieben (ColdIQ)", id: "UCvTZ9sU4PoYP6_uATOUCU3g" },
  { name: "Eric Nowoslawski", id: "UC6ef5yDFz7gm8rARwX3HaDw" },
  { name: "Nick Abraham", id: "UCxs3m5a7SlJKr9jElE9v5vA" },
];

function match1(s: string, re: RegExp): string {
  const m = s.match(re);
  return m ? m[1] : "";
}

// Resolve a @handle to a UC… channel id by scraping the channel page.
async function resolveChannelId(handle: string): Promise<string> {
  const url = `https://www.youtube.com/${handle.replace(/^@?/, "@")}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; BleedAINewsfeed/1.0)" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`yt handle ${res.status}`);
  const html = await res.text();
  return (
    match1(html, /"channelId":"(UC[\w-]+)"/) ||
    match1(html, /"externalId":"(UC[\w-]+)"/) ||
    match1(html, /channel\/(UC[\w-]+)/)
  );
}

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

async function fetchChannel(ch: { name: string; id?: string; handle?: string }): Promise<YtItem[]> {
  let id = ch.id;
  if (!id && ch.handle) id = await resolveChannelId(ch.handle);
  if (!id) throw new Error(`no channel id for ${ch.name}`);

  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${id}`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; BleedAINewsfeed/1.0)" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`yt rss ${res.status}`);
  const xml = await res.text();
  const channelName = decode(match1(xml, /<title>([\s\S]*?)<\/title>/)) || ch.name;

  const items: YtItem[] = [];
  const blocks = xml.split(/<entry>/).slice(1);
  for (const raw of blocks.slice(0, 5)) {
    const b = raw.split(/<\/entry>/)[0];
    const title = decode(match1(b, /<title>([\s\S]*?)<\/title>/));
    const link = match1(b, /<link rel="alternate" href="([^"]+)"/) || match1(b, /<link[^>]*href="([^"]+)"/);
    const pub = match1(b, /<published>([\s\S]*?)<\/published>/);
    const desc = decode(match1(b, /<media:description>([\s\S]*?)<\/media:description>/));
    if (!title || !link) continue;
    let posted_at = "";
    if (pub) {
      const d = new Date(pub);
      if (!isNaN(d.getTime())) posted_at = d.toISOString();
    }
    items.push({
      posted_at,
      source: channelName || ch.name,
      title,
      url: link,
      summary: desc.slice(0, 400),
      score: 0,
    });
  }
  return items;
}

export async function fetchYouTubeIntel(): Promise<YtItem[]> {
  const results = await Promise.allSettled(CHANNELS.map(fetchChannel));
  const all: YtItem[] = [];
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
