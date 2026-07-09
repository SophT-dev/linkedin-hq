import { NextResponse } from "next/server";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);

// Parses content/inspo/README.md's markdown tables into { file -> {category, description} }
// so the gallery can group by category without duplicating the README's own labels.
function parseReadmeCategories(readmePath: string) {
  const map: Record<string, { category: string; description: string }> = {};
  let raw = "";
  try {
    raw = readFileSync(readmePath, "utf8");
  } catch {
    return map;
  }
  let currentCategory = "Uncategorized";
  for (const line of raw.split("\n")) {
    const heading = line.match(/^##\s+(.+)/);
    if (heading) {
      currentCategory = heading[1].trim();
      continue;
    }
    const row = line.match(/^\|\s*`([^`]+)`\s*\|\s*(.+?)\s*\|\s*$/);
    if (row) {
      map[row[1]] = { category: currentCategory, description: row[2].replace(/\*\*/g, "") };
    }
  }
  return map;
}

export async function GET() {
  const inspoDir = path.join(process.cwd(), "content", "inspo");
  let entries: string[] = [];
  try {
    entries = readdirSync(inspoDir);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
  const categories = parseReadmeCategories(path.join(inspoDir, "README.md"));
  const files = entries
    .filter((f) => IMAGE_EXT.has(path.extname(f).toLowerCase()))
    .map((f) => ({
      file: f,
      url: `/api/inspo/${encodeURIComponent(f)}`,
      category: categories[f]?.category || "Uncategorized",
      description: categories[f]?.description || "",
    }));
  return NextResponse.json({ files });
}
