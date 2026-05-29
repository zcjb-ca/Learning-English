import { describe, expect, it } from "vitest";
import {
  normalizeFeedback,
  normalizeIngest,
  parseJsonObject,
} from "../lib/anthropic";

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
  it("drops empty passages and frames", () => {
    const result = normalizeIngest({
      passages: [{ text: " hi " }, { text: "" }],
      frames: [
        { frame: "First, I ___.", example: "First, I check.", meaning_zh: "先做某事" },
        { frame: "   ", example: "", meaning_zh: "" },
      ],
    });
    expect(result.passages).toEqual([{ text: "hi" }]);
    expect(result.frames).toHaveLength(1);
    expect(result.frames[0].frame).toBe("First, I ___.");
  });

  it("returns empty arrays for null or empty input", () => {
    expect(normalizeIngest(null)).toEqual({ passages: [], frames: [] });
    expect(normalizeIngest({})).toEqual({ passages: [], frames: [] });
  });
});
