import { NextRequest, NextResponse } from "next/server";
import { readSheet, appendRow, updateRow, deleteRow } from "@/lib/sheets";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tab = searchParams.get("tab");
  const range = searchParams.get("range") || "A:Z";

  if (!tab) return NextResponse.json({ error: "Missing tab" }, { status: 400 });

  try {
    const rows = await readSheet(tab, range);
    return NextResponse.json({ rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to read sheet" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { tab, values, action, rowIndex } = body;

  if (!tab) return NextResponse.json({ error: "Missing tab" }, { status: 400 });

  try {
    if (action === "update" && rowIndex) {
      await updateRow(tab, rowIndex, values);
    } else if (action === "delete" && rowIndex) {
      await deleteRow(tab, rowIndex);
    } else {
      await appendRow(tab, values);
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to write sheet" }, { status: 500 });
  }
}
