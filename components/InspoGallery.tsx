"use client";

import { useState, useEffect } from "react";
import Lightbox from "@/components/Lightbox";

interface InspoFile {
  file: string;
  url: string;
  category: string;
  description: string;
}

export default function InspoGallery() {
  const [files, setFiles] = useState<InspoFile[] | null>(null);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState<InspoFile | null>(null);

  useEffect(() => {
    fetch("/api/inspo")
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setFiles(d.files)))
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <p className="text-xs text-destructive">{error}</p>;
  if (!files) return <p className="text-sm text-muted-foreground">Loading...</p>;

  const byCategory = files.reduce<Record<string, InspoFile[]>>((acc, f) => {
    (acc[f.category] ||= []).push(f);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(byCategory).map(([category, items]) => (
        <div key={category}>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{category}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {items.map((f) => (
              <button
                key={f.file}
                onClick={() => setZoom(f)}
                className="group relative rounded-xl overflow-hidden border bg-card border-border shadow-sm hover:shadow-md transition-shadow block aspect-square cursor-zoom-in"
                title={f.description}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt={f.description || f.file} className="w-full h-full object-cover" loading="lazy" />
                {f.description && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-end p-2 opacity-0 group-hover:opacity-100">
                    <span className="text-[10px] text-white leading-tight">{f.description}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}

      {zoom && (
        <Lightbox src={zoom.url} alt={zoom.description || zoom.file} caption={zoom.description} onClose={() => setZoom(null)} />
      )}
    </div>
  );
}
