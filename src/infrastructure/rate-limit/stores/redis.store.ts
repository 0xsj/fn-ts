// src/infrastructure/rate-limit/stores/redis.store.ts
import { RateLimitStore, RateLimitInfo } from '../types';
import { RedisClient } from '../../cache/redis.client';
import { logger } from '../../../shared/utils/logger';
import type { RedisClientType } from 'redis';

export class RedisRateLimitStore implements RateLimitStore {
  private redis: RedisClientType | null = null;
  private readonly keyPrefix: string;

  constructor(keyPrefix: string = 'ratelimit:') {
    this.keyPrefix = keyPrefix;
  }

  private getRedis(): RedisClientType {
    if (!this.redis) {
      this.redis = RedisClient.getInstance().getClient();
    }
    return this.redis;
  }

  async increment(key: string, windowMs: number): Promise<RateLimitInfo> {
    const fullKey = `${this.keyPrefix}${key}`;
    const now = Date.now();
    const resetAt = now + windowMs;

    try {
      const redis = this.getRedis();
      
      // Use Redis pipeline for atomic operations
      const pipeline = redis.multi();
      
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
      const redis = this.getRedis();
      const current = await redis.get(fullKey);
      if (current && parseInt(current) > 0) {
        await redis.decr(fullKey);
      }
    } catch (error) {
      logger.error('Redis rate limit decrement failed', { error, key: fullKey });
      // Non-critical error, don't throw
    }
  }

  async reset(key: string): Promise<void> {
    const fullKey = `${this.keyPrefix}${key}`;
    
    try {
      const redis = this.getRedis();
      await redis.del(fullKey);
    } catch (error) {
      logger.error('Redis rate limit reset failed', { error, key: fullKey });
      throw error;
    }
  }

  async get(key: string): Promise<RateLimitInfo | null> {
    const fullKey = `${this.keyPrefix}${key}`;
    
    try {
      const redis = this.getRedis();
      const [current, ttl] = await Promise.all([
        redis.get(fullKey),
        redis.ttl(fullKey),
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
  private redis: RedisClientType | null = null;
  private readonly keyPrefix: string;

  constructor(keyPrefix: string = 'ratelimit:sw:') {
    this.keyPrefix = keyPrefix;
  }

  private getRedis(): RedisClientType {
    if (!this.redis) {
      this.redis = RedisClient.getInstance().getClient();
    }
    return this.redis;
  }

  async increment(key: string, windowMs: number): Promise<RateLimitInfo> {
    const fullKey = `${this.keyPrefix}${key}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      const redis = this.getRedis();
      const pipeline = redis.multi();
      
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
      logger.error('Redis sliding window increment failed', { 
        error: error instanceof Error ? error.message : error,
        key: fullKey 
      });
      throw error;
    }
  }

  async decrement(key: string): Promise<void> {
    // In sliding window, we remove the most recent entry
    const fullKey = `${this.keyPrefix}${key}`;
    
    try {
      const redis = this.getRedis();
      await redis.zRemRangeByRank(fullKey, -1, -1);
    } catch (error) {
      logger.error('Redis sliding window decrement failed', { error, key: fullKey });
    }
  }

  async reset(key: string): Promise<void> {
    const fullKey = `${this.keyPrefix}${key}`;
    
    try {
      const redis = this.getRedis();
      await redis.del(fullKey);
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
      const redis = this.getRedis();
      const windowStart = now - windowMs;
      const count = await redis.zCount(fullKey, windowStart.toString(), '+inf');
      
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