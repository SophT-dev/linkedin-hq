// Slim Slack API helper for the comment review flow.
// Requires SLACK_BOT_TOKEN and SLACK_CHANNEL_ID env vars.

const TOKEN = () => process.env.SLACK_BOT_TOKEN || "";
const CHANNEL = () => process.env.SLACK_CHANNEL_ID || "";

export async function sendReviewMessage(draft: {
  creator_name: string;
  post_preview: string;
  url: string;
  comment_text: string;
  style_preset: string;
}): Promise<string> {
  const text =
    `📝 *Draft comment for ${draft.creator_name}*\n\n` +
    `Post: _${draft.post_preview}_\n` +
    `<${draft.url}|view post> · style: \`${draft.style_preset}\`\n\n` +
    `> ${draft.comment_text}\n\n` +
    `Reply in this thread:\n` +
    `✅ approve as-is · type your edit to approve with changes · ❌ skip`;

  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel: CHANNEL(),
      text,
      unfurl_links: false,
      unfurl_media: false,
    }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Slack send failed: ${data.error}`);
  return data.ts as string;
}

interface SlackReply {
  text: string;
  user: string;
  bot_id?: string;
}

export async function getThreadReplies(
  ts: string
): Promise<SlackReply[]> {
  const url = new URL("https://slack.com/api/conversations.replies");
  url.searchParams.set("channel", CHANNEL());
  url.searchParams.set("ts", ts);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${TOKEN()}` },
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Slack replies failed: ${data.error}`);
  // First message is the parent — skip it. Only return human replies.
  return ((data.messages || []) as SlackReply[])
    .slice(1)
    .filter((m) => !m.bot_id);
}
