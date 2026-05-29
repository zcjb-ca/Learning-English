// PDF text extraction via unpdf (serverless-friendly, no native deps). The raw
// binary is discarded after extraction — only the cleaned text is stored.

import { extractText, getDocumentProxy } from "unpdf";

export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  const merged = Array.isArray(text) ? text.join("\n") : text;
  return cleanPdfText(merged);
}

// Pure text normalization — kept separate so it can be unit-tested without a PDF.
export function cleanPdfText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n") // normalize line endings
    .replace(/-\n(?=[a-z])/g, "") // re-join words hyphenated across a line break
    .replace(/[ \t]+\n/g, "\n") // drop trailing whitespace on each line
    .replace(/[ \t]{2,}/g, " ") // collapse runs of spaces/tabs
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n") // collapse 3+ blank lines into one blank line
    .trim();
}

// Turn an uploaded filename into a readable lesson title.
export function deriveTitleFromFilename(filename: string): string {
  const base = filename.replace(/\.[^./\\]+$/, ""); // strip extension
  const cleaned = base
    .replace(/[_]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return cleaned.length > 0 ? cleaned : "未命名课程";
}
