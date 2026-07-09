"use client";

import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FiltersMenu({
  formats,
  active,
  onChange,
}: {
  formats: string[];
  active: string | null;
  onChange: (format: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
        <SlidersHorizontal size={13} className="mr-1" />
        Filters{active ? `: ${active}` : ""}
      </Button>
      {open && (
        <div
          className="absolute right-0 mt-2 z-20 w-56 rounded-xl border p-2 space-y-1"
          style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)" }}
        >
          <div className="flex items-center justify-between px-1 pb-1">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              Format
            </span>
            {active && (
              <button
                className="text-[11px] text-indigo-300 flex items-center gap-0.5"
                onClick={() => onChange(null)}
              >
                <X size={11} /> clear
              </button>
            )}
          </div>
          <div className="max-h-56 overflow-y-auto space-y-0.5">
            {formats.length === 0 && (
              <p className="text-xs text-muted-foreground px-1 py-1">No formats found.</p>
            )}
            {formats.map((f) => (
              <button
                key={f}
                onClick={() => {
                  onChange(active === f ? null : f);
                  setOpen(false);
                }}
                className={`w-full text-left text-xs px-2 py-1.5 rounded-lg ${
                  active === f
                    ? "bg-indigo-500/20 text-indigo-300"
                    : "hover:bg-white/5 text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
