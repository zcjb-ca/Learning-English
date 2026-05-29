import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAuthedRequest } from "@/lib/auth";
import { insertLesson, listLessons } from "@/lib/db";
import { deriveTitleFromFilename, extractPdfText } from "@/lib/pdf";
import { ingestLesson } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 60; // ingest (PDF parse + Claude) can take a while

const MAX_BYTES = 10 * 1024 * 1024; // 10MB

function unauthorized() {
  return NextResponse.json({ error: "请先登录" }, { status: 401 });
}

export async function GET(request: NextRequest) {
  if (!isAuthedRequest(request)) return unauthorized();
  const lessons = await listLessons();
  return NextResponse.json({ lessons });
}

export async function POST(request: NextRequest) {
  if (!isAuthedRequest(request)) return unauthorized();

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const file = form.get("file");
  const titleRaw = form.get("title");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "请选择一个 PDF 文件" }, { status: 400 });
  }
  if (file.type && file.type !== "application/pdf") {
    return NextResponse.json({ error: "只支持 PDF 文件" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "文件过大（上限 10MB）" }, { status: 400 });
  }

  let text: string;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    text = await extractPdfText(bytes);
  } catch (err) {
    console.error("[lessons] PDF 解析失败:", err);
    return NextResponse.json({ error: "PDF 解析失败，请换一个文件试试" }, { status: 422 });
  }

  if (text.trim().length < 40) {
    return NextResponse.json(
      { error: "没能从这个 PDF 提取到足够的文字（可能是扫描版图片 PDF）。" },
      { status: 422 },
    );
  }

  const title =
    typeof titleRaw === "string" && titleRaw.trim().length > 0
      ? titleRaw.trim()
      : deriveTitleFromFilename(file.name);

  let ingested;
  try {
    ingested = await ingestLesson(text);
  } catch (err) {
    console.error("[lessons] AI ingest 失败:", err);
    return NextResponse.json(
      { error: "AI 抽取句式失败，请稍后重试（也可能是 API key 未配置或额度不足）。" },
      { status: 502 },
    );
  }

  const id = await insertLesson({
    title,
    sourceFilename: file.name,
    fullText: text,
    passages: ingested.passages,
    frames: ingested.frames,
  });

  return NextResponse.json({ id, title, frames: ingested.frames.length });
}
