import { describe, expect, it } from "vitest";
import { cleanPdfText, deriveTitleFromFilename } from "../lib/pdf";

describe("cleanPdfText", () => {
  it("re-joins words hyphenated across a line break", () => {
    expect(cleanPdfText("exam-\nple")).toBe("example");
  });

  it("collapses runs of spaces and trims lines", () => {
    expect(cleanPdfText("Hello    world")).toBe("Hello world");
    expect(cleanPdfText("  padded line  ")).toBe("padded line");
  });

  it("collapses 3+ blank lines into a single blank line", () => {
    expect(cleanPdfText("a\n\n\n\nb")).toBe("a\n\nb");
  });

  it("normalizes CRLF line endings", () => {
    expect(cleanPdfText("a\r\nb")).toBe("a\nb");
  });
});

describe("deriveTitleFromFilename", () => {
  it("strips the extension and replaces underscores", () => {
    expect(deriveTitleFromFilename("My_First_Lesson.pdf")).toBe("My First Lesson");
  });

  it("strips an uppercase extension", () => {
    expect(deriveTitleFromFilename("Story.PDF")).toBe("Story");
  });

  it("falls back when nothing meaningful remains", () => {
    expect(deriveTitleFromFilename(".pdf")).toBe("未命名课程");
  });
});
