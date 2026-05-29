// Centralized Claude model ids, easy to switch in one place. Defaults target the
// company gateway, whose model-group name for Sonnet 4.6 is "claude-4.6-sonnet"
// (the ordering differs from the official Anthropic id "claude-sonnet-4-6").
// Override any of these with an env var when pointing at a different endpoint.

export const MODELS = {
  feedback: process.env.MODEL_FEEDBACK ?? "claude-4.6-sonnet",
  ingest: process.env.MODEL_INGEST ?? "claude-4.6-sonnet",
  cheap: process.env.MODEL_CHEAP ?? "claude-haiku-4-5-20251001",
} as const;

export type ModelKey = keyof typeof MODELS;
