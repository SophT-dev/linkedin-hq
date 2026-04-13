import { Client } from "@notionhq/client";

// Minimal markdown → Notion block converter. Handles:
//   # H1 / ## H2 / ### H3
//   - bullet / * bullet
//   1. numbered
//   plain paragraphs
// Anything else (tables, code blocks, embeds) is rendered as a plain paragraph.
// Keep it simple — the landing page is the primary artifact, Notion is the
// editable source doc that links back to it.

type NotionBlock = {
  object: "block";
  type: string;
  [key: string]: unknown;
};

function richText(text: string) {
  // Notion has a 2000-char cap per rich_text chunk. Split long lines.
  const chunks: { type: "text"; text: { content: string } }[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    chunks.push({ type: "text", text: { content: remaining.slice(0, 1900) } });
    remaining = remaining.slice(1900);
  }
  return chunks;
}

function lineToBlock(line: string): NotionBlock | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("### ")) {
    return {
      object: "block",
      type: "heading_3",
      heading_3: { rich_text: richText(trimmed.slice(4)) },
    };
  }
  if (trimmed.startsWith("## ")) {
    return {
      object: "block",
      type: "heading_2",
      heading_2: { rich_text: richText(trimmed.slice(3)) },
    };
  }
  if (trimmed.startsWith("# ")) {
    return {
      object: "block",
      type: "heading_1",
      heading_1: { rich_text: richText(trimmed.slice(2)) },
    };
  }
  if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
    return {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: { rich_text: richText(trimmed.slice(2)) },
    };
  }
  const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
  if (numberedMatch) {
    return {
      object: "block",
      type: "numbered_list_item",
      numbered_list_item: { rich_text: richText(numberedMatch[2]) },
    };
  }
  return {
    object: "block",
    type: "paragraph",
    paragraph: { rich_text: richText(trimmed) },
  };
}

export function markdownToNotionBlocks(markdown: string): NotionBlock[] {
  return markdown
    .split("\n")
    .map((l) => lineToBlock(l))
    .filter((b): b is NotionBlock => b !== null);
}

export async function publishLeadMagnetToNotion(input: {
  title: string;
  body_md: string;
  parentId?: string;
}): Promise<{ notionUrl: string; pageId: string }> {
  const token = process.env.NOTION_TOKEN;
  const parentId = input.parentId || process.env.NOTION_PARENT_ID;
  if (!token) throw new Error("NOTION_TOKEN env var is not set");
  if (!parentId) throw new Error("NOTION_PARENT_ID env var is not set");

  const client = new Client({ auth: token });

  // Parent can be either a page id or a database id. We assume a page here —
  // if you want to use a database instead, swap parent to { database_id } and
  // provide a properties map matching the database schema.
  const blocks = markdownToNotionBlocks(input.body_md);

  // Notion caps children arrays at 100 blocks per request. For longer docs
  // we create the page with the first 100 and append the rest.
  const firstBatch = blocks.slice(0, 100);
  const rest = blocks.slice(100);

  // Notion SDK types are strict about block shapes; our minimal blocks are
  // valid at runtime, but the SDK's internal block type expects discriminated
  // unions we haven't modeled. Cast through unknown to satisfy TS.
  type CreatePageArgs = Parameters<typeof client.pages.create>[0];
  const createArgs = {
    parent: { page_id: parentId },
    properties: {
      title: {
        title: [{ type: "text", text: { content: input.title } }],
      },
    },
    children: firstBatch,
  } as unknown as CreatePageArgs;

  const created = await client.pages.create(createArgs);

  const pageId = created.id;
  const notionUrl = "url" in created && typeof created.url === "string"
    ? created.url
    : `https://www.notion.so/${pageId.replace(/-/g, "")}`;

  // Append any remaining blocks in chunks of 100.
  for (let i = 0; i < rest.length; i += 100) {
    type AppendArgs = Parameters<typeof client.blocks.children.append>[0];
    const appendArgs = {
      block_id: pageId,
      children: rest.slice(i, i + 100),
    } as unknown as AppendArgs;
    await client.blocks.children.append(appendArgs);
  }

  return { notionUrl, pageId };
}
