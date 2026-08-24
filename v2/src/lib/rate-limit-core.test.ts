import { describe, expect, it, beforeEach } from "vitest";
import { checkRateLimit, __resetRateLimitBucketsForTests } from "./rate-limit-core";

describe("checkRateLimit", () => {
  beforeEach(() => {
    __resetRateLimitBucketsForTests();
  });

  it("allows the first attempt for a fresh key", () => {
    expect(checkRateLimit("k1", 3, 60_000, 1_000)).toBe(true);
  });

  it("allows up to max attempts within the window, then blocks", () => {
    const key = "k2";
    expect(checkRateLimit(key, 3, 60_000, 0)).toBe(true);
    expect(checkRateLimit(key, 3, 60_000, 10)).toBe(true);
    expect(checkRateLimit(key, 3, 60_000, 20)).toBe(true);
    // 4th attempt within the same window exceeds max=3
    expect(checkRateLimit(key, 3, 60_000, 30)).toBe(false);
    // still blocked, not just a one-shot rejection
    expect(checkRateLimit(key, 3, 60_000, 40)).toBe(false);
  });

  it("resets once the window has elapsed", () => {
    const key = "k3";
    const windowMs = 1_000;
    expect(checkRateLimit(key, 1, windowMs, 0)).toBe(true);
    expect(checkRateLimit(key, 1, windowMs, 500)).toBe(false);
    // exactly at resetAt (now === resetAt) is NOT yet expired - resetAt is
    // "now + windowMs" from the first call, and the check is `resetAt < now`
    expect(checkRateLimit(key, 1, windowMs, 1_000)).toBe(false);
    // one tick past resetAt starts a fresh window
    expect(checkRateLimit(key, 1, windowMs, 1_001)).toBe(true);
  });

  it("tracks different keys independently", () => {
    expect(checkRateLimit("login:1.2.3.4:alice", 1, 60_000, 0)).toBe(true);
    // a different identity at the same IP is a different bucket
    expect(checkRateLimit("login:1.2.3.4:bob", 1, 60_000, 0)).toBe(true);
    // same identity again, same window -> blocked
    expect(checkRateLimit("login:1.2.3.4:alice", 1, 60_000, 0)).toBe(false);
  });

  it("a max of 1 allows exactly one attempt per window", () => {
    const key = "k4";
    expect(checkRateLimit(key, 1, 60_000, 0)).toBe(true);
    expect(checkRateLimit(key, 1, 60_000, 0)).toBe(false);
  });

  it("defaults `now` to the real clock when omitted, matching production call sites", () => {
    // every real call site (login/register/reset/support/ad-inquiry actions)
    // calls checkRateLimit with exactly 3 args and relies on the real clock
    const key = "k5";
    expect(checkRateLimit(key, 2, 60_000)).toBe(true);
    expect(checkRateLimit(key, 2, 60_000)).toBe(true);
    expect(checkRateLimit(key, 2, 60_000)).toBe(false);
  });
});
