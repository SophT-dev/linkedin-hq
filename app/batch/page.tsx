"use client";

import { useState } from "react";
import { Sparkles, Copy, Check, ExternalLink, Save } from "lucide-react";

interface LeadMagnet {
  name: string;
  one_line_value_prop: string;
  suggested_cta: string;
}

interface GeneratedPost {
  hook: string;
  body: string;
  format: string;
  funnel_stage: string;
  visual_brief: string;
  lead_magnet: LeadMagnet;
  sources_used: string[];
  authenticity_tag: string;
}

interface BatchMeta {
  winsCount: number;
  starredCount: number;
  seedBriefProvided: boolean;
}

const TAG_COLORS: Record<string, string> = {
  Numbers: "#059669",
  Contrarian: "#dc2626",
  BTS: "#7c3aed",
  "Fresh-Research": "#0891b2",
};

export default function BatchPage() {
  const [seedBrief, setSeedBrief] = useState("");
  const [count, setCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [posts, setPosts] = useState<GeneratedPost[]>([]);
  const [meta, setMeta] = useState<BatchMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    setSavedMsg(null);
    try {
      const res = await fetch("/api/ai/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seedBrief, count }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "generation failed");
        setPosts([]);
        return;
      }
      setPosts(data.posts || []);
      setMeta(data.meta || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  };

  const saveAll = async () => {
    if (posts.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/posts/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posts }),
      });
      const data = await res.json();
      if (data.ok) {
        setSavedMsg(`saved ${data.saved} posts to the sheet as drafts`);
      } else {
        setSavedMsg(`error: ${data.error || "save failed"}`);
      }
    } catch (e) {
      setSavedMsg(`error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(false);
      setTimeout(() => setSavedMsg(null), 8000);
    }
  };

  const copyPost = async (post: GeneratedPost, idx: number) => {
    const text = `${post.hook}\n\n${post.body}\n\n${post.lead_magnet.suggested_cta}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-dvh px-4 pt-6 pb-24 max-w-2xl mx-auto">
      <header className="mb-4">
        <h1 className="text-xl font-bold lowercase">batch day</h1>
        <p className="text-xs text-muted-foreground lowercase">
          {new Date().toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </header>

      {/* Seed brief */}
      <div
        className="rounded-xl border p-4 mb-4"
        style={{
          background: "var(--surface-1)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <label className="text-[11px] uppercase tracking-wider text-muted-foreground block mb-2">
          seed brief (optional)
        </label>
        <textarea
          value={seedBrief}
          onChange={(e) => setSeedBrief(e.target.value)}
          placeholder="what should today's posts cover? paste topics, links, frameworks, raw thoughts. or leave blank to let the system pick from your starred news items."
          rows={5}
          className="w-full text-sm rounded-lg p-3 outline-none border resize-none"
          style={{
            background: "var(--surface-3)",
            borderColor: "var(--border-subtle)",
            color: "var(--foreground)",
          }}
        />
        <div className="flex items-center justify-between mt-3 gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              count
            </span>
            <input
              type="number"
              min={1}
              max={10}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(10, Number(e.target.value) || 5)))}
              className="w-14 text-sm text-center rounded-lg p-1.5 border outline-none"
              style={{
                background: "var(--surface-3)",
                borderColor: "var(--border-subtle)",
                color: "var(--foreground)",
              }}
            />
          </div>
          <button
            onClick={generate}
            disabled={generating}
            className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50"
            style={{
              background: "var(--color-accent)",
              color: "white",
            }}
          >
            <Sparkles size={16} />
            {generating ? "generating..." : `generate ${count}`}
          </button>
        </div>
      </div>

      {generating && (
        <div
          className="text-center py-10 px-4 rounded-xl border mb-4 text-sm text-muted-foreground"
          style={{
            background: "var(--surface-1)",
            borderColor: "var(--border-subtle)",
          }}
        >
          researching the latest cold email intel and drafting your posts...
          <br />
          <span className="text-xs opacity-70">this can take 30-90 seconds.</span>
        </div>
      )}

      {error && (
        <div
          className="px-4 py-3 rounded-xl mb-4 text-sm"
          style={{
            background: "var(--surface-2)",
            color: "#dc2626",
          }}
        >
          {error}
        </div>
      )}

      {meta && !generating && posts.length > 0 && (
        <div
          className="px-4 py-2 rounded-xl mb-4 text-xs"
          style={{
            background: "var(--surface-2)",
            color: "var(--muted-foreground, #888)",
          }}
        >
          used {meta.winsCount} wins, {meta.starredCount} starred news items
          {meta.seedBriefProvided ? ", + your seed brief" : ""}
        </div>
      )}

      {/* Generated posts */}
      {posts.length > 0 && (
        <div className="space-y-4">
          {posts.map((post, i) => {
            const tagColor = TAG_COLORS[post.authenticity_tag] || "var(--color-accent)";
            return (
              <div
                key={i}
                className="rounded-xl border p-4"
                style={{
                  background: "var(--surface-1)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                {/* Tags row */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md text-white"
                    style={{ background: tagColor }}
                  >
                    {post.authenticity_tag}
                  </span>
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md"
                    style={{
                      background: "var(--surface-3)",
                      color: "var(--foreground)",
                    }}
                  >
                    {post.format}
                  </span>
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md"
                    style={{
                      background: "var(--surface-3)",
                      color: "var(--foreground)",
                    }}
                  >
                    {post.funnel_stage}
                  </span>
                  <span className="text-[10px] text-muted-foreground opacity-70">
                    post {i + 1} of {posts.length}
                  </span>
                </div>

                {/* Hook */}
                <p
                  className="text-sm font-bold mb-2 leading-snug"
                  style={{ color: "var(--foreground)" }}
                >
                  {post.hook}
                </p>

                {/* Body */}
                <p
                  className="text-sm whitespace-pre-wrap mb-4 leading-relaxed"
                  style={{ color: "var(--foreground)" }}
                >
                  {post.body}
                </p>

                {/* Lead magnet */}
                <div
                  className="rounded-lg p-3 mb-3 border"
                  style={{
                    background: "var(--surface-2)",
                    borderColor: "var(--border-subtle)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                      lead magnet
                    </span>
                    <span
                      className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded"
                      style={{
                        background: "#facc15",
                        color: "#000",
                      }}
                    >
                      proposed
                    </span>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                    {post.lead_magnet.name}
                  </p>
                  <p className="text-xs text-muted-foreground mb-1">
                    {post.lead_magnet.one_line_value_prop}
                  </p>
                  <p className="text-xs italic" style={{ color: "var(--color-accent)" }}>
                    cta: {post.lead_magnet.suggested_cta}
                  </p>
                </div>

                {/* Visual brief */}
                <div
                  className="rounded-lg p-3 mb-3 border-l-2"
                  style={{
                    background: "var(--surface-2)",
                    borderColor: "var(--color-accent)",
                  }}
                >
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block mb-1">
                    visual brief
                  </span>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--foreground)" }}>
                    {post.visual_brief}
                  </p>
                </div>

                {/* Sources */}
                {post.sources_used && post.sources_used.length > 0 && (
                  <div className="mb-3">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block mb-1">
                      sources
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {post.sources_used.map((src, si) => {
                        const isUrl = src.startsWith("http");
                        return isUrl ? (
                          <a
                            key={si}
                            href={src}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border hover:underline"
                            style={{
                              background: "var(--surface-2)",
                              borderColor: "var(--border-subtle)",
                              color: "var(--color-accent)",
                            }}
                          >
                            <ExternalLink size={9} />
                            {new URL(src).hostname.replace("www.", "")}
                          </a>
                        ) : (
                          <span
                            key={si}
                            className="text-[10px] px-2 py-0.5 rounded-md"
                            style={{
                              background: "var(--surface-2)",
                              color: "var(--muted-foreground, #888)",
                            }}
                          >
                            {src}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => copyPost(post, i)}
                  className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border transition-colors"
                  style={{
                    background: "var(--surface-2)",
                    borderColor: "var(--border-subtle)",
                    color: copiedIdx === i ? "#059669" : "var(--foreground)",
                  }}
                >
                  {copiedIdx === i ? <Check size={12} /> : <Copy size={12} />}
                  {copiedIdx === i ? "copied" : "copy post"}
                </button>
              </div>
            );
          })}

          {/* Footer save bar */}
          <div className="sticky bottom-20 mt-6">
            <button
              onClick={saveAll}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 shadow-lg"
              style={{
                background: "var(--color-accent)",
                color: "white",
              }}
            >
              <Save size={16} />
              {saving ? "saving..." : `save all ${posts.length} to sheet`}
            </button>
            {savedMsg && (
              <div
                className="mt-2 text-center text-xs px-3 py-2 rounded-lg"
                style={{
                  background: "var(--surface-2)",
                  color: "var(--color-accent)",
                }}
              >
                {savedMsg}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
