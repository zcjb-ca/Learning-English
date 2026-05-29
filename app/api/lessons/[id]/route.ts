import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAuthedRequest } from "@/lib/auth";
import { getLesson } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthedRequest(request)) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  const { id } = await params;
  const lesson = await getLesson(id);
  if (!lesson) {
    return NextResponse.json({ error: "课程不存在" }, { status: 404 });
  }
  return NextResponse.json({ lesson });
}
