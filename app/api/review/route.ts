import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAuthedRequest } from "@/lib/auth";
import { listMistakes } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!isAuthedRequest(request)) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  const mistakes = await listMistakes(50);
  return NextResponse.json({ mistakes });
}
