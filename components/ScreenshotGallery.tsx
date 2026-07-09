"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Upload, ExternalLink, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  thumbnailLink?: string;
  webViewLink?: string;
  webContentLink?: string;
}

export default function ScreenshotGallery({
  folderKey,
  emptyHint,
}: {
  folderKey: "slack" | "email";
  emptyHint: string;
}) {
  const [files, setFiles] = useState<DriveFile[] | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setError("");
    const res = await fetch(`/api/drive/list?folder=${folderKey}`);
    const data = await res.json();
    if (!res.ok) { setError(data.error || "failed to load"); return; }
    setFiles(data.files);
  }, [folderKey]);

  useEffect(() => { load(); }, [load]);

  const onFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const res = await fetch("/api/drive/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder: folderKey, filename: file.name, dataUrl }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error || "upload failed");
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{files?.length ?? 0} saved</p>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFileChosen} />
        <Button size="sm" variant="outline" disabled={uploading} onClick={() => inputRef.current?.click()}>
          <Upload size={14} className="mr-1" /> {uploading ? "Uploading..." : "Add screenshot"}
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {files === null && !error && <p className="text-sm text-muted-foreground">Loading...</p>}

      {files && files.length === 0 && (
        <div
          className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <ImageOff size={22} className="mx-auto mb-2 opacity-50" />
          {emptyHint}
        </div>
      )}

      {files && files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {files.map((f) => (
            <a
              key={f.id}
              href={f.webViewLink || f.webContentLink}
              target="_blank"
              rel="noreferrer"
              className="group relative rounded-xl overflow-hidden border block aspect-square"
              style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={f.thumbnailLink || f.webContentLink}
                alt={f.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end p-2 opacity-0 group-hover:opacity-100">
                <span className="text-[11px] text-white truncate flex items-center gap-1">
                  <ExternalLink size={11} /> {f.name}
                </span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
