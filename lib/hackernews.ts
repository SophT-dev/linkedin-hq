/**
 * Hacker News intel via Algolia HN search API.
 * No auth, no key, free.
 *
 * Docs: https://hn.algolia.com/api
 */

export interface HNStory {
  title: string;
  url: string;
  source: string;
  summary: string;
}

// Each query has a list of "must contain" terms — we only keep an HN result
// if its title contains at least one of these (case-insensitive). The Algolia
// full-text search is loose and will match a query like "GTM" against "git"
// or any string containing "gtm", so we tighten with our own filter.
const QUERIES: { q: string; mustContain: string[] }[] = [
  { q: "cold email", mustContain: ["cold email", "cold outreach", "outbound email"] },
  { q: "email deliverability", mustContain: ["deliverabil", "spam", "dmarc", "spf", "dkim", "sender reputation", "blacklist"] },
  { q: "B2B outbound", mustContain: ["outbound", "prospect", "sdr", "b2b sales", "lead gen"] },
  { q: "sales prospecting", mustContain: ["prospect", "sdr", "sales tool", "sales automation"] },
];

function matchesAny(haystack: string, needles: string[]): boolean {
  const lower = haystack.toLowerCase();
  return needles.some((n) => lower.includes(n.toLowerCase()));
}

export async function fetchHackerNewsIntel(): Promise<HNStory[]> {
  const sevenDaysAgo = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
  const all: HNStory[] = [];
  const seen = new Set<string>();

  for (const { q, mustContain } of QUERIES) {
    try {
      const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&numericFilters=created_at_i>${sevenDaysAgo}&hitsPerPage=15`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      const data = (await res.json()) as {
        hits: Array<{
          title?: string;
          url?: string;
          story_text?: string;
          objectID?: string;
          points?: number;
          num_comments?: number;
        }>;
      };
      for (const hit of data.hits || []) {
        if (!hit.title) continue;
        // Filter out off-topic noise — title must actually contain a relevant term.
        if (!matchesAny(hit.title, mustContain)) continue;
        const link = hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;
        if (seen.has(link)) continue;
        seen.add(link);
        all.push({
          title: hit.title,
          url: link,
          source: "Hacker News",
          summary: `${hit.points || 0} points, ${hit.num_comments || 0} comments. HN discussion related to ${q}.`,
        });
      }
    } catch {
      // ignore individual query failures
    }
  }

  return all.slice(0, 15);
}
