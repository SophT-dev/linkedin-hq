import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

function getGroq() { return new Groq({ apiKey: process.env.GROQ_API_KEY }); }

function nameFromUrl(url: string): string {
  try {
    const slug = new URL(url).pathname.replace(/\/$/, "").split("/").pop() || "";
    return slug
      .split("-")
      .filter((p) => !/^\d+$/.test(p))
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  const { linkedin_url } = await req.json();
  if (!linkedin_url) return NextResponse.json({ error: "Missing URL" }, { status: 400 });

  const name = nameFromUrl(linkedin_url);

  try {
    const res = await getGroq().chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `I'm adding a LinkedIn creator/competitor to track. Their LinkedIn URL is: ${linkedin_url}
Their name appears to be: ${name || "unknown"}

Based on the name and URL, give me your best guess at their profile details. If you recognize them as a public figure, use what you know. If not, make reasonable guesses.

Reply with ONLY valid JSON, no markdown, no explanation:
{
  "name": "Full Name",
  "niche": "1 sentence — what they post about and who their audience is",
  "post_frequency": "e.g. Daily, 3x/week, Weekly — your best guess",
  "primary_format": "Text / Carousel / Video / Mixed — your best guess",
  "notes": "2-3 sentences on what likely works for them or what to watch for"
}`,
        },
      ],
    });

    const text = (res.choices[0]?.message?.content || "").trim();
    const clean = text.replace(/```json\n?|\n?```/g, "").trim();
    return NextResponse.json(JSON.parse(clean));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ name, niche: "", post_frequency: "", primary_format: "Text", notes: "" });
  }
}
