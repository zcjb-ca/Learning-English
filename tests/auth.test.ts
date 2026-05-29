import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  checkPassword,
  createSessionToken,
  verifySessionToken,
} from "../lib/auth";

const DAY_MS = 24 * 60 * 60 * 1000;

beforeAll(() => {
  process.env.SESSION_SECRET = "test-session-secret-do-not-use";
  process.env.APP_PASSWORD = "correct horse battery";
});

describe("session token", () => {
  it("verifies a freshly created token", () => {
    const token = createSessionToken();
    expect(verifySessionToken(token)).toBe(true);
  });

  it("rejects a tampered signature", () => {
    const token = createSessionToken();
    const tampered = `${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`;
    expect(verifySessionToken(tampered)).toBe(false);
  });

  it("rejects malformed and empty tokens", () => {
    expect(verifySessionToken("")).toBe(false);
    expect(verifySessionToken(undefined)).toBe(false);
    expect(verifySessionToken("no-dot-here")).toBe(false);
    expect(verifySessionToken("a.b.c")).toBe(false);
  });

  it("rejects an expired token", () => {
    const spy = vi.spyOn(Date, "now").mockReturnValue(Date.now() - 31 * DAY_MS);
    const stale = createSessionToken();
    spy.mockRestore();
    expect(verifySessionToken(stale)).toBe(false);
  });
});

describe("checkPassword", () => {
  it("accepts the configured password", () => {
    expect(checkPassword("correct horse battery")).toBe(true);
  });

  it("rejects a wrong password (same and different length)", () => {
    expect(checkPassword("correct horse batteryX")).toBe(false);
    expect(checkPassword("wrong")).toBe(false);
    expect(checkPassword("")).toBe(false);
  });
});
