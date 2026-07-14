import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The comment generators read playbook/voice.md from disk at runtime
  // (lib/comments.ts loadCommentVoiceDoc). Next.js's serverless bundler only
  // ships files it can trace through imports, so a readFileSync target like a
  // markdown doc is left out and throws ENOENT on Vercel — which silently made
  // every insight-voice generation fail and /api/comments/suggest return [].
  // Explicitly include the voice doc in every route that generates comments.
  outputFileTracingIncludes: {
    "/api/comments/suggest": ["./playbook/voice.md"],
    "/api/comments/suggest-from-ocr": ["./playbook/voice.md"],
    "/api/comments/suggest-from-url": ["./playbook/voice.md"],
    "/api/comments/plan": ["./playbook/voice.md"],
    "/api/comments/sophiya-review": ["./playbook/voice.md"],
  },
};

export default nextConfig;
