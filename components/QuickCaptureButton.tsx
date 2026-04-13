"use client";

import { useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { Plus, Mic, MicOff, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const TAGS = ["Post Idea", "Hook", "Insight", "Strategy", "Competitor Note", "Random"];

export default function QuickCaptureButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [tag, setTag] = useState("Post Idea");
  const [source, setSource] = useState("");
  const [listening, setListening] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const toggleVoice = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert("Voice not supported on this browser. Use Chrome on Android or Safari on iOS.");
      return;
    }

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join("");
      setText(transcript);
    };

    recognition.onend = () => setListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
  };

  const handleSave = async () => {
    if (!text.trim()) return;
    setSaving(true);

    await fetch("/api/sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tab: "QuickCaptures",
        values: [
          new Date().toISOString(),
          text.trim(),
          tag,
          source.trim(),
          "FALSE",
        ],
      }),
    });

    setSaving(false);
    setSaved(true);
    setText("");
    setSource("");
    setTag("Post Idea");

    setTimeout(() => {
      setSaved(false);
      setOpen(false);
    }, 1200);
  };

  // Hide on public lead magnet landing pages so strangers don't see
  // internal quick-capture UI.
  if (pathname?.startsWith("/lead-magnet/")) return null;

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95"
          style={{
            background: "oklch(0.488 0.243 264.376)",
            boxShadow: "0 4px 24px oklch(0.488 0.243 264.376 / 50%)",
          }}
          aria-label="Quick Capture"
        >
          <Plus size={28} strokeWidth={2.5} className="text-white" />
        </button>
      )}

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: "oklch(0 0 0 / 70%)", backdropFilter: "blur(4px)" }}
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-5 space-y-4"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-base">Quick Capture</h2>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground p-1">
                <X size={20} />
              </button>
            </div>

            {/* Tag selector */}
            <div className="flex flex-wrap gap-2">
              {TAGS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTag(t)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                    tag === t
                      ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300"
                      : "border-white/10 text-muted-foreground hover:border-white/20"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Text area */}
            <div className="relative">
              <Textarea
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="What's on your mind? Tap the mic to speak..."
                className="min-h-[120px] text-base bg-black/20 border-white/10 pr-12"
              />
              <button
                onClick={toggleVoice}
                className={`absolute top-3 right-3 p-1.5 rounded-lg transition-colors ${
                  listening
                    ? "text-red-400 bg-red-400/10 animate-pulse"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {listening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
            </div>

            {/* Source (optional) */}
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Source URL (optional — YouTube, article, etc.)"
              className="w-full px-3 py-2 rounded-lg text-sm bg-black/20 border border-white/10 text-foreground placeholder:text-muted-foreground outline-none focus:border-indigo-500/50"
            />

            {/* Save button */}
            <Button
              onClick={handleSave}
              disabled={!text.trim() || saving}
              className="w-full h-11 text-base font-medium"
              style={{ background: saved ? "oklch(0.65 0.2 145)" : undefined }}
            >
              {saved ? "Saved!" : saving ? "Saving..." : (
                <span className="flex items-center gap-2">
                  <Send size={16} /> Save to Sheets
                </span>
              )}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
