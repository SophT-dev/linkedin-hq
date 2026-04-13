import { loadLeadMagnetBySlug } from "@/lib/sheets";
import { notFound } from "next/navigation";

// Public lead magnet landing page. Server component. Reads the LeadMagnets
// row by slug at request time. CSS variables only, no hardcoded colors.
// BottomNav is not rendered because this route lives in the (public) route
// group which has its own layout.

export const dynamic = "force-dynamic";
export const revalidate = 0;

function parseValueProps(raw: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((p) => typeof p === "string") : [];
  } catch {
    return [];
  }
}

export default async function LeadMagnetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const row = await loadLeadMagnetBySlug(slug);

  if (!row || row.status !== "published") {
    notFound();
  }

  const valueProps = parseValueProps(row.value_props);

  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "72px 24px 96px",
      }}
    >
      <div
        style={{
          fontSize: 12,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--muted-foreground)",
          marginBottom: 16,
        }}
      >
        bleed ai · free resource
      </div>

      <h1
        style={{
          fontSize: "clamp(28px, 5vw, 44px)",
          fontWeight: 700,
          lineHeight: 1.15,
          margin: "0 0 20px",
          color: "var(--foreground)",
        }}
      >
        {row.title}
      </h1>

      {row.hero_text ? (
        <p
          style={{
            fontSize: 18,
            lineHeight: 1.55,
            color: "var(--muted-foreground)",
            margin: "0 0 32px",
          }}
        >
          {row.hero_text}
        </p>
      ) : null}

      {valueProps.length > 0 ? (
        <div
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 12,
            padding: "20px 24px",
            margin: "0 0 32px",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--muted-foreground)",
              marginBottom: 12,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            what you get
          </div>
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {valueProps.map((vp, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  fontSize: 16,
                  lineHeight: 1.5,
                  color: "var(--foreground)",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    display: "inline-block",
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--color-accent)",
                    marginTop: 10,
                    flexShrink: 0,
                  }}
                />
                <span>{vp}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {row.notion_url ? (
        <a
          href={row.notion_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            background: "var(--color-accent)",
            color: "var(--primary-foreground)",
            padding: "14px 28px",
            borderRadius: 10,
            fontSize: 16,
            fontWeight: 600,
            textDecoration: "none",
            marginBottom: 24,
          }}
        >
          {row.cta_text || "read the full guide"} →
        </a>
      ) : null}

      <footer
        style={{
          marginTop: 48,
          paddingTop: 24,
          borderTop: "1px solid var(--border-subtle)",
          fontSize: 13,
          color: "var(--muted-foreground)",
          lineHeight: 1.6,
        }}
      >
        built by{" "}
        <a
          href="https://www.linkedin.com/in/taha-anwar-aiautomation/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--color-accent)", textDecoration: "none" }}
        >
          taha anwar
        </a>{" "}
        · bleed ai · cold email done right
      </footer>
    </main>
  );
}
