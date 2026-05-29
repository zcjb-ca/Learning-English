import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAuthedRequest } from "@/lib/auth";
import { generateFeedback } from "@/lib/anthropic";
import { insertAttempt } from "@/lib/db";
import { allowRequest } from "@/lib/ratelimit";
import type { PracticeStage } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const VALID_STAGES: PracticeStage[] = ["3a", "3b", "4", "review"];
const MAX_INPUT_CHARS = 2000;

export async function POST(request: NextRequest) {
  if (!isAuthedRequest(request)) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  if (!allowRequest()) {
    return NextResponse.json({ error: "请求太频繁，请稍等几秒再试。" }, { status: 429 });
  }

  let body: { lessonId?: unknown; stage?: unknown; promptShown?: unknown; userInput?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const lessonId = typeof body.lessonId === "string" ? body.lessonId : "";
  const stage = body.stage as PracticeStage;
  const promptShown = typeof body.promptShown === "string" ? body.promptShown : "";
  const userInput = typeof body.userInput === "string" ? body.userInput.trim() : "";

  if (!lessonId || !VALID_STAGES.includes(stage)) {
    return NextResponse.json({ error: "参数不合法" }, { status: 400 });
  }
  if (userInput.length === 0) {
    return NextResponse.json({ error: "请先说点或写点什么。" }, { status: 400 });
  }
  if (userInput.length > MAX_INPUT_CHARS) {
    return NextResponse.json({ error: "内容太长了。" }, { status: 400 });
  }

  let feedback;
  try {
    feedback = await generateFeedback({ stage, promptShown, userInput });
  } catch {
    return NextResponse.json({ error: "AI 反馈生成失败，请重试。" }, { status: 502 });
  }

  // Persist the attempt for history + mistake review. Don't fail the response if
  // logging the attempt hiccups — the learner still gets their feedback.
  try {
    await insertAttempt({
      lessonId,
      stage,
      promptShown,
      userInput,
      feedback,
      isMistake: !feedback.ok,
      mistakeTag: feedback.mistake_tag,
    });
  } catch {
    // swallow: feedback delivery matters more than attempt logging
  }

  return NextResponse.json({ feedback });
}
