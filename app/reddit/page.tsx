"use client";

import { useState, useEffect } from "react";
import { ExternalLink, CheckCheck, MessageSquare, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Thread {
  thread_title: string;
  url: string;
  subreddit: string;
  date: string;
  replied: string;
  notes: string;
  row: number;
}

export default function RedditMonitor() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [showReplied, setShowReplied] = useState(false);

  const load = async () => {
    const res = await fetch("/api/sheets?tab=RedditFlagged&range=A:G");
    if (res.ok) {
      const { rows } = await res.json();
      setThreads(
        (rows as string[][]).slice(1).map((r, i) => ({
          thread_title: r[0], url: r[1], subreddit: r[2], date: r[3],
          replied: r[4], notes: r[5], row: i + 2,
        })).filter((t) => t.thread_title).reverse()
      );
    }
  };

  useEffect(() => { load(); }, []);

  const markReplied = async (thread: Thread) => {
    await fetch("/api/sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tab: "RedditFlagged", action: "update", rowIndex: thread.row,
        values: [thread.thread_title, thread.url, thread.subreddit, thread.date, "TRUE", thread.notes],
      }),
    });
    await load();
  };

  const filtered = threads.filter((t) => showReplied || t.replied !== "TRUE");
  const unreplied = threads.filter((t) => t.replied !== "TRUE").length;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Reddit</p>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <MessageSquare size={20} className="text-indigo-400" /> Reddit Monitor
          {unreplied > 0 && <span className="bg-indigo-500 text-white text-xs px-2 py-0.5 rounded-full">{unreplied}</span>}
        </h1>
      </div>

      {/* Info banner */}
      <div className="rounded-xl p-3 border text-sm text-muted-foreground" style={{ borderColor: "var(--border-subtle)", background: "var(--surface-2)" }}>
        Threads are auto-flagged by n8n every 2 hours from r/ColdEmail, r/Emailmarketing, r/B2Bsales. Tap &ldquo;Generate Reply&rdquo; to go to AI Studio pre-filled.
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowReplied(!showReplied)}
          className={`text-xs px-3 py-1.5 rounded-full border transition-all ${showReplied ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300" : "border-white/10 text-muted-foreground"}`}
        >
          {showReplied ? "Show All" : "Show Unreplied Only"}
        </button>
        <span className="text-xs text-muted-foreground">{filtered.length} thread{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="space-y-3">
        {filtered.map((t) => (
          <div
            key={t.row}
            className={`rounded-xl p-4 border space-y-3 ${t.replied === "TRUE" ? "opacity-50" : ""}`}
            style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)" }}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">r/{t.subreddit}</span>
                {t.date && <span className="text-xs text-muted-foreground">· {t.date}</span>}
              </div>
              <p className="text-sm font-medium leading-snug">{t.thread_title}</p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={t.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-indigo-400 hover:underline"
              >
                <ExternalLink size={12} /> View thread
              </a>
              <Link
                href={`/ai-studio?platform=reddit&context=${encodeURIComponent(t.thread_title)}`}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/10 text-muted-foreground hover:text-foreground ml-auto"
              >
                <Sparkles size={12} /> Generate Reply
              </Link>
              {t.replied !== "TRUE" && (
                <button
                  onClick={() => markReplied(t)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-green-500/15 text-green-300 border border-green-500/20"
                >
                  <CheckCheck size={12} /> Replied
                </button>
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">{unreplied === 0 ? "All caught up! No unreplied threads." : "No threads flagged yet. n8n will populate this automatically."}</p>
          </div>
        )}
      </div>

      {/* Manual add section */}
      <div className="rounded-xl p-4 border" style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)" }}>
        <p className="text-xs text-muted-foreground mb-2 font-medium">n8n Setup Note</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Set up an n8n workflow to poll Reddit RSS feeds and POST new threads to <code className="text-indigo-300 text-[11px]">/api/sheets</code> with tab=&quot;RedditFlagged&quot;. See the setup guide for workflow details.
        </p>
      </div>
    </div>
  );
}
