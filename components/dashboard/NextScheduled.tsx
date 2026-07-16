"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { safeDate } from "./time";

// The next upcoming slot from the Content Calendar (date >= today, still
// planned/swapped). One glanceable card so Sophiya always knows what's next.

interface Slot {
  date: string;
  day: string;
  profile: string;
  post_type: string;
  visual_type: string;
  angle_theme: string;
}

export default function NextScheduled() {
  const [slot, setSlot] = useState<Slot | null | "empty">(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/sheets?tab=${encodeURIComponent("Content Calendar")}&range=A:H`);
        if (!res.ok) { setSlot("empty"); return; }
        const { rows } = await res.json();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Cols: date|day|profile|post_type|visual_type|angle_theme|source|status
        const upcoming = (rows as string[][])
          .slice(1)
          .map((r) => ({
            date: r[0] || "",
            day: r[1] || "",
            profile: r[2] || "",
            post_type: r[3] || "",
            visual_type: r[4] || "",
            angle_theme: r[5] || "",
            status: (r[7] || "").trim().toLowerCase(),
            _d: safeDate(r[0] || ""),
          }))
          .filter((r) => r._d && r._d.getTime() >= today.getTime() && (r.status === "planned" || r.status === "swapped"))
          .sort((a, b) => a._d!.getTime() - b._d!.getTime());

        const next = upcoming[0];
        if (!next) { setSlot("empty"); return; }
        const { status, _d, ...rest } = next;
        void status; void _d;
        setSlot(rest);
      } catch {
        setSlot("empty");
      }
    })();
  }, []);

  return (
    <section className="rounded-2xl p-4 border space-y-3" style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)" }}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <CalendarClock size={16} style={{ color: "var(--cat-3)" }} /> Next scheduled post
        </h2>
        <Link href="/calendar" className="text-xs font-medium hover:underline" style={{ color: "var(--primary)" }}>
          Calendar →
        </Link>
      </div>

      {slot === null && (
        <div className="h-[92px] rounded-xl border animate-pulse" style={{ background: "var(--surface-pulse)", borderColor: "var(--border-subtle)" }} />
      )}

      {slot === "empty" && (
        <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground" style={{ borderColor: "var(--border-subtle)" }}>
          Nothing scheduled ahead. <Link href="/calendar" className="font-medium hover:underline" style={{ color: "var(--primary)" }}>Plan your next slot →</Link>
        </div>
      )}

      {slot !== null && slot !== "empty" && (
        <div className="rounded-xl border p-4 flex flex-wrap items-center gap-x-6 gap-y-3" style={{ background: "var(--surface-3)", borderColor: "var(--border-subtle)" }}>
          <div className="shrink-0">
            <p className="text-lg font-bold leading-tight" style={{ color: "var(--foreground)" }}>{slot.date}</p>
            {slot.day && <p className="text-xs text-muted-foreground">{slot.day}</p>}
          </div>

          <div className="flex-1 min-w-[180px] space-y-1.5">
            {slot.angle_theme && <p className="text-sm font-medium leading-snug line-clamp-2" style={{ color: "var(--foreground)" }}>{slot.angle_theme}</p>}
            <div className="flex flex-wrap gap-1.5">
              {slot.profile && <Chip>{slot.profile}</Chip>}
              {slot.post_type && <Chip>{slot.post_type}</Chip>}
              {slot.visual_type && <Chip>{slot.visual_type}</Chip>}
            </div>
          </div>

          <Link href="/calendar" className="shrink-0">
            <Button size="sm" variant="outline">
              Open <ArrowRight size={13} className="ml-1" />
            </Button>
          </Link>
        </div>
      )}
    </section>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full border" style={{ borderColor: "var(--border-subtle)", color: "var(--muted-foreground)" }}>
      {children}
    </span>
  );
}
