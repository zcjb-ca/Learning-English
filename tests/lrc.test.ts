import { describe, expect, it } from "vitest";
import {
  deriveTitleFromFilename,
  groupIntoPassages,
  linesToTranscript,
  parseLrc,
} from "../lib/lrc";
import type { SubtitleLine } from "../lib/types";

const mk = (start: number, end: number, text: string): SubtitleLine => ({ start, end, text });

describe("parseLrc", () => {
  it("parses timestamps, orders by time, and bounds each line by the next", () => {
    const lines = parseLrc(["[00:03.00]World", "[00:01.50]Hello"].join("\n"));
    expect(lines).toEqual([
      { start: 1.5, end: 3, text: "Hello" },
      { start: 3, end: 11, text: "World" },
    ]);
  });

  it("reads 2-digit fractions as centiseconds and 3-digit as milliseconds", () => {
    const lines = parseLrc(["[00:00.50]a", "[00:02.250]b"].join("\n"));
    expect(lines[0].start).toBe(0.5);
    expect(lines[1].start).toBe(2.25);
  });

  it("supports mm > 9 and a colon fraction separator", () => {
    const lines = parseLrc("[10:05:25]late line");
    expect(lines[0].start).toBe(605.25); // 10*60 + 5 + 0.25
  });

  it("ignores metadata tags and blank lines", () => {
    const lines = parseLrc(["[ti:Song]", "", "[00:01.00]only real line"].join("\n"));
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe("only real line");
  });

  it("drops a timestamp whose text is blank", () => {
    const lines = parseLrc(["[00:01.00]   ", "[00:02.00]kept"].join("\n"));
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe("kept");
  });

  it("expands multiple timestamps on one line into repeated lines", () => {
    const lines = parseLrc("[00:01.00][00:05.00]chorus");
    expect(lines.map((l) => l.start)).toEqual([1, 5]);
    expect(lines.every((l) => l.text === "chorus")).toBe(true);
  });

  it("returns an empty array when there are no timed lines", () => {
    expect(parseLrc("just some prose\nno timestamps")).toEqual([]);
  });
});

describe("linesToTranscript", () => {
  it("joins line text with newlines and drops timestamps", () => {
    expect(linesToTranscript([mk(0, 1, "a"), mk(1, 2, "b")])).toBe("a\nb");
  });
});

describe("groupIntoPassages", () => {
  it("merges fragment lines into one passage at a sentence boundary", () => {
    const a = mk(0, 1, "This is the first half of one single sentence");
    const b = mk(1, 3, "that only ends right about here now.");
    const passages = groupIntoPassages([a, b]);
    expect(passages).toHaveLength(1);
    expect(passages[0].text).toBe(
      "This is the first half of one single sentence that only ends right about here now.",
    );
    expect(passages[0].start).toBe(0);
    expect(passages[0].end).toBe(3);
    expect(passages[0].lines).toEqual([a, b]);
  });

  it("splits into one passage per long, sentence-ending line", () => {
    const long = `${Array(15).fill("word").join(" ")}.`;
    const passages = groupIntoPassages([mk(0, 1, long), mk(1, 2, long)]);
    expect(passages).toHaveLength(2);
    expect(passages[0].start).toBe(0);
    expect(passages[0].end).toBe(1);
    expect(passages[1].start).toBe(1);
  });

  it("flushes when maxChars is exceeded even without a sentence end", () => {
    const passages = groupIntoPassages([mk(0, 1, "alpha"), mk(1, 2, "beta")], { maxChars: 4 });
    expect(passages).toHaveLength(2);
    expect(passages[0].lines).toEqual([mk(0, 1, "alpha")]);
    expect(passages[1].lines).toEqual([mk(1, 2, "beta")]);
  });

  it("returns an empty array for no lines", () => {
    expect(groupIntoPassages([])).toEqual([]);
  });
});

describe("deriveTitleFromFilename", () => {
  it("strips the extension and turns underscores into spaces", () => {
    expect(deriveTitleFromFilename("How_to_Talk.lrc")).toBe("How to Talk");
  });

  it("only strips the final extension, keeping inner dots", () => {
    expect(deriveTitleFromFilename("lesson.final.m4a")).toBe("lesson.final");
  });

  it("falls back to a default when nothing usable remains", () => {
    expect(deriveTitleFromFilename("")).toBe("未命名课程");
    expect(deriveTitleFromFilename("___")).toBe("未命名课程");
  });
});
