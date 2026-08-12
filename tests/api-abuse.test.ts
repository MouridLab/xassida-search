import { describe, expect, it } from "vitest";
import { ConcurrencyGate, SlidingWindowRateLimiter, requestClientKey } from "../lib/api-abuse";
import { askInput, ASK_MAX_BODY_BYTES } from "../lib/ask-policy";

describe("ask API abuse controls", () => {
  it("rejects invalid and unknown payload fields", () => {
    expect(askInput.safeParse({ question: "abc" }).success).toBe(false);
    expect(askInput.safeParse({ question: "question valide", role: "admin" }).success).toBe(false);
    expect(askInput.safeParse({ question: "x".repeat(501) }).success).toBe(false);
    expect(ASK_MAX_BODY_BYTES).toBeLessThanOrEqual(2_048);
  });

  it("limits a client within a sliding window", () => {
    const limiter = new SlidingWindowRateLimiter(2, 1_000);
    expect(limiter.check("client", 0).allowed).toBe(true);
    expect(limiter.check("client", 1).allowed).toBe(true);
    expect(limiter.check("client", 2)).toEqual({ allowed: false, retryAfter: 1 });
    expect(limiter.check("client", 1_001).allowed).toBe(true);
  });

  it("isolates rate limits by client", () => {
    const limiter = new SlidingWindowRateLimiter(1, 1_000);
    expect(limiter.check("a", 10).allowed).toBe(true);
    expect(limiter.check("b", 10).allowed).toBe(true);
  });

  it("bounds stored client identities", () => {
    const limiter = new SlidingWindowRateLimiter(1, 1_000, 2);
    expect(limiter.check("a", 0).allowed).toBe(true);
    expect(limiter.check("b", 0).allowed).toBe(true);
    expect(limiter.check("c", 0).allowed).toBe(true);
    expect(limiter.check("a", 1).allowed).toBe(true);
  });

  it("bounds and safely releases concurrency", () => {
    const gate = new ConcurrencyGate(1);
    expect(gate.tryAcquire()).toBe(true);
    expect(gate.tryAcquire()).toBe(false);
    gate.release();
    expect(gate.tryAcquire()).toBe(true);
    gate.release();
    gate.release();
    expect(gate.tryAcquire()).toBe(true);
  });

  it("does not trust spoofable proxy headers by default", () => {
    const request = new Request("https://example.test", {
      headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
    });
    expect(requestClientKey(request)).toBe("untrusted-proxy");
  });

  it("uses the first proxy address only when deployment explicitly trusts its proxy", () => {
    process.env.ASK_TRUST_PROXY = "true";
    const request = new Request("https://example.test", {
      headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
    });
    expect(requestClientKey(request)).toBe("203.0.113.7");
    delete process.env.ASK_TRUST_PROXY;
  });
});
