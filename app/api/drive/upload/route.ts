import { NextResponse } from "next/server";
import { uploadDataUrlToSubfolder } from "@/lib/drive";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const FOLDER_PATHS: Record<string, string> = {
  slack: "Proof Screenshots",
  email: "Email Screenshots",
};

interface Body {
  folder?: string;
  filename?: string;
  dataUrl?: string;
}

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const subfolderPath = FOLDER_PATHS[body.folder || ""];
  if (!subfolderPath) {
    return NextResponse.json({ error: `unknown folder key "${body.folder}"` }, { status: 400 });
  }
  if (!body.filename || !body.dataUrl) {
    return NextResponse.json({ error: "filename and dataUrl are required" }, { status: 400 });
  }
  try {
    const file = await uploadDataUrlToSubfolder(subfolderPath, body.filename, body.dataUrl);
    return NextResponse.json({ file });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
