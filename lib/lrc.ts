// Subtitle (.lrc) parsing + grouping. Pure functions, no I/O — unit-testable
// without a real file. The lesson's structure (text + timing) is derived
// deterministically here; the LLM only adds the semantic layer on top, so the
// timeline and original wording are never at the mercy of the model.

import type { Passage, SubtitleLine } from "./types";

// A physical line that starts with one or more [mm:ss.xx] timestamps.
const LRC_LINE = /^\s*((?:\[\d{1,2}:\d{2}(?:[.:]\d{1,3})?\])+)(.*)$/;
const TIMESTAMP = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

const TAIL_SECONDS = 8; // assumed length of the final line (no next line to bound it)
const DEFAULT_MAX_CHARS = 220;
const MIN_PASSAGE_CHARS = 60; // don't break on the first short sentence; let passages fill out

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Parse an LRC string into time-ordered subtitle lines. Each line's `end` is the
// next line's `start` (the final line is padded by TAIL_SECONDS). Metadata tags
// ([ti:], [ar:], …) and blank lines are ignored.
export function parseLrc(input: string): SubtitleLine[] {
  const raw: Array<{ start: number; text: string }> = [];
  for (const physical of input.split(/\r?\n/)) {
    const m = LRC_LINE.exec(physical);
    if (!m) continue;
    const text = m[2].trim();
    if (text.length === 0) continue;
    // A single physical line may carry multiple timestamps (repeated content).
    TIMESTAMP.lastIndex = 0;
    let t: RegExpExecArray | null;
    while ((t = TIMESTAMP.exec(m[1])) !== null) {
      const minutes = Number.parseInt(t[1], 10);
      const seconds = Number.parseInt(t[2], 10);
      const fracStr = t[3] ?? "0";
      // 2-digit fraction = centiseconds, 3-digit = milliseconds.
      const frac = Number.parseInt(fracStr, 10) / 10 ** fracStr.length;
      raw.push({ start: minutes * 60 + seconds + frac, text });
    }
  }
  raw.sort((a, b) => a.start - b.start);
  return raw.map((line, i) => ({
    start: round2(line.start),
    end: round2(i + 1 < raw.length ? raw[i + 1].start : line.start + TAIL_SECONDS),
    text: line.text,
  }));
}

// Join the parsed lines back into a plain transcript (no timestamps), for the
// lesson's stored full_text.
export function linesToTranscript(lines: SubtitleLine[]): string {
  return lines.map((l) => l.text).join("\n");
}

// Merge consecutive subtitle lines into readable passages: accumulate until a
// sentence-ending boundary (. ? !) past a soft minimum, or until maxChars. Each
// passage keeps its own timing (start of first line → end of last line) and the
// raw lines it was built from.
export function groupIntoPassages(
  lines: SubtitleLine[],
  opts: { maxChars?: number } = {},
): Passage[] {
  const maxChars = opts.maxChars ?? DEFAULT_MAX_CHARS;
  const passages: Passage[] = [];
  let buf: SubtitleLine[] = [];
  let len = 0;

  const flush = () => {
    if (buf.length === 0) return;
    const text = buf
      .map((l) => l.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    passages.push({
      text,
      start: buf[0].start,
      end: buf[buf.length - 1].end,
      lines: buf,
    });
    buf = [];
    len = 0;
  };

  for (const line of lines) {
    buf.push(line);
    len += line.text.length + 1;
    const endsSentence = /[.?!]["')\]]?$/.test(line.text);
    if ((endsSentence && len >= MIN_PASSAGE_CHARS) || len >= maxChars) flush();
  }
  flush();
  return passages;
}

// Turn an uploaded filename into a readable lesson title (default when the user
// leaves the title blank).
export function deriveTitleFromFilename(filename: string): string {
  const base = filename.replace(/\.[^./\\]+$/, ""); // strip extension
  const cleaned = base
    .replace(/[_]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return cleaned.length > 0 ? cleaned : "未命名课程";
}
