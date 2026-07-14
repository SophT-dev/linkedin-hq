import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The comment generators read playbook/SOPHIYA-VOICE.md from disk at runtime
  // (lib/comments.ts loadSophiyaVoiceDoc). Next.js's serverless bundler only
  // ships files it can trace through imports, so a readFileSync target like a
  // markdown doc is left out and throws ENOENT on Vercel — which silently made
  // every insight-voice generation fail and /api/comments/suggest return [].
  // Explicitly include the voice doc in every route that generates comments.
  outputFileTracingIncludes: {
    "/api/comments/suggest": ["./playbook/SOPHIYA-VOICE.md"],
    "/api/comments/plan": ["./playbook/SOPHIYA-VOICE.md"],
    "/api/comments/sophiya-review": ["./playbook/SOPHIYA-VOICE.md"],
  },
};

export default nextConfig;
