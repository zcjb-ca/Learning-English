import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAuthedRequest } from "@/lib/auth";
import { initSchema } from "@/lib/db";

// Idempotent schema setup. Guarded by proxy + an explicit auth check, so only a
// logged-in user can run it. Visit /api/init once after the first deploy.
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!isAuthedRequest(request)) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  try {
    await initSchema();
    return NextResponse.json({ ok: true, message: "数据库表已就绪，可以开始使用了。" });
  } catch (error) {
    return NextResponse.json(
      { error: "建表失败", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
