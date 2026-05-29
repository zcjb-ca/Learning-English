// Centralized Claude model ids so they are easy to switch in one place.
// Sonnet 4.6 balances quality, latency, and cost for interactive feedback;
// Haiku 4.5 is the cheaper fallback.

export const MODELS = {
  feedback: "claude-sonnet-4-6",
  ingest: "claude-sonnet-4-6",
  cheap: "claude-haiku-4-5-20251001",
} as const;

export type ModelKey = keyof typeof MODELS;
