// Next.js 16 "proxy" (the renamed middleware). Guards every route except the
// login page and login API. Unauthenticated page requests redirect to /login;
// unauthenticated API requests get a 401. Runs on the Node.js runtime by default
// in Next 16, so node:crypto in lib/auth works here.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/login"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authed = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (isPublic(pathname)) {
    if (authed && pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (authed) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: [
    // Run on everything except Next internals and the public PWA/icon assets.
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|sw.js).*)",
  ],
};
