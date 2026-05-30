// Issues short-lived client tokens so the browser can upload the lesson audio
// (.m4a, ~16MB) DIRECTLY to Vercel Blob. This sidesteps the ~4.5MB request-body
// limit on Vercel Functions — the bytes never pass through this function. The
// browser gets the resulting public Blob URL and hands it to POST /api/lessons.

import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAuthedRequest } from "@/lib/auth";

export const runtime = "nodejs";

const MAX_AUDIO_BYTES = 60 * 1024 * 1024; // 60MB — generous for a podcast episode

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isAuthedRequest(request)) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  try {
    const result = await handleUpload({
      request,
      body,
      // Only an authenticated learner reaches this point (checked above), so the
      // token grants a constrained, public audio upload.
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["audio/*"],
        maximumSizeInBytes: MAX_AUDIO_BYTES,
        addRandomSuffix: true,
      }),
      // onUploadCompleted intentionally omitted: the client receives the URL and
      // passes it to /api/lessons. (The completion webhook also can't reach
      // localhost during development.)
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[upload-audio] Blob 上传授权失败:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "音频上传授权失败" },
      { status: 400 },
    );
  }
}
