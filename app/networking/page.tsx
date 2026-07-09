"use client";

import { useState, useEffect } from "react";
import { Users, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATUSES = ["not_contacted", "requested", "connected", "ignored"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_LABELS: Record<Status, string> = {
  not_contacted: "Not Contacted",
  requested: "Requested",
  connected: "Connected",
  ignored: "Ignored",
};

const statusColors: Record<Status, string> = {
  not_contacted: "bg-gray-500/20 text-gray-300",
  requested: "bg-amber-500/20 text-amber-300",
  connected: "bg-green-500/20 text-green-300",
  ignored: "bg-red-500/20 text-red-300",
};

interface Connect {
  name: string;
  profile_url: string;
  commented_on: string;
  source_expert: string;
  date_added: string;
  status: string;
  notes: string;
  row: number;
}

function ConnectCard({ connect, onUpdateStatus }: { connect: Connect; onUpdateStatus: (c: Connect, status: string) => void }) {
  return (
    <div className="rounded-xl border p-3 space-y-2" style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)" }}>
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-sm truncate">{connect.name || "Unknown"}</p>
        {connect.profile_url && (
          <a
            href={connect.profile_url}
            target="_blank"
            rel="noreferrer"
            className="flex-shrink-0 text-indigo-300 hover:text-indigo-200"
            title="Open profile"
          >
            <ExternalLink size={14} />
          </a>
        )}
      </div>
      {connect.source_expert && (
        <p className="text-xs text-muted-foreground truncate">via {connect.source_expert}</p>
      )}
      {connect.date_added && (
        <p className="text-[10px] text-muted-foreground">{connect.date_added}</p>
      )}
      <div className="flex flex-wrap gap-1 pt-1">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => onUpdateStatus(connect, s)}
            className={`text-[10px] px-2 py-1 rounded-full font-medium transition-colors ${
              connect.status === s ? statusColors[s] : "border border-white/10 text-muted-foreground hover:bg-white/5"
            }`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function NetworkingPage() {
  const [connects, setConnects] = useState<Connect[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [captureUrl, setCaptureUrl] = useState("");
  const [captureExpert, setCaptureExpert] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [captureMsg, setCaptureMsg] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch("/api/sheets?tab=Connects&range=A:G");
    if (res.ok) {
      const { rows } = await res.json();
      setConnects(
        (rows as string[][])
          .slice(1)
          .map((r, i) => ({
            name: r[0] || "",
            profile_url: r[1] || "",
            commented_on: r[2] || "",
            source_expert: r[3] || "",
            date_added: r[4] || "",
            status: r[5] || "not_contacted",
            notes: r[6] || "",
            row: i + 2,
          }))
          .filter((c) => c.name)
      );
    }
    setLoaded(true);
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (connect: Connect, status: string) => {
    await fetch("/api/sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tab: "Connects",
        action: "update",
        rowIndex: connect.row,
        values: [
          connect.name,
          connect.profile_url,
          connect.commented_on,
          connect.source_expert,
          connect.date_added,
          status,
          connect.notes,
        ],
      }),
    });
    await load();
  };

  const capture = async () => {
    if (!captureUrl.trim()) return;
    setCapturing(true);
    setCaptureMsg(null);
    try {
      const res = await fetch("/api/connects/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: captureUrl.trim(), expert: captureExpert.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setCaptureMsg(
          data.added > 0
            ? `Added ${data.added} new connect${data.added === 1 ? "" : "s"}.`
            : "No new commenters found (or all already logged)."
        );
        setCaptureUrl("");
        setCaptureExpert("");
        await load();
      } else {
        setCaptureMsg(data.error || "Capture failed.");
      }
    } catch {
      setCaptureMsg("Capture failed.");
    } finally {
      setCapturing(false);
    }
  };

  return (
    <div className="max-w-lg lg:max-w-5xl mx-auto px-4 py-6 space-y-5">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Content</p>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Users size={20} className="text-indigo-400" /> Networking
        </h1>
      </div>

      {/* Capture from post */}
      <div className="rounded-2xl p-4 border space-y-3" style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)" }}>
        <p className="text-sm font-semibold flex items-center gap-1.5">
          <Sparkles size={14} className="text-indigo-400" /> Capture from post
        </p>
        <p className="text-xs text-muted-foreground">
          Paste a tracked expert&apos;s post URL to pull real commenters into your Connects list — free, public-page scrape, no login.
        </p>
        <input
          value={captureUrl}
          onChange={(e) => setCaptureUrl(e.target.value)}
          placeholder="LinkedIn post URL *"
          className="w-full px-3 py-2.5 rounded-xl text-sm bg-black/20 border border-white/10 text-foreground placeholder:text-muted-foreground outline-none"
        />
        <input
          value={captureExpert}
          onChange={(e) => setCaptureExpert(e.target.value)}
          placeholder="Source expert (whose post this is)"
          className="w-full px-3 py-2.5 rounded-xl text-sm bg-black/20 border border-white/10 text-foreground placeholder:text-muted-foreground outline-none"
        />
        <Button onClick={capture} disabled={!captureUrl.trim() || capturing} className="w-full">
          {capturing ? "Capturing..." : "Capture Commenters"}
        </Button>
        {captureMsg && <p className="text-xs text-indigo-300">{captureMsg}</p>}
      </div>

      {/* Status board */}
      {loaded && connects.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground" style={{ borderColor: "var(--border-subtle)" }}>
          No connects yet. Use &quot;Capture from post&quot; above against a tracked expert&apos;s high-engagement post to build your first list.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {STATUSES.map((status) => {
            const items = connects.filter((c) => (c.status || "not_contacted") === status);
            return (
              <div key={status} className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-semibold text-muted-foreground">{STATUS_LABELS[status]}</span>
                  <span className="text-[10px] text-muted-foreground">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-3 text-center text-[11px] text-muted-foreground" style={{ borderColor: "var(--border-subtle)" }}>
                      Empty
                    </div>
                  ) : (
                    items.map((c) => <ConnectCard key={c.row} connect={c} onUpdateStatus={updateStatus} />)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
