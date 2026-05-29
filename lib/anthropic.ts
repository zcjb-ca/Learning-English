// Claude client wrapper. Runs server-side only (uses ANTHROPIC_API_KEY). Uses
// prompt caching on the (large, fixed) system prompt to cut latency and cost,
// and forces structured JSON output via an assistant prefill of "{".

import Anthropic from "@anthropic-ai/sdk";
import { requireEnv } from "./env";
import { MODELS } from "./models";
import {
  FEEDBACK_SYSTEM,
  INGEST_SYSTEM,
  feedbackUserPrompt,
  ingestUserPrompt,
} from "./prompts";
import type { Feedback, Frame, IngestResult, Passage, PracticeStage } from "./types";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: requireEnv("ANTHROPIC_API_KEY") });
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
  const userContent: Anthropic.ContentBlockParam[] = [];
  if (args.cachedContext) {
    userContent.push({
      type: "text",
      text: args.cachedContext,
      cache_control: { type: "ephemeral" },
    });
  }
  userContent.push({ type: "text", text: args.userText });

  const message = await getClient().messages.create({
    model: args.model,
    max_tokens: args.maxTokens,
    system: [{ type: "text", text: args.system, cache_control: { type: "ephemeral" } }],
    messages: [
      { role: "user", content: userContent },
      { role: "assistant", content: "{" }, // prefill: force a bare JSON object
    ],
  });

  const body = message.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("");
  return parseJsonObject<T>("{" + body);
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function normalizeIngest(raw: unknown): IngestResult {
  const obj = (raw ?? {}) as { passages?: unknown; frames?: unknown };
  const passages: Passage[] = Array.isArray(obj.passages)
    ? obj.passages
        .map((p) => ({ text: asString((p as Passage)?.text).trim() }))
        .filter((p) => p.text.length > 0)
    : [];
  const frames: Frame[] = Array.isArray(obj.frames)
    ? obj.frames
        .map((f) => ({
          frame: asString((f as Frame)?.frame).trim(),
          example: asString((f as Frame)?.example).trim(),
          meaning_zh: asString((f as Frame)?.meaning_zh).trim(),
        }))
        .filter((f) => f.frame.length > 0)
    : [];
  return { passages, frames };
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

export async function ingestLesson(transcript: string): Promise<IngestResult> {
  const raw = await generateJson<unknown>({
    model: MODELS.ingest,
    system: INGEST_SYSTEM,
    userText: ingestUserPrompt(transcript),
    maxTokens: 8000,
  });
  return normalizeIngest(raw);
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
