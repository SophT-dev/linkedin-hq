"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lightbulb, ArrowRight, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";

// Ready-to-use combo post ideas from the Post Ideas backlog (status=unused).
// Rows the repurpose engine writes carry a "repurpose" tag and encode a full
// format+visual+lead-magnet combo — prefer those, fall back to any unused.

interface Idea {
  idea_angle: string;
  suggested_format: string;
  funnel_stage: string;
  tags: string;
  lead_magnet_ideas: string;
  source: string;
  key: number;
}

function tagChips(tags: string): string[] {
  return (tags || "")
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t && t.toLowerCase() !== "repurpose");
}

export default function ComboIdeas() {
  const [ideas, setIdeas] = useState<Idea[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/sheets?tab=Post Ideas&range=A:H");
        if (!res.ok) { setIdeas([]); return; }
        const { rows } = await res.json();
        const all: Idea[] = (rows as string[][])
          .slice(1)
          .map((r, i) => ({
            idea_angle: r[0] || "",
            suggested_format: r[1] || "",
            funnel_stage: r[2] || "",
            tags: r[3] || "",
            lead_magnet_ideas: r[4] || "",
            source: r[5] || "",
            key: i + 2,
            _status: (r[6] || "").trim().toLowerCase(),
          }))
          .filter((r) => r.idea_angle && r._status === "unused")
          .map(({ _status, ...rest }) => { void _status; return rest; });

        const repurpose = all.filter((r) => /(^|,|\s)repurpose(\s|,|$)/i.test(r.tags));
        const pick = (repurpose.length > 0 ? repurpose : all).slice(0, 6);
        setIdeas(pick);
      } catch {
        setIdeas([]);
      }
    })();
  }, []);

  return (
    <section className="rounded-2xl p-4 border space-y-3" style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)" }}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Lightbulb size={16} style={{ color: "var(--cat-4)" }} /> Ready-to-post ideas
        </h2>
        <Link href="/ideas" className="text-xs font-medium hover:underline" style={{ color: "var(--primary)" }}>
          All ideas →
        </Link>
      </div>

      {ideas === null && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-[180px] rounded-xl border animate-pulse" style={{ background: "var(--surface-pulse)", borderColor: "var(--border-subtle)" }} />
          ))}
        </div>
      )}

      {ideas !== null && ideas.length === 0 && (
        <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground" style={{ borderColor: "var(--border-subtle)" }}>
          No unused ideas yet. Run the repurpose skill on a starred post, or add ideas on the Post Ideas page.
        </div>
      )}

      {ideas !== null && ideas.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ideas.map((idea) => (
            <div key={idea.key} className="rounded-xl border p-3.5 flex flex-col gap-2.5" style={{ background: "var(--surface-3)", borderColor: "var(--border-subtle)" }}>
              <p className="text-sm font-medium leading-snug line-clamp-3" style={{ color: "var(--foreground)" }}>{idea.idea_angle}</p>

              <div className="flex flex-wrap gap-1.5">
                {idea.suggested_format && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full border" style={{ borderColor: "var(--border-subtle)", color: "var(--muted-foreground)" }}>{idea.suggested_format}</span>
                )}
                {idea.funnel_stage && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold badge-${idea.funnel_stage.toLowerCase()}`}>{idea.funnel_stage}</span>
                )}
                {tagChips(idea.tags).slice(0, 3).map((t) => (
                  <span key={t} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "var(--surface-4)", color: "var(--muted-foreground)" }}>{t}</span>
                ))}
              </div>

              {idea.lead_magnet_ideas && (
                <p className="text-[11px] flex items-start gap-1 text-muted-foreground">
                  <Gift size={12} className="mt-0.5 shrink-0" style={{ color: "var(--primary)" }} />
                  <span className="line-clamp-2">{idea.lead_magnet_ideas}</span>
                </p>
              )}

              {idea.source && (
                <p className="text-[10px] italic text-muted-foreground truncate" title={idea.source}>{idea.source}</p>
              )}

              <Link href="/ideas" className="mt-auto block">
                <Button size="sm" variant="outline" className="w-full">
                  Use this <ArrowRight size={13} className="ml-1" />
                </Button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
