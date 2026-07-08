// Stage 7: real posting-cadence research, not a guess. Reads every tracked
// expert's raw posts.json (postedAt.date), computes posts/week, day-of-week
// distribution, and post-type mix (via the tagged corpus's content_type
// field, joined by post id) over their most recent ~6 months of activity.
// One-off analysis script -- re-run manually if the corpus refreshes.
//
// Usage: node scripts/analyze-posting-cadence.mjs
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const corpusRoot = path.resolve(__dirname, "..", "..", "campaign-master", "knowledge-base", "learning-center");

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const tagged = readFileSync(path.join(corpusRoot, "_tagged.jsonl"), "utf8")
  .trim()
  .split("\n")
  .map((l) => JSON.parse(l));
const typeByPostId = new Map(tagged.map((r) => [`${r.expert}::${r.post_id}`, r.content_type || []]));

const experts = readdirSync(corpusRoot, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
  .map((d) => d.name);

const results = [];

for (const expert of experts) {
  const postsPath = path.join(corpusRoot, expert, "linkedin", "posts.json");
  let arr;
  try {
    arr = JSON.parse(readFileSync(postsPath, "utf8"));
  } catch {
    continue;
  }
  if (!arr.length) continue;

  // Only original posts (skip reposts/comments if the field exists), sorted newest first already.
  const dated = arr
    .filter((p) => p.postedAt?.date)
    .map((p) => ({ ...p, _date: new Date(p.postedAt.date) }))
    .sort((a, b) => b._date - a._date);
  if (!dated.length) continue;

  const newest = dated[0]._date;
  const sixMonthsAgo = new Date(newest);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const recent = dated.filter((p) => p._date >= sixMonthsAgo);
  if (recent.length < 5) continue; // not enough recent activity to be meaningful

  const spanDays = (recent[0]._date - recent[recent.length - 1]._date) / 86400000 || 1;
  const postsPerWeek = (recent.length / spanDays) * 7;

  const dayCounts = new Array(7).fill(0);
  recent.forEach((p) => dayCounts[p._date.getUTCDay()]++);
  const topDays = dayCounts
    .map((c, i) => ({ day: DAY_NAMES[i], c }))
    .sort((a, b) => b.c - a.c)
    .slice(0, 3)
    .filter((d) => d.c > 0)
    .map((d) => `${d.day} (${d.c})`);

  const typeCounts = {};
  for (const p of recent) {
    const types = typeByPostId.get(`${expert}::${p.id}`) || [];
    for (const t of types) typeCounts[t] = (typeCounts[t] || 0) + 1;
  }
  const topTypes = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t, c]) => `${t} (${c})`);

  results.push({
    expert,
    recentCount: recent.length,
    spanDays: Math.round(spanDays),
    postsPerWeek: Math.round(postsPerWeek * 10) / 10,
    topDays,
    topTypes,
  });
}

results.sort((a, b) => b.postsPerWeek - a.postsPerWeek);

console.log("POSTING CADENCE — last 6 months of activity per tracked expert\n");
for (const r of results) {
  console.log(`${r.expert}`);
  console.log(`  ${r.postsPerWeek} posts/week  (${r.recentCount} posts over ${r.spanDays} days)`);
  console.log(`  top days: ${r.topDays.join(", ") || "n/a"}`);
  console.log(`  top content types: ${r.topTypes.join(", ") || "n/a"}`);
  console.log("");
}
