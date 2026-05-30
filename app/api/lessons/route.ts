import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAuthedRequest } from "@/lib/auth";
import { insertLesson, listLessons } from "@/lib/db";
import { ingestLesson } from "@/lib/anthropic";
import {
  deriveTitleFromFilename,
  groupIntoPassages,
  linesToTranscript,
  parseLrc,
} from "@/lib/lrc";

export const runtime = "nodejs";
// Ingest (per-passage translation + collocations + frames) can take a while.
export const maxDuration = 300;

const MAX_LRC_CHARS = 500_000;
const MIN_LINES = 3;

function unauthorized() {
  return NextResponse.json({ error: "请先登录" }, { status: 401 });
}

// The audio must already live in our Vercel Blob store (uploaded directly by the
// browser via /api/lessons/upload-audio). Refuse arbitrary URLs.
function isValidAudioUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  if (!isAuthedRequest(request)) return unauthorized();
  const lessons = await listLessons();
  return NextResponse.json({ lessons });
}

export async function POST(request: NextRequest) {
  if (!isAuthedRequest(request)) return unauthorized();

  let body: { title?: unknown; sourceFilename?: unknown; lrcText?: unknown; audioUrl?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const lrcText = typeof body.lrcText === "string" ? body.lrcText : "";
  const audioUrl = typeof body.audioUrl === "string" ? body.audioUrl : "";
  const sourceFilename = typeof body.sourceFilename === "string" ? body.sourceFilename : null;
  const titleRaw = typeof body.title === "string" ? body.title : "";

  if (lrcText.trim().length === 0 || lrcText.length > MAX_LRC_CHARS) {
    return NextResponse.json({ error: "字幕内容为空或过大" }, { status: 400 });
  }
  if (!isValidAudioUrl(audioUrl)) {
    return NextResponse.json({ error: "音频地址无效，请重新上传音频。" }, { status: 400 });
  }

  const lines = parseLrc(lrcText);
  if (lines.length < MIN_LINES) {
    return NextResponse.json(
      { error: "没能从字幕里解析出足够的内容（确认是 [mm:ss.xx] 格式的 .lrc）。" },
      { status: 422 },
    );
  }

  const passages = groupIntoPassages(lines);
  const fullText = linesToTranscript(lines);

  let ingested;
  try {
    ingested = await ingestLesson(passages);
  } catch (err) {
    console.error("[lessons] AI ingest 失败:", err);
    const detail = err instanceof Error ? err.message : "";
    return NextResponse.json(
      { error: detail || "AI 抽取句式失败，请稍后重试。" },
      { status: 502 },
    );
  }

  const title =
    titleRaw.trim().length > 0 ? titleRaw.trim() : deriveTitleFromFilename(sourceFilename ?? "");

  const id = await insertLesson({
    title,
    sourceFilename,
    fullText,
    audioUrl,
    passages: ingested.passages,
    frames: ingested.frames,
    collocations: ingested.collocations,
  });

  return NextResponse.json({
    id,
    title,
    frames: ingested.frames.length,
    collocations: ingested.collocations.length,
  });
}
