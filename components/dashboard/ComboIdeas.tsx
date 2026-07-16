"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lightbulb, ArrowRight, Gift, PenLine, Layers, Image as ImageIcon, Tag, BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// Ready-to-use combo post ideas from the Post Ideas backlog (status=unused).
// Rows the repurpose engine writes carry a "repurpose" tag and encode a full
// format+visual+lead-magnet combo — prefer those, fall back to any unused.
// Clicking a card opens the full fleshed-out idea (content + visual + lead
// magnet + what it references) so Sophiya can see the whole thing at a glance,
// not just a truncated angle.

interface Idea {
  idea_angle: string;
  suggested_format: string;
  funnel_stage: string;
  tags: string;
  lead_magnet_ideas: string;
  source: string;
  // Enrichment fields the repurpose engine may add later. Not in the current
  // 8-column Post Ideas schema, so they arrive undefined and the detail view
  // shows a "run /lm-repurpose to enrich" note instead of inventing them.
  visual_type?: string;
  lm_type?: string;
  key: number;
}

// --- Format + structure name maps (hand-copied from the playbook files) ------
// F1-F13 from playbook/FORMAT-LIBRARY.md (content ANGLE), S1-S5 from
// playbook/POST-STRUCTURE-LIBRARY.md (physical LAYOUT). Fetching those repo
// files at runtime isn't possible via /api/sheets, so this static map resolves
// an F#/S# token to a human name + a one-line reminder. Keep in sync if the
// playbook adds a new format/structure.
const FORMAT_NAMES: Record<string, { name: string; desc: string }> = {
  F1: { name: "Big Number + How We Did It", desc: "Lead line is a hard, specific number; the body delivers the breakdown." },
  F2: { name: "Tool Stack of a $X Company", desc: "Reveal the full stack behind a big-revenue company, numbered by category." },
  F3: { name: "Free Giveaway / Generosity Bomb", desc: "Give away a real asset for free, claimed via comments — our lead-magnet engine." },
  F4: { name: "Numbered Playbook", desc: "\"How to X like the top 1%\" — numbered insider tactics backed by a credibility stat." },
  F5: { name: "Case-Study Reversal", desc: "A surprising pivot story (ditched A for B) that teaches through built-in tension." },
  F6: { name: "Emotional Personal Story", desc: "Raw, human opener with no business framing, tied to a quiet lesson. No lead magnet." },
  F7: { name: "Build-in-Public", desc: "\"I just built [automation] that [outcome]\" — show the exact workflow. Sophiya's lane." },
  F8: { name: "Hard-Truth Contrarian", desc: "\"STOP doing X\" + an uncomfortable stat — a pattern-break that invites debate." },
  F9: { name: "Swipe-File / Resource Drop", desc: "\"I collected N valuable things into one file\" — the file itself is the magnet." },
  F10: { name: "Live Event Teaser (+ Recap)", desc: "Announce a live demo/workshop, then post the recap the next day. Two posts, one investment." },
  F11: { name: "News Reaction + Insider Verdict", desc: "React to breaking news with a credentialed, proof-backed take, then a how-to." },
  F12: { name: "Synthesis / Mega-Playbook", desc: "\"I analyzed N things so you don't have to\" — the compression itself is the value." },
  F13: { name: "N Things That Run My Entire [Workflow]", desc: "\"N tools/skills that run my entire workflow\" — a save-or-DM CTA fork." },
};
const STRUCTURE_NAMES: Record<string, { name: string; desc: string }> = {
  S1: { name: "Numbered Tactical List", desc: "Numbered sections, plain-dash sub-bullets, a blank line between every beat, high number density (Michel)." },
  S2: { name: "One-Line Cadence", desc: "Almost every clause its own line, heavy white space, repetition for rhythm, ends on a reframe (Josh Braun)." },
  S3: { name: "Emoji-Numbered System Breakdown", desc: "1️⃣2️⃣3️⃣ sections with → arrow sub-points, ends on a \"Tools used:\" list." },
  S4: { name: "Percentage Countdown", desc: "Every point is an X > Y comparison with a real percentage and a → takeaway." },
  S5: { name: "Confrontation Scene", desc: "Opens mid-action, dialogue-driven scene illustrating one lesson." },
};

interface ResolvedRef { token: string; name: string; desc: string }

// Pull every F# / S# token out of a suggested_format cell (e.g. "F4 + S1",
// "F12", "F1/S2") and resolve each to its name. Returns formats + structures
// split, plus any leftover text we couldn't map.
function resolveFormat(suggested: string): { formats: ResolvedRef[]; structures: ResolvedRef[]; leftover: string } {
  const formats: ResolvedRef[] = [];
  const structures: ResolvedRef[] = [];
  const raw = suggested || "";
  const matched: string[] = [];
  const re = /\b([FS])(\d{1,2})\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const token = `${m[1].toUpperCase()}${m[2]}`;
    matched.push(m[0]);
    if (token[0] === "F" && FORMAT_NAMES[token]) formats.push({ token, ...FORMAT_NAMES[token] });
    else if (token[0] === "S" && STRUCTURE_NAMES[token]) structures.push({ token, ...STRUCTURE_NAMES[token] });
  }
  // Whatever wasn't an F#/S# token — a human might have typed a plain format name.
  let leftover = raw;
  for (const t of matched) leftover = leftover.replace(t, "");
  leftover = leftover.replace(/[+/,·|]+/g, " ").trim();
  return { formats, structures, leftover };
}

function tagChips(tags: string): string[] {
  return (tags || "")
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t && t.toLowerCase() !== "repurpose");
}

// A source that points at a captured lead-magnet vault folder (vs. a playbook
// doc or a WinsLog reference) — render it with a "these are the mechanics we're
// reusing" note instead of a bare path.
function isVaultPath(source: string): boolean {
  return /lead-magnets[\\/](received|ours)|content[\\/]lead-magnets|(^|[\\/])vault([\\/]|$)/i.test(source || "");
}

export default function ComboIdeas({ refreshKey = 0, onLoaded }: { refreshKey?: number; onLoaded?: () => void }) {
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [selected, setSelected] = useState<Idea | null>(null);

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
      } finally {
        onLoaded?.();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

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
            <button
              key={idea.key}
              type="button"
              onClick={() => setSelected(idea)}
              className="text-left rounded-xl border p-3.5 flex flex-col gap-2.5 transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              style={{ background: "var(--surface-3)", borderColor: "var(--border-subtle)" }}
            >
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

              <span className="mt-auto inline-flex items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-xs font-medium" style={{ borderColor: "var(--border-subtle)", color: "var(--foreground)" }}>
                View full idea <ArrowRight size={13} />
              </span>
            </button>
          ))}
        </div>
      )}

      <IdeaDetailDialog idea={selected} onClose={() => setSelected(null)} />
    </section>
  );
}

const ENRICH_NOTE = "not suggested yet — run /lm-repurpose to enrich";

function IdeaDetailDialog({ idea, onClose }: { idea: Idea | null; onClose: () => void }) {
  if (!idea) return null;
  const { formats, structures, leftover } = resolveFormat(idea.suggested_format);
  const hasFormatData = formats.length > 0 || structures.length > 0 || !!leftover;
  const vault = isVaultPath(idea.source);

  return (
    <Dialog open={!!idea} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-xl max-h-[86vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-1.5">
            {idea.funnel_stage && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold badge-${idea.funnel_stage.toLowerCase()}`}>{idea.funnel_stage}</span>
            )}
            {tagChips(idea.tags).map((t) => (
              <span key={t} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "var(--surface-4)", color: "var(--muted-foreground)" }}>{t}</span>
            ))}
          </div>
          <DialogTitle className="text-base font-semibold leading-snug">{idea.idea_angle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {/* CONTENT */}
          <Section icon={<PenLine size={14} />} label="Content">
            <p className="leading-snug" style={{ color: "var(--foreground)" }}>{idea.idea_angle}</p>
            {hasFormatData ? (
              <div className="space-y-2 mt-2">
                {formats.map((f) => (
                  <RefLine key={f.token} icon={<Layers size={12} />} token={f.token} name={f.name} desc={f.desc} />
                ))}
                {structures.map((s) => (
                  <RefLine key={s.token} icon={<Layers size={12} />} token={s.token} name={s.name} desc={s.desc} />
                ))}
                {formats.length === 0 && (
                  <p className="text-[11px] text-muted-foreground">No structure (S#) suggested yet — pick one from the Post Structure Library when drafting.</p>
                )}
                {structures.length === 0 && formats.length > 0 && (
                  <p className="text-[11px] text-muted-foreground">Layout (S#) {ENRICH_NOTE}.</p>
                )}
                {leftover && (
                  <p className="text-[11px] text-muted-foreground">Also noted: {leftover}</p>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground mt-1">Format {ENRICH_NOTE}.</p>
            )}
          </Section>

          {/* VISUAL */}
          <Section icon={<ImageIcon size={14} />} label="Visual">
            {idea.visual_type ? (
              <>
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border" style={{ borderColor: "var(--border-subtle)", color: "var(--muted-foreground)" }}>
                  <Tag size={10} /> {idea.visual_type}
                </span>
                <p className="text-[12px] text-muted-foreground mt-1.5">Brief the designer: a 1080×1350 asset in this style, on-brand (dark + red + droplet). Render via <code>content/make-gif.cjs</code>.</p>
              </>
            ) : (
              <p className="text-[12px] text-muted-foreground">Visual {ENRICH_NOTE}.</p>
            )}
          </Section>

          {/* LEAD MAGNET */}
          <Section icon={<Gift size={14} />} label="Lead magnet">
            {idea.lead_magnet_ideas ? (
              <p className="leading-snug" style={{ color: "var(--foreground)" }}>{idea.lead_magnet_ideas}</p>
            ) : (
              <p className="text-[12px] text-muted-foreground">Lead magnet {ENRICH_NOTE}.</p>
            )}
            {idea.lm_type ? (
              <span className="inline-flex items-center gap-1 mt-1.5 text-[11px] px-2 py-0.5 rounded-full border" style={{ borderColor: "var(--border-subtle)", color: "var(--muted-foreground)" }}>
                <Tag size={10} /> {idea.lm_type}
              </span>
            ) : idea.lead_magnet_ideas ? (
              <p className="text-[11px] text-muted-foreground mt-1">Magnet type {ENRICH_NOTE}.</p>
            ) : null}
          </Section>

          {/* REFERENCES */}
          <Section icon={<BookOpen size={14} />} label="References">
            {idea.source ? (
              <div className="space-y-1">
                <p className="text-[12px] break-words" style={{ color: "var(--foreground)" }}>{idea.source}</p>
                {vault && (
                  <p className="text-[11px] flex items-start gap-1 text-muted-foreground">
                    <Sparkles size={11} className="mt-0.5 shrink-0" style={{ color: "var(--primary)" }} />
                    captured lead magnet — source of these mechanics
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[12px] text-muted-foreground">No reference recorded.</p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {idea.funnel_stage && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold badge-${idea.funnel_stage.toLowerCase()}`}>{idea.funnel_stage}</span>
              )}
              {tagChips(idea.tags).map((t) => (
                <span key={t} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "var(--surface-4)", color: "var(--muted-foreground)" }}>{t}</span>
              ))}
              {!idea.funnel_stage && tagChips(idea.tags).length === 0 && (
                <span className="text-[11px] text-muted-foreground">No funnel stage or tags set.</span>
              )}
            </div>
          </Section>
        </div>

        <DialogFooter className="sm:justify-between">
          <Link href="/ideas">
            <Button variant="outline" size="sm">Open backlog</Button>
          </Link>
          <Link href="/calendar">
            <Button size="sm">Draft this post <ArrowRight size={13} className="ml-1" /></Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border p-3" style={{ background: "var(--surface-3)", borderColor: "var(--border-subtle)" }}>
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--muted-foreground)" }}>
        <span style={{ color: "var(--primary)" }}>{icon}</span> {label}
      </p>
      {children}
    </div>
  );
}

function RefLine({ icon, token, name, desc }: { icon: React.ReactNode; token: string; name: string; desc: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="inline-flex items-center gap-1 shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border" style={{ background: "var(--accent)", color: "var(--primary)", borderColor: "var(--border-accent)" }}>
        <span>{icon}</span> {token}
      </span>
      <p className="text-[12px] leading-snug">
        <span className="font-semibold" style={{ color: "var(--foreground)" }}>{name}</span>
        <span className="text-muted-foreground"> — {desc}</span>
      </p>
    </div>
  );
}
