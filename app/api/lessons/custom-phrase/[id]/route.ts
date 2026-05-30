import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAuthedRequest } from "@/lib/auth";
import { deleteCustomPhrase } from "@/lib/db";

export const runtime = "nodejs";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthedRequest(request)) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;
  try {
    await deleteCustomPhrase(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[custom-phrase] 删除失败:", err);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
