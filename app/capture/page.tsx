"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Send, Trash2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const TAGS = ["Post Idea", "Hook", "Insight", "Strategy", "Competitor Note", "Random"];

interface Capture {
  timestamp: string;
  content: string;
  tag: string;
  source: string;
}

export default function QuickCapturePage() {
  const [text, setText] = useState("");
  const [tag, setTag] = useState("Post Idea");
  const [source, setSource] = useState("");
  const [listening, setListening] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [recent, setRecent] = useState<(Capture & { row: number })[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const loadRecent = async () => {
    const res = await fetch("/api/sheets?tab=QuickCaptures&range=A:E");
    if (res.ok) {
      const { rows } = await res.json();
      const data = (rows as string[][])
        .slice(1)
        .map((r, i) => ({
          timestamp: r[0],
          content: r[1],
          tag: r[2],
          source: r[3],
          row: i + 2,
        }))
        .reverse()
        .slice(0, 15);
      setRecent(data);
    }
  };

  useEffect(() => { loadRecent(); }, []);

  const toggleVoice = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Voice not supported. Use Chrome."); return; }
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";
    r.onresult = (e: SpeechRecognitionEvent) => {
      setText(Array.from(e.results).map((result) => result[0].transcript).join(""));
    };
    r.onend = () => setListening(false);
    r.start();
    recognitionRef.current = r;
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
        values: [new Date().toISOString(), text.trim(), tag, source.trim(), "FALSE"],
      }),
    });
    setSaving(false);
    setSaved(true);
    setText("");
    setSource("");
    await loadRecent();
    setTimeout(() => setSaved(false), 2000);
  };

  const deleteCapture = async (row: number) => {
    await fetch("/api/sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tab: "QuickCaptures", action: "delete", rowIndex: row }),
    });
    await loadRecent();
  };

  const tagColors: Record<string, string> = {
    "Post Idea": "bg-blue-500/15 text-blue-300 border-blue-500/30",
    "Hook": "bg-purple-500/15 text-purple-300 border-purple-500/30",
    "Insight": "bg-amber-500/15 text-amber-300 border-amber-500/30",
    "Strategy": "bg-green-500/15 text-green-300 border-green-500/30",
    "Competitor Note": "bg-red-500/15 text-red-300 border-red-500/30",
    "Random": "bg-gray-500/15 text-gray-300 border-gray-500/30",
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Quick Capture</p>
        <h1 className="text-xl font-bold">Capture a Thought</h1>
      </div>

      {/* Tag selector */}
      <div className="flex flex-wrap gap-2">
        {TAGS.map((t) => (
          <button
            key={t}
            onClick={() => setTag(t)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
              tag === t ? tagColors[t] : "border-white/10 text-muted-foreground hover:border-white/20"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Capture form */}
      <div
        className="rounded-2xl p-4 border space-y-3"
        style={{ background: "oklch(0.205 0 0)", borderColor: "oklch(1 0 0 / 8%)" }}
      >
        <div className="relative">
          <Textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What's on your mind? Tap the mic to speak..."
            className="min-h-[140px] text-base bg-black/20 border-white/10 pr-12"
          />
          <button
            onClick={toggleVoice}
            className={`absolute top-3 right-3 p-2 rounded-xl transition-all ${
              listening
                ? "text-red-400 bg-red-400/10 animate-pulse"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            {listening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
        </div>

        <input
          type="text"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="Source URL (optional — YouTube, article, etc.)"
          className="w-full px-3 py-2.5 rounded-xl text-sm bg-black/20 border border-white/10 text-foreground placeholder:text-muted-foreground outline-none focus:border-indigo-500/50"
        />

        <Button
          onClick={handleSave}
          disabled={!text.trim() || saving}
          className="w-full h-11 text-base"
          style={{ background: saved ? "oklch(0.65 0.2 145)" : undefined }}
        >
          <Send size={16} className="mr-2" />
          {saved ? "Saved to Sheets!" : saving ? "Saving..." : "Save"}
        </Button>
      </div>

      {/* Recent captures */}
      {recent.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium flex items-center gap-2">
            <Tag size={12} />
            Recent Captures
          </p>
          {recent.map((c) => (
            <div
              key={c.row}
              className="rounded-xl p-3 border flex gap-3"
              style={{ background: "oklch(0.205 0 0)", borderColor: "oklch(1 0 0 / 8%)" }}
            >
              <div className="flex-1 min-w-0 space-y-1">
                <span className={`inline-block text-xs px-2 py-0.5 rounded-full border ${tagColors[c.tag] || tagColors["Random"]}`}>
                  {c.tag}
                </span>
                <p className="text-sm line-clamp-2">{c.content}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(c.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <button
                onClick={() => deleteCapture(c.row)}
                className="text-muted-foreground hover:text-red-400 transition-colors p-1 flex-shrink-0"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
