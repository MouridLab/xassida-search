import type { RateLimitResult } from "./api-abuse";
import { SlidingWindowRateLimiter } from "./api-abuse";
import { adminClient } from "./supabase";

export interface RateLimiter {
  consume(key: string): Promise<RateLimitResult>;
}

export class MemoryRateLimiter implements RateLimiter {
  private limiter: SlidingWindowRateLimiter;
  constructor(limit: number, windowMs: number) {
    this.limiter = new SlidingWindowRateLimiter(limit, windowMs);
  }
  async consume(key: string) {
    return this.limiter.check(key);
  }
}

export class PostgresRateLimiter implements RateLimiter {
  constructor(
    private limit: number,
    private windowSeconds: number,
  ) {}
  async consume(key: string): Promise<RateLimitResult> {
    const { data, error } = await adminClient().rpc("consume_rate_limit", {
      p_key: key,
      p_limit: this.limit,
      p_window_seconds: this.windowSeconds,
    });
    if (error || !data?.[0]) throw error || new Error("RATE_LIMIT_UNAVAILABLE");
    const row = data[0];
    return row.allowed
      ? { allowed: true, remaining: row.remaining }
      : { allowed: false, retryAfter: row.retry_after };
  }
}
