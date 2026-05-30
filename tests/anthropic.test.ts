import { describe, expect, it } from "vitest";
import {
  normalizeFeedback,
  normalizeIngest,
  parseJsonObject,
} from "../lib/anthropic";
import type { Passage } from "../lib/types";

describe("parseJsonObject", () => {
  it("extracts the outermost object from noisy text", () => {
    expect(parseJsonObject<{ a: number }>('prefix {"a":1} suffix')).toEqual({ a: 1 });
  });

  it("parses nested structures", () => {
    expect(parseJsonObject<{ x: number[] }>('{"x":[1,2,3]}')).toEqual({ x: [1, 2, 3] });
  });

  it("throws when no JSON object is present", () => {
    expect(() => parseJsonObject("no json here")).toThrow();
  });
});

describe("normalizeFeedback", () => {
  it("fills safe defaults and falls back to the learner input", () => {
    const fb = normalizeFeedback({}, "I go store");
    expect(fb.ok).toBe(false);
    expect(fb.corrected).toBe("I go store");
    expect(fb.natural).toBe("I go store");
    expect(fb.used_target).toBe(true);
    expect(fb.mistake_tag).toBeNull();
  });

  it("treats a blank mistake_tag as null", () => {
    const fb = normalizeFeedback({ mistake_tag: "   " }, "x");
    expect(fb.mistake_tag).toBeNull();
  });

  it("keeps a real mistake_tag and provided fields", () => {
    const fb = normalizeFeedback(
      { ok: true, corrected: "I went", natural: "I headed out", mistake_tag: "past tense" },
      "x",
    );
    expect(fb.ok).toBe(true);
    expect(fb.corrected).toBe("I went");
    expect(fb.mistake_tag).toBe("past tense");
  });
});

describe("normalizeIngest", () => {
  const source: Passage[] = [
    { text: "I ran into an old friend yesterday.", start: 0, end: 3 },
    { text: "We grabbed a coffee and caught up.", start: 3, end: 6 },
  ];

  it("merges translations and collocations onto the deterministic passages", () => {
    const result = normalizeIngest(
      {
        passages: [
          { i: 0, translation_zh: "我昨天偶遇了一位老朋友。" },
          { i: 1, translation_zh: "我们喝了杯咖啡，叙了叙旧。" },
        ],
        collocations: [
          { phrase: "ran into", meaning_zh: "偶然遇到" },
          { phrase: "caught up", meaning_zh: "叙旧" },
          { phrase: "not in the transcript", meaning_zh: "x" },
        ],
        frames: [{ frame: "I ___ yesterday.", example: "I ran yesterday.", meaning_zh: "我昨天…" }],
      },
      source,
    );

    // Source text + timing are never overwritten.
    expect(result.passages[0].text).toBe("I ran into an old friend yesterday.");
    expect(result.passages[0].start).toBe(0);
    expect(result.passages[0].end).toBe(3);
    // Annotations merged by index.
    expect(result.passages[0].translation_zh).toBe("我昨天偶遇了一位老朋友。");
    expect(result.passages[0].collocations).toEqual(["ran into"]);
    expect(result.passages[1].collocations).toEqual(["caught up"]);

    // Phrases not present in any passage are dropped; host timing is attached.
    expect(result.collocations).toEqual([
      { phrase: "ran into", meaning_zh: "偶然遇到", start: 0, end: 3 },
      { phrase: "caught up", meaning_zh: "叙旧", start: 3, end: 6 },
    ]);
    expect(result.frames).toHaveLength(1);
  });

  it("dedups collocations case-insensitively, keeping the first", () => {
    const result = normalizeIngest(
      {
        collocations: [
          { phrase: "keep it polite", meaning_zh: "a" },
          { phrase: "Keep It Polite", meaning_zh: "b" },
        ],
      },
      [{ text: "Keep it polite, please.", start: 1, end: 2 }],
    );
    expect(result.collocations).toHaveLength(1);
    expect(result.collocations[0].phrase).toBe("keep it polite");
  });

  it("drops frames with an empty frame string", () => {
    const result = normalizeIngest(
      {
        frames: [
          { frame: "First, I ___.", example: "First, I check.", meaning_zh: "先做某事" },
          { frame: "   ", example: "", meaning_zh: "" },
        ],
      },
      source,
    );
    expect(result.frames).toHaveLength(1);
    expect(result.frames[0].frame).toBe("First, I ___.");
  });

  it("mirrors source passages with empty annotations for null/empty input", () => {
    const empty = normalizeIngest(null, source);
    expect(empty.passages).toHaveLength(2);
    expect(empty.passages[0].translation_zh).toBeUndefined();
    expect(empty.passages[0].collocations).toEqual([]);
    expect(empty.frames).toEqual([]);
    expect(empty.collocations).toEqual([]);

    expect(normalizeIngest({}, [])).toEqual({ passages: [], frames: [], collocations: [] });
  });
});
