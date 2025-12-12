export class RateLimiter {
  constructor(windowMs = 60000, maxRequests = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.map = new Map();
  }

  // key can be ip or user id
  check(key) {
    const now = Date.now();
    const entry = this.map.get(key) || { count: 0, first: now };
    if (now - entry.first > this.windowMs) {
      // reset
      entry.count = 1;
      entry.first = now;
      this.map.set(key, entry);
      return { ok: true, remaining: this.maxRequests - 1 };
    }
    entry.count += 1;
    this.map.set(key, entry);
    if (entry.count > this.maxRequests) return { ok: false, remaining: 0 };
    return { ok: true, remaining: this.maxRequests - entry.count };
  }
}

// simple in-memory instance exported for function reuse
export const globalRateLimiter = new RateLimiter(60000, 100);
