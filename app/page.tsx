"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ExternalLink, RefreshCw, CheckCircle2, Circle,
  Flame, Zap, AlertCircle, Users
} from "lucide-react";

const StreakChart = dynamic(() => import("@/components/StreakChart"), { ssr: false });

interface ChecklistState {
  check_competitors: boolean;
  commented: boolean;
  connected: boolean;
  posted: boolean;
  logged_analytics: boolean;
  checked_reddit: boolean;
  knowledge_base: boolean;
}

const CHECKLIST_LABELS: Record<keyof ChecklistState, string> = {
  check_competitors: "Check competitor posts",
  commented: "Comment on 3 posts",
  connected: "Send 5 connection requests",
  posted: "Publish today's post",
  logged_analytics: "Log this week's analytics",
  checked_reddit: "Check Reddit threads",
  knowledge_base: "Add to Knowledge Base",
};

const DEFAULT_CHECKS: ChecklistState = {
  check_competitors: false,
  commented: false,
  connected: false,
  posted: false,
  logged_analytics: false,
  checked_reddit: false,
  knowledge_base: false,
};

export default function Dashboard() {
  const [checks, setChecks] = useState<ChecklistState>(DEFAULT_CHECKS);
  const [brief, setBrief] = useState<string>("");
  const [briefLoading, setBriefLoading] = useState(true);
  const [history, setHistory] = useState<string[][]>([]);
  const [streak, setStreak] = useState(0);
  const [creators, setCreators] = useState<{ name: string; url: string }[]>([]);
  const [redditCount, setRedditCount] = useState(0);
  const [saving, setSaving] = useState(false);

  const completedCount = Object.values(checks).filter(Boolean).length;
  const totalCount = Object.keys(checks).length;
  const pct = Math.round((completedCount / totalCount) * 100);

  const loadData = useCallback(async () => {
    try {
      const [clRes, crRes, rdRes] = await Promise.all([
        fetch("/api/checklist"),
        fetch("/api/sheets?tab=Creators&range=A:B"),
        fetch("/api/sheets?tab=RedditFlagged&range=A:F"),
      ]);

      if (clRes.ok) {
        const { today, history: hist } = await clRes.json();
        setHistory(hist || []);
        if (today) {
          setStreak(today[8] ? parseInt(today[8]) : 0);
          setChecks({
            check_competitors: today[1] === "TRUE",
            commented: today[2] === "TRUE",
            connected: today[3] === "TRUE",
            posted: today[4] === "TRUE",
            logged_analytics: today[5] === "TRUE",
            checked_reddit: today[6] === "TRUE",
            knowledge_base: today[7] === "TRUE" || false,
          });
        }
      }

      if (crRes.ok) {
        const { rows } = await crRes.json();
        setCreators(
          (rows as string[][]).slice(1)
            .map((r) => ({ name: r[0] || "", url: r[1] || "" }))
            .filter((c) => c.name)
        );
      }

      if (rdRes.ok) {
        const { rows } = await rdRes.json();
        const unread = (rows as string[][]).slice(1).filter((r) => r[4] !== "TRUE").length;
        setRedditCount(unread);
      }
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    }
  }, []);

  const loadBrief = useCallback(async () => {
    setBriefLoading(true);
    try {
      const res = await fetch("/api/ai/brief");
      if (res.ok) {
        const { brief } = await res.json();
        setBrief(brief);
      }
    } catch (err) {
      console.error("Failed to load brief", err);
      setBrief("Could not load morning brief. Check your API key in settings.");
    }
    setBriefLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    loadBrief();
  }, [loadData, loadBrief]);

  const toggleCheck = async (key: keyof ChecklistState) => {
    const updated = { ...checks, [key]: !checks[key] };
    setChecks(updated);
    setSaving(true);

    try {
      const res = await fetch("/api/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checks: updated }),
      });
      if (res.ok) {
        const { streak: newStreak } = await res.json();
        setStreak(newStreak);
      }
    } catch (err) {
      console.error("Failed to save checklist", err);
    }
    setSaving(false);
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-0.5">LinkedIn HQ</p>
          <h1 className="text-2xl font-bold leading-tight">
            Welcome back, Sophiya
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </p>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl mt-1"
          style={{ background: "oklch(0.75 0.18 85 / 15%)" }}
        >
          <Flame size={18} className="text-amber-400" />
          <span className="text-amber-400 font-bold text-sm">{streak}d streak</span>
        </div>
      </div>

      {/* Reddit alert banner */}
      {redditCount > 0 && (
        <Link
          href="/reddit"
          className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all hover:brightness-110"
          style={{ background: "oklch(0.60 0.22 25 / 10%)", borderColor: "oklch(0.60 0.22 25 / 30%)" }}
        >
          <AlertCircle size={18} style={{ color: "oklch(0.70 0.20 25)" }} className="flex-shrink-0" />
          <span className="text-sm" style={{ color: "oklch(0.75 0.15 25)" }}>
            <strong>{redditCount} new Reddit thread{redditCount > 1 ? "s" : ""}</strong> waiting for your reply
          </span>
          <ExternalLink size={14} style={{ color: "oklch(0.70 0.20 25)" }} className="ml-auto" />
        </Link>
      )}

      {/* Morning Brief */}
      <div
        className="rounded-2xl p-4 space-y-3 border"
        style={{ background: "oklch(0.14 0.015 25)", borderColor: "oklch(0.60 0.22 25 / 18%)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={16} style={{ color: "oklch(0.65 0.22 25)" }} />
            <span className="text-sm font-semibold">Morning Brief</span>
          </div>
          <button
            onClick={loadBrief}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-white/5"
          >
            <RefreshCw size={14} className={briefLoading ? "animate-spin" : ""} />
          </button>
        </div>

        {briefLoading ? (
          <div className="space-y-2">
            {[80, 65, 90, 55].map((w, i) => (
              <div
                key={i}
                className="h-3 rounded-full animate-pulse"
                style={{ width: `${w}%`, background: "oklch(0.22 0.02 25)" }}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{brief}</p>
        )}
      </div>

      {/* Checklist */}
      <div
        className="rounded-2xl p-4 border"
        style={{ background: "oklch(0.14 0.015 25)", borderColor: "oklch(0.60 0.22 25 / 18%)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold">Today&apos;s Checklist</span>
          <span className="text-xs text-muted-foreground">
            {saving ? "Saving..." : `${completedCount}/${totalCount} · ${pct}%`}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full mb-4" style={{ background: "oklch(0.22 0.02 25)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: pct === 100 ? "oklch(0.65 0.2 145)" : "oklch(0.60 0.22 25)",
            }}
          />
        </div>

        <div className="space-y-0.5">
          {(Object.entries(CHECKLIST_LABELS) as [keyof ChecklistState, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => toggleCheck(key)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-left"
            >
              {checks[key] ? (
                <CheckCircle2 size={20} className="text-green-400 flex-shrink-0" />
              ) : (
                <Circle size={20} className="text-muted-foreground flex-shrink-0" />
              )}
              <span className={`text-sm flex-1 ${checks[key] ? "line-through text-muted-foreground" : ""}`}>
                {label}
              </span>
              {key === "knowledge_base" && (
                <a
                  href="https://docs.google.com/document/d/1VfkrdVm9HKd088_HbOH7RxxGtOhxBJQ1pwKq2_7cXsg/edit?tab=t.a9t163aiqlzy"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{ color: "oklch(0.65 0.22 25)" }}
                  className="p-1"
                >
                  <ExternalLink size={14} />
                </a>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 30-day streak chart */}
      <div
        className="rounded-2xl p-4 border"
        style={{ background: "oklch(0.14 0.015 25)", borderColor: "oklch(0.60 0.22 25 / 18%)" }}
      >
        <p className="text-sm font-semibold mb-4">30-Day Consistency</p>
        <StreakChart history={history} />
      </div>

      {/* Creator quick-links */}
      <div
        className="rounded-2xl p-4 border"
        style={{ background: "oklch(0.14 0.015 25)", borderColor: "oklch(0.60 0.22 25 / 18%)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users size={16} style={{ color: "oklch(0.65 0.22 25)" }} />
            <span className="text-sm font-semibold">Check Competitors</span>
          </div>
          <Link href="/creators" className="text-xs hover:underline" style={{ color: "oklch(0.65 0.22 25)" }}>
            Manage →
          </Link>
        </div>

        {creators.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {creators.map((c) => (
              <a
                key={c.name}
                href={c.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border transition-all hover:brightness-125"
                style={{ background: "oklch(0.22 0.02 25)", borderColor: "oklch(0.60 0.22 25 / 18%)" }}
              >
                {c.name}
                <ExternalLink size={12} className="text-muted-foreground" />
              </a>
            ))}
          </div>
        ) : (
          <Link
            href="/creators"
            className="flex items-center gap-3 px-3 py-3 rounded-xl border border-dashed text-muted-foreground hover:text-foreground transition-colors"
            style={{ borderColor: "oklch(0.60 0.22 25 / 25%)" }}
          >
            <Users size={18} />
            <span className="text-sm">Add your first competitor profile</span>
          </Link>
        )}
      </div>
    </div>
  );
}
