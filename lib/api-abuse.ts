export type RateLimitResult =
  { allowed: true; remaining: number } | { allowed: false; retryAfter: number };

export class SlidingWindowRateLimiter {
  private readonly requests = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly maxKeys = 10_000,
  ) {}

  check(key: string, now = Date.now()): RateLimitResult {
    if (!this.requests.has(key) && this.requests.size >= this.maxKeys) this.prune(now);
    if (!this.requests.has(key) && this.requests.size >= this.maxKeys) {
      const oldest = this.requests.keys().next().value;
      if (oldest) this.requests.delete(oldest);
    }
    const threshold = now - this.windowMs;
    const recent = (this.requests.get(key) || []).filter((timestamp) => timestamp > threshold);
    if (recent.length >= this.limit) {
      this.requests.set(key, recent);
      return {
        allowed: false,
        retryAfter: Math.max(1, Math.ceil((recent[0] + this.windowMs - now) / 1000)),
      };
    }
    recent.push(now);
    this.requests.set(key, recent);
    return { allowed: true, remaining: this.limit - recent.length };
  }

  private prune(now: number) {
    const threshold = now - this.windowMs;
    for (const [key, timestamps] of this.requests) {
      if (!timestamps.some((timestamp) => timestamp > threshold)) this.requests.delete(key);
    }
  }
}

export class ConcurrencyGate {
  private active = 0;

  constructor(private readonly limit: number) {}

  tryAcquire() {
    if (this.active >= this.limit) return false;
    this.active += 1;
    return true;
  }

  release() {
    this.active = Math.max(0, this.active - 1);
  }
}

export function requestClientKey(request: Request) {
  if (process.env.ASK_TRUST_PROXY !== "true") return "untrusted-proxy";
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}
