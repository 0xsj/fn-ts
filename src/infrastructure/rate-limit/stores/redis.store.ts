// src/infrastructure/rate-limit/stores/redis.store.ts
import { RateLimitStore, RateLimitInfo } from '../types';
import { RedisClient } from '../../cache/redis.client';
import { logger } from '../../../shared/utils/logger';

export class RedisRateLimitStore implements RateLimitStore {
  private redis = RedisClient.getInstance().getClient();
  private readonly keyPrefix: string;

  constructor(keyPrefix: string = 'ratelimit:') {
    this.keyPrefix = keyPrefix;
  }

  async increment(key: string, windowMs: number): Promise<RateLimitInfo> {
    const fullKey = `${this.keyPrefix}${key}`;
    const now = Date.now();
    const resetAt = now + windowMs;

    try {
      // Use Redis pipeline for atomic operations
      const pipeline = this.redis.multi();
      
      // Increment the counter
      pipeline.incr(fullKey);
      
      // Set expiry if this is the first request in the window
      pipeline.expire(fullKey, Math.ceil(windowMs / 1000));
      
      // Get current TTL
      pipeline.ttl(fullKey);
      
      const results = await pipeline.exec();
      
      if (!results || results.length < 3) {
        throw new Error('Redis pipeline failed');
      }

      // Safely extract values from results
      const current = Number(results[0]);
      const ttl = Number(results[2]);
      
      // Calculate actual reset time based on TTL
      const actualResetAt = ttl > 0 ? now + (ttl * 1000) : resetAt;

      return {
        limit: 0, // Will be set by the rate limiter
        current,
        remaining: 0, // Will be calculated by the rate limiter
        resetAt: new Date(actualResetAt),
      };
    } catch (error) {
      logger.error('Redis rate limit increment failed', { error, key: fullKey });
      throw error;
    }
  }

  async decrement(key: string): Promise<void> {
    const fullKey = `${this.keyPrefix}${key}`;
    
    try {
      const current = await this.redis.get(fullKey);
      if (current && parseInt(current) > 0) {
        await this.redis.decr(fullKey);
      }
    } catch (error) {
      logger.error('Redis rate limit decrement failed', { error, key: fullKey });
      // Non-critical error, don't throw
    }
  }

  async reset(key: string): Promise<void> {
    const fullKey = `${this.keyPrefix}${key}`;
    
    try {
      await this.redis.del(fullKey);
    } catch (error) {
      logger.error('Redis rate limit reset failed', { error, key: fullKey });
      throw error;
    }
  }

  async get(key: string): Promise<RateLimitInfo | null> {
    const fullKey = `${this.keyPrefix}${key}`;
    
    try {
      const [current, ttl] = await Promise.all([
        this.redis.get(fullKey),
        this.redis.ttl(fullKey),
      ]);

      if (!current) {
        return null;
      }

      const now = Date.now();
      const resetAt = ttl > 0 ? now + (ttl * 1000) : now;

      return {
        limit: 0, // Will be set by the rate limiter
        current: parseInt(current),
        remaining: 0, // Will be calculated by the rate limiter
        resetAt: new Date(resetAt),
      };
    } catch (error) {
      logger.error('Redis rate limit get failed', { error, key: fullKey });
      return null;
    }
  }
}

// Sliding window implementation for more accurate rate limiting
export class RedisSlidingWindowStore implements RateLimitStore {
  private redis = RedisClient.getInstance().getClient();
  private readonly keyPrefix: string;

  constructor(keyPrefix: string = 'ratelimit:sw:') {
    this.keyPrefix = keyPrefix;
  }

  async increment(key: string, windowMs: number): Promise<RateLimitInfo> {
    const fullKey = `${this.keyPrefix}${key}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      const pipeline = this.redis.multi();
      
      // Remove old entries outside the window
      pipeline.zRemRangeByScore(fullKey, '-inf', windowStart.toString());
      
      // Add current request
      pipeline.zAdd(fullKey, {
        score: now,
        value: `${now}-${Math.random()}`, // Ensure uniqueness
      });
      
      // Count requests in current window
      pipeline.zCount(fullKey, windowStart.toString(), '+inf');
      
      // Set expiry
      pipeline.expire(fullKey, Math.ceil(windowMs / 1000));
      
      const results = await pipeline.exec();
      
      if (!results || results.length < 4) {
        throw new Error('Redis pipeline failed');
      }

      // Safely extract the count
      const current = Number(results[2]);

      return {
        limit: 0, // Will be set by the rate limiter
        current,
        remaining: 0, // Will be calculated by the rate limiter
        resetAt: new Date(now + windowMs),
      };
    } catch (error) {
      logger.error('Redis sliding window increment failed', { error, key: fullKey });
      throw error;
    }
  }

  async decrement(key: string): Promise<void> {
    // In sliding window, we remove the most recent entry
    const fullKey = `${this.keyPrefix}${key}`;
    
    try {
      await this.redis.zRemRangeByRank(fullKey, -1, -1);
    } catch (error) {
      logger.error('Redis sliding window decrement failed', { error, key: fullKey });
    }
  }

  async reset(key: string): Promise<void> {
    const fullKey = `${this.keyPrefix}${key}`;
    
    try {
      await this.redis.del(fullKey);
    } catch (error) {
      logger.error('Redis sliding window reset failed', { error, key: fullKey });
      throw error;
    }
  }

  async get(key: string): Promise<RateLimitInfo | null> {
    const fullKey = `${this.keyPrefix}${key}`;
    const now = Date.now();
    const windowMs = 60000; // Default 1 minute window for get operation
    
    try {
      const windowStart = now - windowMs;
      const count = await this.redis.zCount(fullKey, windowStart.toString(), '+inf');
      
      if (count === 0) {
        return null;
      }

      return {
        limit: 0, // Will be set by the rate limiter
        current: count,
        remaining: 0, // Will be calculated by the rate limiter
        resetAt: new Date(now + windowMs),
      };
    } catch (error) {
      logger.error('Redis sliding window get failed', { error, key: fullKey });
      return null;
    }
  }
}