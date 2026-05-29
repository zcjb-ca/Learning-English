// Best-effort, per-instance rate limiter for the feedback endpoint. Serverless
// instances are ephemeral and not shared, so this only smooths bursts within a
// single instance. Combined with the single-password gate and a capped
// max_tokens per call, that is sufficient budget protection for a personal app.

const hits: number[] = [];

export function allowRequest(windowMs = 10_000, max = 8): boolean {
  const now = Date.now();
  while (hits.length > 0 && now - hits[0] > windowMs) hits.shift();
  if (hits.length >= max) return false;
  hits.push(now);
  return true;
}
