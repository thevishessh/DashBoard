import { describe, expect, it } from "vitest";
import { createSession, safeEqual, sessionSecret, verifySession } from "./session";

describe("dashboard session", () => {
  it("accepts its own token until it expires", async () => {
    const t = await createSession("s3cret", 1_000);
    expect(await verifySession(t, "s3cret", 2_000)).toBe(true);
    expect(await verifySession(t, "s3cret", 1_000 + 31 * 86_400_000)).toBe(false);
  });

  it("rejects tampered, foreign or empty tokens", async () => {
    const t = await createSession("s3cret", 1_000);
    const [exp, sig] = t.split(".");
    expect(await verifySession(`${Number(exp) + 1}.${sig}`, "s3cret", 2_000)).toBe(false);
    expect(await verifySession(t, "other", 2_000)).toBe(false);
    expect(await verifySession(undefined, "s3cret")).toBe(false);
    expect(await verifySession("garbage", "s3cret")).toBe(false);
    expect(await verifySession(t, "", 2_000)).toBe(false);
  });

  it("compares strings safely", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });

  it("derives the signing secret", () => {
    expect(sessionSecret({ AUTH_SECRET: "x", DASHBOARD_PASSWORD: "p" })).toBe("x");
    expect(sessionSecret({ DASHBOARD_PASSWORD: "p" })).toBe("pw:p");
    expect(sessionSecret({})).toBe("");
  });
});
