// Shared relevance gate for intel items from every source (news scouts,
// reddit, LinkedIn creator ingest). Any item whose title or summary lacks
// at least one of these substrings is dropped before it lands in the Intel tab.

export const INTEL_RELEVANCE_KEYWORDS = [
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
  "clay",
  "lavender",
  "spam",
  "blacklist",
  "b2b sales",
  "sdr",
  "appointment setter",
];

export function isIntelRelevant(title: string, summary: string): boolean {
  const haystack = `${title} ${summary}`.toLowerCase();
  return INTEL_RELEVANCE_KEYWORDS.some((kw) => haystack.includes(kw));
}
