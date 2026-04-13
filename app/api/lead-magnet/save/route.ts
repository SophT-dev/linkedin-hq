import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  createLeadMagnetRow,
  updateLeadMagnetRow,
  loadPostById,
  updatePostLeadMagnet,
} from "@/lib/sheets";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/lead-magnet/save
// body: {
//   postId: string,
//   title: string,
//   heroText: string,
//   valueProps: string[],
//   ctaText: string,
//   outlineMd?: string,
//   bodyMd: string,
//   notionUrl?: string
// }
// Creates the LeadMagnets row, rewrites the original Post row's lead_magnet
// cell with the landing URL, and revalidates the public landing page route.
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      postId?: string;
      title?: string;
      heroText?: string;
      valueProps?: string[];
      ctaText?: string;
      outlineMd?: string;
      bodyMd?: string;
      notionUrl?: string;
    };

    if (!body.postId || !body.title || !body.bodyMd) {
      return NextResponse.json(
        { ok: false, error: "postId, title, and bodyMd are required" },
        { status: 400 }
      );
    }

    const post = await loadPostById(body.postId);
    if (!post) {
      return NextResponse.json(
        { ok: false, error: `post not found: ${body.postId}` },
        { status: 404 }
      );
    }

    // 1. Create the LeadMagnets row (gets a unique slug).
    const created = await createLeadMagnetRow({
      post_id: body.postId,
      title: body.title,
      status: "published",
    });

    // 2. Build the public landing URL. The skill can override the base via
    //    LINKEDIN_HQ_BASE_URL in its own env; we default to the live domain.
    const base =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.LINKEDIN_HQ_BASE_URL ||
      "https://linkedin-hq.vercel.app";
    const landingUrl = `${base.replace(/\/$/, "")}/lead-magnet/${created.slug}`;

    // 3. Fill in the content fields + notion url + landing url on the row.
    await updateLeadMagnetRow(created.id, {
      hero_text: body.heroText || "",
      value_props: JSON.stringify(body.valueProps || []),
      cta_text: body.ctaText || "",
      outline_md: body.outlineMd || "",
      body_md: body.bodyMd,
      notion_url: body.notionUrl || "",
      landing_url: landingUrl,
      status: "published",
    });

    // 4. Rewrite the source post's lead_magnet cell with the real URL so the
    //    sheet row the user copies into LinkedIn now contains a live link.
    await updatePostLeadMagnet(post.rowIndex, landingUrl);

    // 5. Revalidate the dynamic landing page so it renders fresh on the next
    //    request without waiting for the ISR cache to expire.
    try {
      revalidatePath(`/lead-magnet/${created.slug}`);
    } catch {
      // revalidatePath throws outside request scope in some setups. Non-fatal.
    }

    return NextResponse.json({
      ok: true,
      id: created.id,
      slug: created.slug,
      landingUrl,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
