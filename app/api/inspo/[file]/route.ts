import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const safeName = path.basename(file);
  const ext = path.extname(safeName).toLowerCase();
  const mime = MIME[ext];
  if (!mime) return NextResponse.json({ error: "unsupported file type" }, { status: 400 });

  const filePath = path.join(process.cwd(), "content", "inspo", safeName);
  try {
    const bytes = readFileSync(filePath);
    return new NextResponse(new Uint8Array(bytes), {
      headers: { "Content-Type": mime, "Cache-Control": "public, max-age=86400" },
    });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
