// Single-user authentication: one shared password (APP_PASSWORD) verified with a
// constant-time comparison, then a signed (HMAC-SHA256) session cookie. The
// cookie carries an issued-at timestamp so sessions expire after 30 days.
//
// Server-only. Never import this into a Client Component.

import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { requireEnv } from "./env";

export const SESSION_COOKIE = "le_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function hmac(data: string): Buffer {
  return createHmac("sha256", requireEnv("SESSION_SECRET")).update(data).digest();
}

function safeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Compare against itself to keep timing roughly constant, then fail.
    timingSafeEqual(bufB, bufB);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export function checkPassword(input: string): boolean {
  return safeEqualStrings(input, requireEnv("APP_PASSWORD"));
}

export function createSessionToken(): string {
  const payload = JSON.stringify({ iat: Date.now(), n: b64url(randomBytes(8)) });
  const data = b64url(Buffer.from(payload, "utf8"));
  const sig = b64url(hmac(data));
  return `${data}.${sig}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [data, sig] = parts;
  if (!safeEqualStrings(sig, b64url(hmac(data)))) return false;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as {
      iat?: number;
    };
    if (typeof payload.iat !== "number") return false;
    const ageSeconds = (Date.now() - payload.iat) / 1000;
    return ageSeconds >= 0 && ageSeconds <= MAX_AGE_SECONDS;
  } catch {
    return false;
  }
}

export function isAuthedRequest(request: NextRequest): boolean {
  return verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    // Browsers treat localhost as a secure context, but plain-http custom
    // domains would drop a Secure cookie — so only require Secure in production.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  };
}
