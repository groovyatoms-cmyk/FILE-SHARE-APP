/**
 * Simple sliding-window rate limiter, keyed by an arbitrary string
 * (typically remote IP or connection id).
 */
export class RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly windowMs: number,
    private readonly maxHits: number,
  ) {}

  /** Returns true if the request is allowed, false if it should be rejected. */
  check(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const existing = this.hits.get(key) ?? [];
    const recent = existing.filter((t) => t > windowStart);
    recent.push(now);
    this.hits.set(key, recent);
    return recent.length <= this.maxHits;
  }

  reset(key: string): void {
    this.hits.delete(key);
  }

  /** Periodic cleanup to avoid unbounded memory growth from stale keys. */
  sweep(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    for (const [key, hits] of this.hits.entries()) {
      const recent = hits.filter((t) => t > windowStart);
      if (recent.length === 0) {
        this.hits.delete(key);
      } else {
        this.hits.set(key, recent);
      }
    }
  }
}
