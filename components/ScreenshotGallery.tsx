"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Upload, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import Lightbox from "@/components/Lightbox";

// Google Drive thumbnailLinks come capped tiny (…=s220) → blurry when shown
// larger. Bump the size token so screenshots are sharp and readable inline.
function hiRes(url?: string, size = 1200): string | undefined {
  if (!url) return url;
  return url.replace(/=s\d+(-[a-z]+)?$/i, `=s${size}`).replace(/=w\d+-h\d+$/i, `=s${size}`);
}

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
  const [zoom, setZoom] = useState<DriveFile | null>(null);
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
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          <ImageOff size={22} className="mx-auto mb-2 opacity-50" />
          {emptyHint}
        </div>
      )}

      {/* Natural rectangular layout (masonry columns) so screenshots keep their
          real shape and stay readable without opening them. */}
      {files && files.length > 0 && (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 [column-fill:_balance]">
          {files.map((f) => (
            <button
              key={f.id}
              onClick={() => setZoom(f)}
              className="mb-4 block w-full break-inside-avoid rounded-xl overflow-hidden border bg-card border-border shadow-sm hover:shadow-md transition-shadow cursor-zoom-in"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={hiRes(f.thumbnailLink) || f.webContentLink}
                alt={f.name}
                className="w-full h-auto object-contain"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}

      {zoom && (
        <Lightbox
          src={hiRes(zoom.thumbnailLink, 2000) || zoom.webContentLink || ""}
          alt={zoom.name}
          caption={zoom.name}
          onClose={() => setZoom(null)}
        />
      )}
    </div>
  );
}
