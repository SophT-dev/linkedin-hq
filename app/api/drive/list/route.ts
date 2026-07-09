import { NextResponse } from "next/server";
import { listFilesInSubfolder } from "@/lib/drive";

export const dynamic = "force-dynamic";

// Maps a short URL-friendly key to the real LinkedIn/ Drive subfolder path,
// so the client never has to know/guess the actual folder name.
const FOLDER_PATHS: Record<string, string> = {
  slack: "Proof Screenshots",
  email: "Email Screenshots",
};

export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("folder") || "";
  const subfolderPath = FOLDER_PATHS[key];
  if (!subfolderPath) {
    return NextResponse.json({ error: `unknown folder key "${key}"` }, { status: 400 });
  }
  try {
    const files = await listFilesInSubfolder(subfolderPath);
    return NextResponse.json({ files });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
