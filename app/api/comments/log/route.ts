import { NextRequest, NextResponse } from "next/server";
import { attachCommentToIntelRow, CommentStatus } from "@/lib/sheets";

export const dynamic = "force-dynamic";

// POST /api/comments/log
//
// Called by n8n after each LinkedIn comment POST attempt to record the
// outcome on the matching Intel row.
//
// Request body shape:
//   {
//     url: string,                          // the LinkedIn post URL (the lookup key)
//     status: "posted" | "post_failed",
//     error?: string                        // failure reason if status=post_failed
//   }
//
// Response shape: { ok: true, rowIndex: N } or { ok: false, error: string }

interface LogBody {
  url?: string;
  status?: CommentStatus;
  error?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as LogBody;

    if (!body.url) {
      return NextResponse.json(
        { ok: false, error: "url is required" },
        { status: 400 }
      );
    }
    if (!body.status) {
      return NextResponse.json(
        { ok: false, error: "status is required" },
        { status: 400 }
      );
    }

    const patch: {
      comment_status: CommentStatus;
      comment_posted_at?: string;
      comment_text?: string;
    } = {
      comment_status: body.status,
    };

    if (body.status === "posted") {
      patch.comment_posted_at = new Date().toISOString();
    }

    // For failed posts we shove the error into comment_text so it's visible
    // in the sheet without needing a separate column. The original generated
    // comment is gone from the sheet at this point but it's fine — failed
    // posts don't need the original text, they need the failure reason.
    if (body.status === "post_failed" && body.error) {
      patch.comment_text = `[failed] ${body.error}`;
    }

    const result = await attachCommentToIntelRow(body.url, patch);

    if (!result) {
      return NextResponse.json(
        { ok: false, error: `no Intel row found for url: ${body.url}` },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, rowIndex: result.rowIndex });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
