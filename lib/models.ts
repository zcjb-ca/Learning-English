// Centralized Claude model ids so they are easy to switch in one place.
// Sonnet 4.6 balances quality, latency, and cost for interactive feedback;
// Haiku 4.5 is the cheaper fallback. Each can be overridden by an env var
// because a company/proxy gateway often exposes different model names.

export const MODELS = {
  feedback: process.env.MODEL_FEEDBACK ?? "claude-sonnet-4-6",
  ingest: process.env.MODEL_INGEST ?? "claude-sonnet-4-6",
  cheap: process.env.MODEL_CHEAP ?? "claude-haiku-4-5-20251001",
} as const;

export type ModelKey = keyof typeof MODELS;
