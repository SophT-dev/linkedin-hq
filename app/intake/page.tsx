"use client";

import { useState, useEffect } from "react";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function QuickIntake() {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [queuedCount, setQueuedCount] = useState<number | null>(null);
  const [justQueued, setJustQueued] = useState<number | null>(null);
  const [error, setError] = useState("");

  const loadCount = async () => {
    try {
      const res = await fetch("/api/lead-magnet/queue");
      if (res.ok) {
        const data = await res.json();
        setQueuedCount(typeof data.count === "number" ? data.count : null);
      }
    } catch {
      // non-fatal -- the count is just a nicety, submit still works without it
    }
  };

  useEffect(() => { loadCount(); }, []);

  const submit = async () => {
    const items = text.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!items.length) return;
    setSubmitting(true);
    setError("");
    setJustQueued(null);
    try {
      const res = await fetch("/api/lead-magnet/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to queue items");
      setJustQueued(data.queued);
      setText("");
      await loadCount();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg lg:max-w-3xl mx-auto px-4 lg:px-8 py-6 space-y-5">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Quick capture</p>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Inbox size={22} style={{ color: "var(--primary)" }} /> Quick intake
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Dump lead magnet links. One item per line: the post URL + the magnet link they DM&apos;d you.
          Claude processes the queue on the next /lm-intake run.
        </p>
      </div>

      <div className="rounded-2xl p-4 border border-border bg-card shadow-sm space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"https://linkedin.com/posts/... https://their-magnet-link.com note about who sent it\n..."}
          className="w-full px-3 py-2.5 rounded-xl text-sm bg-muted border border-border outline-none min-h-[240px] resize-none font-mono"
        />
        <Button onClick={submit} disabled={!text.trim() || submitting} className="w-full">
          {submitting ? "Queuing..." : "Queue items"}
        </Button>
      </div>

      {justQueued !== null && (
        <div className="rounded-2xl p-4 border border-border bg-card text-sm space-y-1">
          <p className="font-semibold">{justQueued} queued.</p>
          {queuedCount !== null && (
            <p className="text-muted-foreground">{queuedCount} total waiting in the queue.</p>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-2xl p-4 border border-border bg-card text-sm text-destructive">
          {error}
        </div>
      )}

      {justQueued === null && !error && queuedCount !== null && (
        <p className="text-xs text-muted-foreground">{queuedCount} currently queued.</p>
      )}
    </div>
  );
}
