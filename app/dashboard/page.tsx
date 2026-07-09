"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Lightbulb,
  RefreshCw,
  Users,
  ExternalLink,
  Sparkles,
  BarChart3,
  Heart,
  MessageCircle,
  Trophy,
  Meh,
  Frown,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Types (mirrors the exact tab column orders documented in CLAUDE.md)
// ---------------------------------------------------------------------------

interface PostIdea {
  idea_angle: string;
  suggested_format: string;
  funnel_stage: string;
  tags: string;
  lead_magnet_ideas: string;
  source: string;
  status: string;
  scheduled_slot: string;
  row: number;
}

interface Creator {
  name: string;
  linkedin_url: string;
  niche: string;
  last_post_date: string;
  post_frequency: string;
  primary_format: string;
  notes: string;
  row: number;
}

interface TrackedPost {
  posted_url: string;
  likes: string;
  comments: string;
  views: string;
  worked: string;
  row: number;
}

// ---------------------------------------------------------------------------
// Small shared bits
// ---------------------------------------------------------------------------

function SectionHeader({ icon, title, action }: { icon: React.ReactNode; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-sm font-semibold flex items-center gap-2">{icon} {title}</h2>
      {action}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      {children}
    </div>
  );
}

function shuffle3<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, 3);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // --- Post Ideas ------------------------------------------------------
  const [unusedIdeas, setUnusedIdeas] = useState<PostIdea[] | null>(null);
  const [shownIdeas, setShownIdeas] = useState<PostIdea[]>([]);

  const loadIdeas = useCallback(async () => {
    const res = await fetch("/api/sheets?tab=Post Ideas&range=A:H");
    if (!res.ok) { setUnusedIdeas([]); return; }
    const { rows } = await res.json();
    const all: PostIdea[] = (rows as string[][]).slice(1).map((r, i) => ({
      idea_angle: r[0], suggested_format: r[1], funnel_stage: r[2], tags: r[3],
      lead_magnet_ideas: r[4], source: r[5], status: r[6], scheduled_slot: r[7],
      row: i + 2,
    })).filter((p) => p.idea_angle);
    const unused = all.filter((p) => p.status === "unused");
    setUnusedIdeas(unused);
    setShownIdeas(shuffle3(unused));
  }, []);

  useEffect(() => { loadIdeas(); }, [loadIdeas]);

  // --- Creators ----------------------------------------------------------
  const [creators, setCreators] = useState<Creator[] | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/sheets?tab=Creators&range=A:H");
      if (!res.ok) { setCreators([]); return; }
      const { rows } = await res.json();
      setCreators(
        (rows as string[][]).slice(1).map((r, i) => ({
          name: r[0], linkedin_url: r[1], niche: r[2], last_post_date: r[3],
          post_frequency: r[4], primary_format: r[5], notes: r[6], row: i + 2,
        })).filter((c) => c.name)
      );
    })();
  }, []);

  // --- Engagement Hub weekly target --------------------------------------
  const [weeklyTarget, setWeeklyTarget] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/sheets?tab=Config&range=A:B");
      if (!res.ok) { setWeeklyTarget(5 * 7); return; }
      const { rows } = await res.json();
      const row = (rows as string[][]).slice(1).find((r) => r[0] === "comments_daily_cap");
      const dailyCap = parseInt(row?.[1] || "5", 10) || 5;
      setWeeklyTarget(dailyCap * 7);
    })();
  }, []);

  // --- Posts tracking ------------------------------------------------------
  const [trackedPosts, setTrackedPosts] = useState<TrackedPost[] | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/sheets?tab=Posts&range=A:Q");
      if (!res.ok) { setTrackedPosts([]); return; }
      const { rows } = await res.json();
      const posts: TrackedPost[] = (rows as string[][]).slice(1).map((r, i) => ({
        posted_url: r[11], likes: r[12], comments: r[13], views: r[14], worked: r[15],
        row: i + 2,
      })).filter((p) => p.posted_url);
      setTrackedPosts(posts);
    })();
  }, []);

  const totalLikes = trackedPosts?.reduce((sum, p) => sum + (parseInt(p.likes, 10) || 0), 0) ?? 0;
  const totalComments = trackedPosts?.reduce((sum, p) => sum + (parseInt(p.comments, 10) || 0), 0) ?? 0;
  const winners = trackedPosts?.filter((p) => p.worked?.toLowerCase() === "winner").length ?? 0;
  const neutrals = trackedPosts?.filter((p) => p.worked?.toLowerCase() === "neutral").length ?? 0;
  const flops = trackedPosts?.filter((p) => p.worked?.toLowerCase() === "flop").length ?? 0;

  return (
    <div className="max-w-lg lg:max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Overview</p>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <LayoutDashboard size={20} className="text-indigo-400" /> Dashboard
        </h1>
      </div>

      {/* 1. Post ideas for you */}
      <div className="rounded-2xl p-4 border space-y-3" style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)" }}>
        <SectionHeader
          icon={<Lightbulb size={16} className="text-amber-400" />}
          title="Post ideas for you"
          action={
            <button
              onClick={() => unusedIdeas && setShownIdeas(shuffle3(unusedIdeas))}
              disabled={!unusedIdeas || unusedIdeas.length === 0}
              className="text-xs flex items-center gap-1 text-indigo-300 disabled:opacity-40 disabled:pointer-events-none"
            >
              <RefreshCw size={12} /> New ideas
            </button>
          }
        />

        {unusedIdeas === null && <p className="text-sm text-muted-foreground">Loading...</p>}

        {unusedIdeas !== null && unusedIdeas.length === 0 && (
          <EmptyState>No unused ideas yet — add rows to the Post Ideas tab, or run a capture script.</EmptyState>
        )}

        {shownIdeas.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {shownIdeas.map((idea) => (
              <div key={idea.row} className="rounded-xl border p-3 space-y-2" style={{ background: "var(--surface-3)", borderColor: "var(--border-subtle)" }}>
                <p className="text-sm font-medium line-clamp-3">{idea.idea_angle}</p>
                <div className="flex flex-wrap gap-1.5">
                  {idea.suggested_format && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 text-muted-foreground">{idea.suggested_format}</span>
                  )}
                  {idea.funnel_stage && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold badge-${idea.funnel_stage.toLowerCase()}`}>{idea.funnel_stage}</span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => showToast("Run /linkedin-post in Claude Code to draft this")}
                >
                  <Sparkles size={13} className="mr-1" /> Generate post
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. High-performing creators */}
      <div className="rounded-2xl p-4 border space-y-3" style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)" }}>
        <SectionHeader icon={<Users size={16} className="text-emerald-400" />} title="High-performing creators" />

        {creators === null && <p className="text-sm text-muted-foreground">Loading...</p>}

        {creators !== null && creators.length === 0 && (
          <EmptyState>No creators tracked yet — add rows to the Creators tab to see them here.</EmptyState>
        )}

        {creators && creators.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {creators.slice(0, 3).map((c) => (
              <div key={c.row} className="rounded-xl border p-3 space-y-2" style={{ background: "var(--surface-3)", borderColor: "var(--border-subtle)" }}>
                <div>
                  <p className="text-sm font-semibold">{c.name}</p>
                  {c.niche && <p className="text-xs text-muted-foreground">{c.niche}</p>}
                </div>
                {c.primary_format && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 text-muted-foreground inline-block">{c.primary_format}</span>
                )}
                <Link href="/networking" className="block">
                  <Button size="sm" variant="outline" className="w-full">Repurpose posts</Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Engagement Hub widget */}
      <div className="rounded-2xl p-4 border space-y-3" style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)" }}>
        <SectionHeader icon={<MessageCircle size={16} className="text-indigo-400" />} title="Your Engagement Hub" />

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Weekly progress</span>
            <span>0/{weeklyTarget ?? "…"} comments sent this week</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden bg-black/10">
            <div className="h-full bg-indigo-400" style={{ width: "0%" }} />
          </div>
        </div>

        <Link href="/engagement" className="block">
          <Button size="sm" className="w-full">Go to Engagement Hub</Button>
        </Link>
      </div>

      {/* 4. Tracking dashboard */}
      <div className="rounded-2xl p-4 border space-y-3" style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)" }}>
        <SectionHeader icon={<BarChart3 size={16} className="text-blue-400" />} title="Your profile, at a glance" />

        {trackedPosts === null && <p className="text-sm text-muted-foreground">Loading...</p>}

        {trackedPosts !== null && trackedPosts.length === 0 && (
          <EmptyState>No published posts tracked yet — run <code>sync-post-stats.mjs</code> after your first post goes live.</EmptyState>
        )}

        {trackedPosts && trackedPosts.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border p-3 space-y-1" style={{ background: "var(--surface-3)", borderColor: "var(--border-subtle)" }}>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Posts tracked</p>
              <p className="text-xl font-bold">{trackedPosts.length}</p>
            </div>
            <div className="rounded-xl border p-3 space-y-1" style={{ background: "var(--surface-3)", borderColor: "var(--border-subtle)" }}>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide flex items-center gap-1"><Heart size={11} /> Total likes</p>
              <p className="text-xl font-bold">{totalLikes}</p>
            </div>
            <div className="rounded-xl border p-3 space-y-1" style={{ background: "var(--surface-3)", borderColor: "var(--border-subtle)" }}>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide flex items-center gap-1"><MessageCircle size={11} /> Total comments</p>
              <p className="text-xl font-bold">{totalComments}</p>
            </div>
            <div className="rounded-xl border p-3 space-y-1.5" style={{ background: "var(--surface-3)", borderColor: "var(--border-subtle)" }}>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Worked verdict</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1 text-green-400"><Trophy size={11} /> {winners}</span>
                <span className="flex items-center gap-1 text-amber-400"><Meh size={11} /> {neutrals}</span>
                <span className="flex items-center gap-1 text-red-400"><Frown size={11} /> {flops}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl px-4 py-2.5 text-sm shadow-lg flex items-center gap-2"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)" }}
        >
          <ExternalLink size={14} className="text-indigo-400" /> {toast}
        </div>
      )}
    </div>
  );
}
