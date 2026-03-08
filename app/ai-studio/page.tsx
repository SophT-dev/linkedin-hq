"use client";

import { useState } from "react";
import { Sparkles, Copy, Check, ChevronDown, Send, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Tab = "comment" | "hook" | "ideas" | "strategy";

export default function AIStudio() {
  const [tab, setTab] = useState<Tab>("comment");

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">AI Studio</p>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Sparkles size={20} className="text-indigo-400" />
          Your AI Content Engine
        </h1>
      </div>

      {/* Tab switcher */}
      <div
        className="flex rounded-xl p-1 gap-1"
        style={{ background: "oklch(0.205 0 0)" }}
      >
        {(["comment", "hook", "ideas", "strategy"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all ${
              tab === t
                ? "bg-indigo-500 text-white"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "comment" ? "Comments" : t === "hook" ? "Hook Score" : t === "ideas" ? "Post Ideas" : "Strategy"}
          </button>
        ))}
      </div>

      {tab === "comment" && <CommentGenerator />}
      {tab === "hook" && <HookScorer />}
      {tab === "ideas" && <IdeasGenerator />}
      {tab === "strategy" && <StrategyChat />}
    </div>
  );
}

/* ─── Comment Generator ─── */
function CommentGenerator() {
  const [postText, setPostText] = useState("");
  const [platform, setPlatform] = useState<"linkedin" | "reddit">("linkedin");
  const [goal, setGoal] = useState("Authority");
  const [comments, setComments] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);

  const GOALS = ["Authority", "Engagement", "Start conversation", "Subtle lead gen"];

  const generate = async () => {
    if (!postText.trim()) return;
    setLoading(true);
    setComments([]);
    try {
      const res = await fetch("/api/ai/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postText, platform, goal }),
      });
      const data = await res.json();
      setComments(data.comments || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const copy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Platform toggle */}
      <div className="flex gap-2">
        {(["linkedin", "reddit"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPlatform(p)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium capitalize border transition-all ${
              platform === p
                ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300"
                : "border-white/10 text-muted-foreground hover:border-white/20"
            }`}
          >
            {p === "linkedin" ? "LinkedIn" : "Reddit"}
          </button>
        ))}
      </div>

      {/* Goal selector */}
      <div className="flex flex-wrap gap-2">
        {GOALS.map((g) => (
          <button
            key={g}
            onClick={() => setGoal(g)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
              goal === g
                ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300"
                : "border-white/10 text-muted-foreground hover:border-white/20"
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Post input */}
      <div
        className="rounded-2xl p-4 border"
        style={{ background: "oklch(0.205 0 0)", borderColor: "oklch(1 0 0 / 8%)" }}
      >
        <p className="text-xs text-muted-foreground mb-2">Paste the {platform} post here</p>
        <Textarea
          value={postText}
          onChange={(e) => setPostText(e.target.value)}
          placeholder={`Paste the ${platform} post you want to comment on...`}
          className="min-h-[120px] bg-black/20 border-white/10 text-sm"
        />
        <Button onClick={generate} disabled={!postText.trim() || loading} className="w-full mt-3 h-10">
          {loading ? "Generating..." : "Generate 3 Comments"}
        </Button>
      </div>

      {/* Results */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl p-4 border animate-pulse" style={{ background: "oklch(0.205 0 0)", borderColor: "oklch(1 0 0 / 8%)" }}>
              <div className="space-y-2">
                <div className="h-3 rounded" style={{ width: "90%", background: "oklch(0.3 0 0)" }} />
                <div className="h-3 rounded" style={{ width: "70%", background: "oklch(0.3 0 0)" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {comments.map((c, i) => (
        <div
          key={i}
          className="rounded-2xl p-4 border space-y-3"
          style={{ background: "oklch(0.205 0 0)", borderColor: "oklch(1 0 0 / 8%)" }}
        >
          <div className="flex items-start justify-between gap-3">
            <span className="text-xs text-muted-foreground font-medium">Option {i + 1}</span>
            <button
              onClick={() => copy(c, i)}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all hover:bg-white/5"
              style={{ borderColor: "oklch(1 0 0 / 10%)" }}
            >
              {copied === i ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
              {copied === i ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-line">{c}</p>
        </div>
      ))}
    </div>
  );
}

/* ─── Hook Scorer ─── */
function HookScorer() {
  const [hook, setHook] = useState("");
  const [result, setResult] = useState<{ score: number; reasoning: string; improved: string[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);

  const score = async () => {
    if (!hook.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/ai/hook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hook }),
      });
      setResult(await res.json());
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const copy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  const scoreColor = result
    ? result.score >= 8
      ? "text-green-400"
      : result.score >= 5
      ? "text-amber-400"
      : "text-red-400"
    : "";

  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl p-4 border space-y-3"
        style={{ background: "oklch(0.205 0 0)", borderColor: "oklch(1 0 0 / 8%)" }}
      >
        <p className="text-xs text-muted-foreground">Paste your hook (first line of your LinkedIn post)</p>
        <Textarea
          value={hook}
          onChange={(e) => setHook(e.target.value)}
          placeholder="e.g. I sent 10,000 cold emails last month. Here's what actually worked."
          className="min-h-[80px] bg-black/20 border-white/10 text-sm"
        />
        <Button onClick={score} disabled={!hook.trim() || loading} className="w-full h-10">
          {loading ? "Scoring..." : "Score This Hook"}
        </Button>
      </div>

      {result && (
        <div className="space-y-3">
          {/* Score */}
          <div
            className="rounded-2xl p-5 border text-center"
            style={{ background: "oklch(0.205 0 0)", borderColor: "oklch(1 0 0 / 8%)" }}
          >
            <div className={`text-6xl font-black ${scoreColor}`}>{result.score}<span className="text-2xl text-muted-foreground">/10</span></div>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{result.reasoning}</p>
          </div>

          {/* Improved versions */}
          {result.improved?.map((v, i) => (
            <div
              key={i}
              className="rounded-2xl p-4 border"
              style={{ background: "oklch(0.205 0 0)", borderColor: "oklch(1 0 0 / 8%)" }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-indigo-400 font-medium">Improved Version {i + 1}</span>
                <button
                  onClick={() => copy(v, i)}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border hover:bg-white/5"
                  style={{ borderColor: "oklch(1 0 0 / 10%)" }}
                >
                  {copied === i ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                  {copied === i ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="text-sm font-medium">{v}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Post Ideas Generator ─── */
function IdeasGenerator() {
  const [funnelStage, setFunnelStage] = useState("TOFU");
  const [format, setFormat] = useState("Text");
  const [seedTopic, setSeedTopic] = useState("");
  const [ideas, setIdeas] = useState<{ hook: string; angle: string; leadMagnet: string; funnelStage: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const FUNNEL = ["TOFU", "MOFU", "BOFU"];
  const FORMATS = ["Text", "Carousel", "Story", "Listicle"];

  const generate = async () => {
    setLoading(true);
    setIdeas([]);
    try {
      const res = await fetch("/api/ai/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ funnelStage, format, seedTopic }),
      });
      const data = await res.json();
      setIdeas(data.ideas || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const saveIdea = async (idea: { hook: string; angle: string; leadMagnet: string; funnelStage: string }) => {
    await fetch("/api/sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tab: "IdeasBank",
        values: [idea.hook + " — " + idea.angle, "Post", idea.funnelStage, idea.leadMagnet, "New", "", new Date().toISOString()],
      }),
    });
  };

  const funnelColors: Record<string, string> = {
    TOFU: "badge-tofu",
    MOFU: "badge-mofu",
    BOFU: "badge-bofu",
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div
        className="rounded-2xl p-4 border space-y-3"
        style={{ background: "oklch(0.205 0 0)", borderColor: "oklch(1 0 0 / 8%)" }}
      >
        <div>
          <p className="text-xs text-muted-foreground mb-2">Funnel Stage</p>
          <div className="flex gap-2">
            {FUNNEL.map((f) => (
              <button
                key={f}
                onClick={() => setFunnelStage(f)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                  funnelStage === f ? funnelColors[f] : "border-white/10 text-muted-foreground hover:border-white/20"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-2">Format</p>
          <div className="flex gap-2 flex-wrap">
            {FORMATS.map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  format === f
                    ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300"
                    : "border-white/10 text-muted-foreground hover:border-white/20"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <input
          type="text"
          value={seedTopic}
          onChange={(e) => setSeedTopic(e.target.value)}
          placeholder="Seed topic (optional) — e.g. deliverability, personalization..."
          className="w-full px-3 py-2.5 rounded-xl text-sm bg-black/20 border border-white/10 text-foreground placeholder:text-muted-foreground outline-none focus:border-indigo-500/50"
        />

        <Button onClick={generate} disabled={loading} className="w-full h-10">
          {loading ? "Generating 5 Ideas..." : "Generate Post Ideas"}
        </Button>
      </div>

      {/* Ideas */}
      {ideas.map((idea, i) => (
        <div
          key={i}
          className="rounded-2xl p-4 border space-y-3"
          style={{ background: "oklch(0.205 0 0)", borderColor: "oklch(1 0 0 / 8%)" }}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${funnelColors[idea.funnelStage]}`}>
              {idea.funnelStage}
            </span>
            <button
              onClick={() => saveIdea(idea)}
              className="text-xs text-indigo-400 hover:underline"
            >
              Save to Ideas Bank
            </button>
          </div>
          <p className="text-sm font-semibold leading-snug">{idea.hook}</p>
          <p className="text-xs text-muted-foreground">{idea.angle}</p>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Lead magnet:</span>
            <span className="text-indigo-300">{idea.leadMagnet}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Strategy Chat ─── */
function StrategyChat() {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    {
      role: "assistant",
      content: "Hey Taha! I'm your LinkedIn strategy partner. Ask me anything — post ideas, competitor tactics, lead magnet ideas, whether to tag someone, how to structure your funnel, or what to try next. What's on your mind?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user" as const, content: input.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated }),
      });
      const { reply } = await res.json();
      setMessages([...updated, { role: "assistant", content: reply }]);
    } catch (err) {
      console.error(err);
      setMessages([...updated, { role: "assistant", content: "Something went wrong. Try again." }]);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      {/* Chat messages */}
      <div className="space-y-3 max-h-[55vh] overflow-y-auto">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-indigo-500 text-white rounded-br-sm"
                  : "rounded-bl-sm"
              }`}
              style={m.role === "assistant" ? { background: "oklch(0.205 0 0)", border: "1px solid oklch(1 0 0 / 8%)" } : {}}
            >
              <p className="whitespace-pre-line">{m.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div
              className="rounded-2xl rounded-bl-sm px-4 py-3"
              style={{ background: "oklch(0.205 0 0)", border: "1px solid oklch(1 0 0 / 8%)" }}
            >
              <div className="flex gap-1.5 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ask your strategy partner anything..."
          className="bg-black/20 border-white/10 text-sm min-h-[48px] max-h-[120px]"
          rows={1}
        />
        <Button onClick={send} disabled={!input.trim() || loading} size="icon" className="h-12 w-12 flex-shrink-0">
          <Send size={18} />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center flex items-center gap-1 justify-center">
        <MessageSquare size={12} />
        Powered by Claude — pre-loaded with your niche, voice, and funnel
      </p>
    </div>
  );
}
