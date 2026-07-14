"use client";

import { useState } from "react";
import { ThumbsUp, MessageCircle, Repeat2, Sparkles, Bookmark, BookmarkCheck, Wand2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export interface TemplateRow {
  id: string;
  hook: string;
  suggested_format: string;
  expert: string;
  domain: string;
  likes: number;
  comments: number;
  shares: number;
  comment_to_like_ratio: string;
  engagement_tier: string;
  url: string;
  date_added: string;
}

function formatNumber(n: number) {
  if (!n || Number.isNaN(n)) return "0";
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

export function PostCard({
  post,
  saved,
  onToggleSave,
}: {
  post: TemplateRow;
  saved: boolean;
  onToggleSave: (id: string) => void;
}) {
  const [whyOpen, setWhyOpen] = useState(false);
  const [remixOpen, setRemixOpen] = useState(false);

  const ratio = Number.parseFloat(post.comment_to_like_ratio);

  return (
    <div className="rounded-2xl border bg-card border-border shadow-sm p-4 flex flex-col gap-3 transition-shadow hover:shadow-md">
      {/* Prominent format badge on its own row so it always reads at a glance */}
      {post.suggested_format && (
        <span
          className="self-start inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border"
          style={{ background: "var(--accent)", color: "var(--primary)", borderColor: "var(--border-accent)" }}
        >
          <Tag size={12} strokeWidth={2.5} />
          {post.suggested_format}
        </span>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{post.expert || "Unknown creator"}</p>
          {post.domain && (
            <p className="text-[11px] text-muted-foreground truncate">{post.domain}</p>
          )}
        </div>
      </div>

      <p className="text-sm leading-snug line-clamp-5">{post.hook}</p>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><ThumbsUp size={13} /> {formatNumber(post.likes)}</span>
        <span className="flex items-center gap-1"><MessageCircle size={13} /> {formatNumber(post.comments)}</span>
        <span className="flex items-center gap-1"><Repeat2 size={13} /> {formatNumber(post.shares)}</span>
        {!Number.isNaN(ratio) && ratio > 0 && (
          <span className="ml-auto text-[11px]">{(ratio * 100).toFixed(0)}% c/l</span>
        )}
      </div>

      {post.url && (
        <a
          href={post.url}
          target="_blank"
          rel="noreferrer"
          className="text-[11px] underline truncate"
          style={{ color: "var(--primary)" }}
        >
          View original post
        </a>
      )}

      <div className="flex items-center gap-1.5 pt-1 border-t" style={{ borderColor: "var(--border-subtle)" }}>
        <Button variant="ghost" size="sm" className="flex-1" onClick={() => setWhyOpen(true)}>
          <Sparkles size={13} className="mr-1" /> Why it&apos;s viral
        </Button>
        <Button variant="outline" size="sm" onClick={() => onToggleSave(post.id)}>
          {saved ? <BookmarkCheck size={13} className="mr-1" /> : <Bookmark size={13} className="mr-1" />}
          {saved ? "Saved" : "Save"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setRemixOpen(true)}>
          <Wand2 size={13} className="mr-1" /> Remix
        </Button>
      </div>

      <Dialog open={whyOpen} onOpenChange={setWhyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Why it&apos;s viral</DialogTitle>
            <DialogDescription>
              We don&apos;t have a per-post citation for this one yet — that would mean fabricating
              a reason, and we don&apos;t do that. See <code>playbook/FORMAT-LIBRARY.md</code> for
              the real, cited breakdown of why the <strong>{post.suggested_format || "this"}</strong>{" "}
              format works, backed by real engagement data across the corpus.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Dialog open={remixOpen} onOpenChange={setRemixOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remix this hook</DialogTitle>
            <DialogDescription>
              This page doesn&apos;t generate posts (that&apos;s a real gap, not faked here). Open
              a Claude Code session in this repo and run <code>/linkedin-post</code> — it pulls
              proven Template Library hooks like this one as a real source and drafts on top of it.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
