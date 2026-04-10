import { NextRequest, NextResponse } from "next/server";
import { toggleIntelStar } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { rowIndex, starred } = (await req.json()) as {
      rowIndex: number;
      starred: boolean;
    };
    if (!rowIndex || typeof starred !== "boolean") {
      return NextResponse.json({ error: "rowIndex and starred required" }, { status: 400 });
    }
    await toggleIntelStar(rowIndex, starred);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
