// Claude client wrapper. Runs server-side only (uses ANTHROPIC_API_KEY). Uses
// prompt caching on the (large, fixed) system prompt to cut latency and cost.
// The system prompt mandates JSON-only output, which we extract tolerantly:
// some Anthropic-compatible gateways (e.g. Vertex-backed via LiteLLM) reject the
// assistant-message prefill trick ("conversation must end with a user message").

import Anthropic from "@anthropic-ai/sdk";
import { MODELS } from "./models";
import {
  FEEDBACK_SYSTEM,
  INGEST_SYSTEM,
  feedbackUserPrompt,
  ingestUserPrompt,
} from "./prompts";
import type {
  Collocation,
  Feedback,
  Frame,
  IngestResult,
  Passage,
  PracticeStage,
} from "./types";

let client: Anthropic | null = null;

function usePromptCaching(): boolean {
  const base = process.env.ANTHROPIC_BASE_URL;
  if (!base) return true;
  if (process.env.ENABLE_PROMPT_CACHING === "1") return true;
  return false;
}

// Works with the official Anthropic API or any Anthropic-compatible gateway
// (e.g. a company proxy). Auth is whichever the gateway expects: ANTHROPIC_API_KEY
// is sent as `x-api-key`, ANTHROPIC_AUTH_TOKEN as `Authorization: Bearer`. The
// base URL comes from ANTHROPIC_BASE_URL (falls back to the official endpoint).
function getClient(): Anthropic {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const authToken = process.env.ANTHROPIC_AUTH_TOKEN;
  if (!apiKey && !authToken) {
    throw new Error(
      "缺少 Anthropic 凭据：请配置 ANTHROPIC_API_KEY（x-api-key）或 ANTHROPIC_AUTH_TOKEN（Bearer）。",
    );
  }
  client = new Anthropic({
    ...(apiKey ? { apiKey } : {}),
    ...(authToken ? { authToken } : {}),
    baseURL: process.env.ANTHROPIC_BASE_URL || undefined,
  });
  return client;
}

// Extract the outermost JSON object from a string, tolerating any prefix/suffix
// the model might add. Exported for unit testing.
export function parseJsonObject<T>(text: string): T {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("模型没有返回有效的 JSON");
  }
  return JSON.parse(text.slice(start, end + 1)) as T;
}

async function generateJson<T>(args: {
  model: string;
  system: string;
  userText: string;
  cachedContext?: string;
  maxTokens: number;
}): Promise<T> {
  const caching = usePromptCaching();
  const userContent: Anthropic.ContentBlockParam[] = [];
  if (args.cachedContext) {
    userContent.push({
      type: "text",
      text: args.cachedContext,
      ...(caching ? { cache_control: { type: "ephemeral" } } : {}),
    });
  }
  userContent.push({ type: "text", text: args.userText });

  const message = await getClient().messages.create({
    model: args.model,
    max_tokens: args.maxTokens,
    system: [{ type: "text", text: args.system, ...(caching ? { cache_control: { type: "ephemeral" } } : {}) }],
    messages: [{ role: "user", content: userContent }],
  });

  const body = message.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("");
  return parseJsonObject<T>(body);
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function includesPhrase(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

// Merge the model's semantic annotations back onto the deterministic passages
// parsed from the .lrc. The passages' text/timing/lines are the source of truth
// and are never overwritten — we only add translation_zh and the collocation
// phrases that fall inside each passage (matched as substrings, in code).
export function normalizeIngest(raw: unknown, sourcePassages: Passage[]): IngestResult {
  const obj = (raw ?? {}) as { passages?: unknown; frames?: unknown; collocations?: unknown };

  // 1) Per-passage translations, keyed by the index the model echoed back.
  const translations = new Map<number, string>();
  if (Array.isArray(obj.passages)) {
    for (const p of obj.passages) {
      const i = (p as { i?: unknown })?.i;
      const tz = asString((p as { translation_zh?: unknown })?.translation_zh).trim();
      if (typeof i === "number" && Number.isInteger(i) && tz.length > 0) {
        translations.set(i, tz);
      }
    }
  }

  // 2) Collocations: keep only those that truly appear in the transcript, dedup,
  //    and attach the first containing passage's timing for audio playback.
  const collocations: Collocation[] = [];
  const seen = new Set<string>();
  if (Array.isArray(obj.collocations)) {
    for (const c of obj.collocations) {
      const phrase = asString((c as Collocation)?.phrase).trim();
      const meaning = asString((c as Collocation)?.meaning_zh).trim();
      if (phrase.length === 0) continue;
      const key = phrase.toLowerCase();
      if (seen.has(key)) continue;
      const host = sourcePassages.find((p) => includesPhrase(p.text, phrase));
      if (!host) continue; // not a real substring — can't highlight or clip it
      seen.add(key);
      collocations.push({ phrase, meaning_zh: meaning, start: host.start, end: host.end });
    }
  }

  // 3) Enrich the deterministic passages with translation + the collocation
  //    phrases that occur inside each one (so the reader can bold them).
  const phrases = collocations.map((c) => c.phrase);
  const passages: Passage[] = sourcePassages.map((p, i) => ({
    ...p,
    translation_zh: translations.get(i),
    collocations: phrases.filter((phrase) => includesPhrase(p.text, phrase)),
  }));

  // 4) Frames (unchanged contract).
  const frames: Frame[] = Array.isArray(obj.frames)
    ? obj.frames
        .map((f) => ({
          frame: asString((f as Frame)?.frame).trim(),
          example: asString((f as Frame)?.example).trim(),
          meaning_zh: asString((f as Frame)?.meaning_zh).trim(),
        }))
        .filter((f) => f.frame.length > 0)
    : [];

  return { passages, frames, collocations };
}

export function normalizeFeedback(raw: unknown, userInput: string): Feedback {
  const obj = (raw ?? {}) as Partial<Feedback>;
  const tag = obj.mistake_tag;
  return {
    ok: typeof obj.ok === "boolean" ? obj.ok : false,
    corrected: asString(obj.corrected, userInput),
    natural: asString(obj.natural, userInput),
    grammar_notes: asString(obj.grammar_notes),
    naturalness_notes: asString(obj.naturalness_notes),
    used_target: typeof obj.used_target === "boolean" ? obj.used_target : true,
    encouragement: asString(obj.encouragement),
    mistake_tag: typeof tag === "string" && tag.trim().length > 0 ? tag.trim() : null,
  };
}

export async function ingestLesson(passages: Passage[]): Promise<IngestResult> {
  const raw = await generateJson<unknown>({
    model: MODELS.ingest,
    system: INGEST_SYSTEM,
    userText: ingestUserPrompt(passages),
    maxTokens: 12000,
  });
  return normalizeIngest(raw, passages);
}

export async function generateFeedback(input: {
  stage: PracticeStage;
  promptShown: string;
  userInput: string;
}): Promise<Feedback> {
  const raw = await generateJson<unknown>({
    model: MODELS.feedback,
    system: FEEDBACK_SYSTEM,
    userText: feedbackUserPrompt(input),
    maxTokens: 1024,
  });
  return normalizeFeedback(raw, input.userInput);
}
