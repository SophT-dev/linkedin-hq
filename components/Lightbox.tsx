"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

// Full-screen image popup. Click backdrop or press Esc to close. Used by the
// Visual Inspo + Screenshot galleries so clicking an image opens it in place
// instead of navigating away.
export default function Lightbox({
  src,
  alt,
  caption,
  onClose,
}: {
  src: string;
  alt: string;
  caption?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-10"
      style={{ background: "oklch(0 0 0 / 82%)" }}
      onClick={onClose}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 p-2 rounded-full text-white/90 hover:bg-white/15 transition-colors"
      >
        <X size={22} />
      </button>
      <figure className="max-w-full max-h-full flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />
        {caption && <figcaption className="text-sm text-white/80 max-w-2xl text-center">{caption}</figcaption>}
      </figure>
    </div>
  );
}
