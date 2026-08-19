export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

interface RequestRecord {
  timestamps: number[];
}

export class RateLimiterService {
  private requests = new Map<string, RequestRecord>();
  private readonly maxRequests = 25;
  private readonly windowMs = 60 * 1000; // 1 minute (60,000ms)

  check(identifier: string): RateLimitResult {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let record = this.requests.get(identifier);
    if (!record) {
      record = { timestamps: [] };
      this.requests.set(identifier, record);
    }

    // Filter out timestamps outside the 1-minute window
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

    if (record.timestamps.length >= this.maxRequests) {
      const oldestTimestamp = record.timestamps[0];
      const resetSeconds = Math.ceil((oldestTimestamp + this.windowMs - now) / 1000);

      return {
        allowed: false,
        limit: this.maxRequests,
        remaining: 0,
        resetSeconds: Math.max(resetSeconds, 1),
      };
    }

    // Register current request
    record.timestamps.push(now);

    return {
      allowed: true,
      limit: this.maxRequests,
      remaining: this.maxRequests - record.timestamps.length,
      resetSeconds: 60,
    };
  }

  clear(): void {
    this.requests.clear();
  }
}

export const rateLimiterService = new RateLimiterService();
