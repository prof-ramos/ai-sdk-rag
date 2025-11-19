/**
 * Rate Limiter for Perplexity API calls
 *
 * This prevents API quota exhaustion and controls costs by limiting
 * the number of search requests per time window.
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Simple in-memory rate limiter
 * For production, use Redis-based solution like @upstash/ratelimit
 */
export class SearchRateLimiter {
  private limits: Map<string, RateLimitEntry>;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig = { maxRequests: 10, windowMs: 60000 }) {
    this.limits = new Map();
    this.config = config;

    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Check if a request should be allowed
   * @param identifier - User ID, IP address, or session ID
   * @returns true if request is allowed, false if rate limited
   */
  async checkLimit(identifier: string): Promise<boolean> {
    const now = Date.now();
    const entry = this.limits.get(identifier);

    // No previous requests or window expired
    if (!entry || now >= entry.resetAt) {
      this.limits.set(identifier, {
        count: 1,
        resetAt: now + this.config.windowMs,
      });
      return true;
    }

    // Within window, check if under limit
    if (entry.count < this.config.maxRequests) {
      entry.count++;
      return true;
    }

    // Rate limited
    return false;
  }

  /**
   * Get remaining requests for an identifier
   */
  getRemainingRequests(identifier: string): number {
    const entry = this.limits.get(identifier);
    if (!entry || Date.now() >= entry.resetAt) {
      return this.config.maxRequests;
    }
    return Math.max(0, this.config.maxRequests - entry.count);
  }

  /**
   * Get time until reset in milliseconds
   */
  getResetTime(identifier: string): number {
    const entry = this.limits.get(identifier);
    if (!entry) {
      return 0;
    }
    return Math.max(0, entry.resetAt - Date.now());
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now >= entry.resetAt) {
        this.limits.delete(key);
      }
    }
  }
}

// Export singleton instance
export const searchRateLimiter = new SearchRateLimiter({
  maxRequests: 10, // 10 searches per window
  windowMs: 60000, // 1 minute window
});

/**
 * Rate limit error with retry information
 */
export class RateLimitError extends Error {
  constructor(
    public retryAfter: number,
    public remaining: number,
  ) {
    super(
      `Rate limit exceeded. ${remaining} requests remaining. Retry after ${Math.ceil(retryAfter / 1000)}s`,
    );
    this.name = "RateLimitError";
  }
}
