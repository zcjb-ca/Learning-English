import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  checkPassword,
  createSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  if (!checkPassword(password)) {
    return NextResponse.json({ error: "密码错误" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, createSessionToken(), sessionCookieOptions());
  return response;
}
