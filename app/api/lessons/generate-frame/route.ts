import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAuthedRequest } from "@/lib/auth";
import { generateFrameFromPhrase } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  if (!isAuthedRequest(request)) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  let body: { phrase?: unknown; context?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const phrase = typeof body.phrase === "string" ? body.phrase.trim() : "";
  const context = typeof body.context === "string" ? body.context : "";

  if (phrase.length < 2 || phrase.length > 200) {
    return NextResponse.json({ error: "选中内容太短或太长" }, { status: 400 });
  }

  try {
    const result = await generateFrameFromPhrase(phrase, context);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[generate-frame] 失败:", err);
    const detail = err instanceof Error ? err.message : "";
    return NextResponse.json(
      { error: detail || "生成失败，请重试。" },
      { status: 502 },
    );
  }
}
