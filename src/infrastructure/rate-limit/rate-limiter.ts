// src/infrastructure/rate-limit/rate-limiter.ts
import { RateLimiter, RateLimitInfo, RateLimitOptions, RateLimitStore } from './types';
import { RedisRateLimitStore, RedisSlidingWindowStore } from './stores/redis.store';
import { logger } from '../../shared/utils/logger';

export class RateLimiterImpl implements RateLimiter {
  private store: RateLimitStore | null = null;
  private readonly options: Required<RateLimitOptions>;

  constructor(options: RateLimitOptions) {
    this.options = this.normalizeOptions(options);
  }

  private getStore(): RateLimitStore {
    if (!this.store) {
      // Create store lazily when first needed
      switch (this.options.strategy) {
        case 'sliding-window':
          this.store = new RedisSlidingWindowStore(this.options.keyPrefix);
          break;
        case 'fixed-window':
        case 'token-bucket':
        default:
          this.store = new RedisRateLimitStore(this.options.keyPrefix);
          break;
      }
    }
    return this.store;
  }

  private normalizeOptions(options: RateLimitOptions): Required<RateLimitOptions> {
    return {
      max: options.max,
      windowMs: options.windowMs,
      strategy: options.strategy || 'fixed-window',
      keyGenerator: options.keyGenerator || ((req) => req.ip || 'unknown'),
      skipSuccessfulRequests: options.skipSuccessfulRequests || false,
      skipFailedRequests: options.skipFailedRequests || false,
      message: options.message || 'Too many requests, please try again later.',
      statusCode: options.statusCode || 429,
      headers: options.headers !== false,
      whitelist: options.whitelist || [],
      keyPrefix: options.keyPrefix || 'ratelimit:',
    };
  }

  async isAllowed(key: string): Promise<boolean> {
    try {
      // Check whitelist
      if (this.options.whitelist.includes(key)) {
        return true;
      }

      const store = this.getStore();
      const info = await store.get(key);
      if (!info) {
        return true; // No record means first request
      }

      return info.current < this.options.max;
    } catch (error) {
      logger.error('Rate limiter isAllowed error', { error, key });
      // On error, allow the request (fail open)
      return true;
    }
  }

  async consume(key: string): Promise<RateLimitInfo> {
    try {
      // Check whitelist
      if (this.options.whitelist.includes(key)) {
        return {
          limit: this.options.max,
          current: 0,
          remaining: this.options.max,
          resetAt: new Date(Date.now() + this.options.windowMs),
        };
      }

      const store = this.getStore();
      const info = await store.increment(key, this.options.windowMs);
      
      // Set the limit and calculate remaining
      info.limit = this.options.max;
      info.remaining = Math.max(0, this.options.max - info.current);

      return info;
    } catch (error) {
      logger.error('Rate limiter consume error', { error, key });
      // On error, return a default info
      return {
        limit: this.options.max,
        current: 0,
        remaining: this.options.max,
        resetAt: new Date(Date.now() + this.options.windowMs),
      };
    }
  }

  async reset(key: string): Promise<void> {
    try {
      const store = this.getStore();
      await store.reset(key);
    } catch (error) {
      logger.error('Rate limiter reset error', { error, key });
    }
  }

  async getRateLimitInfo(key: string): Promise<RateLimitInfo | null> {
    try {
      // Check whitelist
      if (this.options.whitelist.includes(key)) {
        return {
          limit: this.options.max,
          current: 0,
          remaining: this.options.max,
          resetAt: new Date(Date.now() + this.options.windowMs),
        };
      }

      const store = this.getStore();
      const info = await store.get(key);
      if (!info) {
        return null;
      }

      // Set the limit and calculate remaining
      info.limit = this.options.max;
      info.remaining = Math.max(0, this.options.max - info.current);

      return info;
    } catch (error) {
      logger.error('Rate limiter getRateLimitInfo error', { error, key });
      return null;
    }
  }

  /**
   * Called after response is sent to potentially decrement counter
   */
  async postProcess(key: string, statusCode: number): Promise<void> {
    try {
      // Skip if whitelisted
      if (this.options.whitelist.includes(key)) {
        return;
      }

      const store = this.getStore();
      const isSuccessful = statusCode < 400;
      
      if (this.options.skipSuccessfulRequests && isSuccessful) {
        await store.decrement(key);
      } else if (this.options.skipFailedRequests && !isSuccessful) {
        await store.decrement(key);
      }
    } catch (error) {
      logger.error('Rate limiter postProcess error', { error, key, statusCode });
    }
  }

  getOptions(): Required<RateLimitOptions> {
    return this.options;
  }
}

// Factory function for creating rate limiters
export function createRateLimiter(options: RateLimitOptions): RateLimiter {
  return new RateLimiterImpl(options);
}