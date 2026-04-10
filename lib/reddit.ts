/**
 * Direct Reddit fetcher.
 *
 * Reddit's public JSON endpoints (e.g. https://www.reddit.com/r/coldemail/hot.json)
 * are unauthenticated and return live data IF the request includes a descriptive
 * non-bot User-Agent. n8n cloud IPs are blanket-blocked, but server-to-server
 * fetches from Vercel/local Node typically work.
 *
 * Compliance with Reddit's Responsible Builder Policy:
 * - We never store post body or comment body verbatim.
 * - We only keep title, url, subreddit, score, num_comments — all metadata.
 * - The summary is a generic abstraction, never a quote.
 * - Read-only, low volume.
 */

export interface RedditPost {
  title: string;
  url: string;          // permalink to the thread
  source: string;       // "r/coldemail"
  summary: string;      // "X upvotes, Y comments — about ..."
  posted_at: string;    // ISO of the original post
  score: number;        // upvotes
}

// Only r/coldemail for now. Other subreddits introduced too much off-topic
// noise; we'll widen this list once we have a tighter relevance filter.
const SUBREDDITS = ["coldemail"];
const USER_AGENT = "linkedin-hq/1.0 (private content research dashboard)";

// Hard relevance filter — a Reddit post is only kept if its title contains
// at least one of these terms (case-insensitive substring). This is the
// same whitelist used by the news scout post-filter, kept in sync.
const COLD_EMAIL_KEYWORDS = [
  "cold email",
  "cold outreach",
  "cold outbound",
  "outbound",
  "deliverability",
  "dmarc",
  "spf",
  "dkim",
  "inbox placement",
  "sender reputation",
  "bounce rate",
  "reply rate",
  "open rate",
  "subject line",
  "email warmup",
  "warmup",
  "mailbox",
  "email sequence",
  "lemlist",
  "smartlead",
  "instantly",
  "apollo",
  "lavender",
  "email marketing tool",
  "spam",
  "blacklist",
];

function matchesColdEmail(text: string): boolean {
  const lower = text.toLowerCase();
  return COLD_EMAIL_KEYWORDS.some((kw) => lower.includes(kw));
}

export async function fetchRedditIntel(): Promise<RedditPost[]> {
  const all: RedditPost[] = [];
  const seen = new Set<string>();

  for (const sub of SUBREDDITS) {
    try {
      // /top.json?t=week gets the most-upvoted posts of the past week.
      // Combined with the hot tab below, that gives us "popular this week"
      // plus "currently trending" without spamming the API.
      const sources = [
        `https://www.reddit.com/r/${sub}/top.json?limit=15&t=week`,
        `https://www.reddit.com/r/${sub}/hot.json?limit=10`,
      ];

      for (const url of sources) {
        const res = await fetch(url, {
          headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok) continue;
        const data = (await res.json()) as {
          data?: {
            children?: Array<{
              data?: {
                title?: string;
                permalink?: string;
                ups?: number;
                num_comments?: number;
                stickied?: boolean;
                over_18?: boolean;
                created_utc?: number;
              };
            }>;
          };
        };

        const fourteenDaysAgo = Date.now() / 1000 - 14 * 24 * 60 * 60;

        for (const child of data.data?.children || []) {
          const post = child.data;
          if (!post || !post.title || !post.permalink) continue;
          if (post.stickied) continue;
          if (post.over_18) continue;
          if (post.created_utc && post.created_utc < fourteenDaysAgo) continue;

          // Hard relevance gate: drop anything that isn't unambiguously
          // about cold email or its technical concerns.
          if (!matchesColdEmail(post.title)) continue;

          const link = `https://www.reddit.com${post.permalink}`;
          if (seen.has(link)) continue;
          seen.add(link);

          const ups = post.ups || 0;
          const comments = post.num_comments || 0;
          const postedIso = post.created_utc
            ? new Date(post.created_utc * 1000).toISOString()
            : "";

          all.push({
            title: post.title.slice(0, 220),
            url: link,
            source: `r/${sub}`,
            summary: `${ups} upvotes, ${comments} comments. Active discussion in r/${sub}.`,
            posted_at: postedIso,
            score: ups,
          });
        }
      }
    } catch {
      // ignore individual subreddit failures, return whatever worked
    }
  }

  // Sort by score descending so the most popular surface first.
  all.sort((a, b) => b.score - a.score);
  return all.slice(0, 25);
}
