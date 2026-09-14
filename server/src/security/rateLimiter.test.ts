import { describe, expect, it } from "vitest";
import { RateLimiter } from "./rateLimiter.js";

describe("RateLimiter", () => {
  it("allows requests under the limit", () => {
    const limiter = new RateLimiter(10_000, 3);
    expect(limiter.check("a")).toBe(true);
    expect(limiter.check("a")).toBe(true);
    expect(limiter.check("a")).toBe(true);
  });

  it("rejects requests over the limit within the window", () => {
    const limiter = new RateLimiter(10_000, 2);
    expect(limiter.check("a")).toBe(true);
    expect(limiter.check("a")).toBe(true);
    expect(limiter.check("a")).toBe(false);
  });

  it("tracks separate keys independently", () => {
    const limiter = new RateLimiter(10_000, 1);
    expect(limiter.check("a")).toBe(true);
    expect(limiter.check("b")).toBe(true);
    expect(limiter.check("a")).toBe(false);
    expect(limiter.check("b")).toBe(false);
  });

  it("resets a key on demand", () => {
    const limiter = new RateLimiter(10_000, 1);
    expect(limiter.check("a")).toBe(true);
    limiter.reset("a");
    expect(limiter.check("a")).toBe(true);
  });
});
