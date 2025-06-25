import { CacheStrategy } from './cache-strategy.interface';
import { RedisClient } from '../redis.client';
import { logger } from '../../../shared/utils';

export interface LRUOptions {
  maxSize: number;
  defaultTTL?: number;
}

export class LRUCacheStrategy implements CacheStrategy {
  private redis = RedisClient.getInstance().getClient();
  private readonly maxSize: number;
  private readonly defaultTTL?: number;
  private readonly lurKeyPrefix = 'lru:access';

  constructor(options: LRUOptions) {
    this.maxSize = options.maxSize;
    this.defaultTTL = options.defaultTTL;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      if (!data) return null;

      await this.updateAccessTime(key);
      return JSON.parse(data) as T;
    } catch (error) {
      logger.error(`Error getting LRU cache key ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.evictIfNeeded();

      const serialized = JSON.stringify(value);
      const finalTTL = ttl || this.defaultTTL;

      if (finalTTL) {
        await this.redis.setEx(key, finalTTL, serialized);
      } else {
        await this.redis.set(key, serialized);
      }

      await this.updateAccessTime(key);
    } catch (error) {
      logger.error(`Error setting LRU cache key ${key}:`, error);
      throw error;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const [delResult, _zRemResult] = await Promise.all([
        this.redis.del(key),
        this.redis.zRem(this.getLRUSetKey(), key),
      ]);

      return delResult > 0;
    } catch (error) {
      logger.error(`Error deleting LRU cache key ${key}:`, error);
      return false;
    }
  }

  async deletePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.scanKeys(pattern);
      if (keys.length === 0) return 0;

      const pipeline = this.redis.multi();
      for (const key of keys) {
        pipeline.del(key);
        pipeline.zRem(this.getLRUSetKey(), key);
      }

      await pipeline.exec();
      return keys.length;
    } catch (error) {
      logger.error(`Error deleting LRU pattern ${pattern}:`, error);
      return 0;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result > 0;
    } catch (error) {
      logger.error(`Error checking existence of LRU key ${key}:`, error);
      return false;
    }
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const result = await this.redis.expire(key, ttl);
      if (result === 1) {
        // Update access time when setting expiration
        await this.updateAccessTime(key);
      }
      return result === 1;
    } catch (error) {
      logger.error(`Error setting expiration for LRU key ${key}:`, error);
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      logger.error(`Error getting TTL for LRU key ${key}:`, error);
      return -2;
    }
  }

  /**
   *
   */

  private async updateAccessTime(key: string): Promise<void> {
    const now = Date.now();
    await this.redis.zAdd(this.getLRUSetKey(), {
      score: now,
      value: key,
    });
  }

  private getLRUSetKey(): string {
    return `${this.lurKeyPrefix}keys`;
  }

  private async evictIfNeeded(): Promise<void> {
    try {
      const currentSize = await this.redis.zCard(this.getLRUSetKey());
      if (currentSize >= this.maxSize) {
        const evictCount = Math.max(1, Math.floor(this.maxSize * 0.1));

        const keysToEvict = await this.redis.zRange(this.getLRUSetKey(), 0, evictCount - 1);
        if (keysToEvict.length > 0) {
          const pipeline = this.redis.multi();

          for (const key of keysToEvict) {
            pipeline.del(key);
          }

          pipeline.zRem(this.getLRUSetKey(), keysToEvict);
          await pipeline.exec();

          logger.debug(`LRU evicted ${keysToEvict.length} keys`);
        }
      }
    } catch (error) {
      logger.error('Error during LRU eviction: ', error);
    }
  }

  async size(): Promise<number> {
    try {
      return await this.redis.zCard(this.getLRUSetKey());
    } catch (error) {
      logger.error('Error getting LRU cache size: ', error);
      return 0;
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = await this.redis.zRange(this.getLRUSetKey(), 0, -1);
      if (keys.length > 0) {
        const pipeline = this.redis.multi();

        for (const key of keys) {
          pipeline.del(key);
        }

        pipeline.del(this.getLRUSetKey());

        await pipeline.exec();

        logger.info(`LRU cache cleared: ${keys.length} keys removed`);
      }
    } catch (error) {
      logger.error('Error cleaning up LRU cache: ', error);
    }
  }

  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';

    do {
      const result = await this.redis.scan(cursor, {
        MATCH: pattern,
        COUNT: 100,
      });
      cursor = result.cursor;

      for (const key of result.keys) {
        const score = await this.redis.zScore(this.getLRUSetKey(), key);
        if (score !== null) {
          keys.push(key);
        }
      }
    } while (cursor !== '0');
    return keys;
  }

  async getStats(): Promise<{
    size: number;
    maxSize: number;
    utilizationPercent: number;
    oldestAccessTime?: Date;
    newestAccessTime?: Date;
  }> {
    try {
      const size = await this.size();

      let oldestAccessTime: Date | undefined;
      let newestAccessTime: Date | undefined;

      if (size > 0) {
        const oldest = await this.redis.zRangeWithScores(this.getLRUSetKey(), 0, 0);

        if (oldest.length > 0) {
          oldestAccessTime = new Date(oldest[0].score);
        }

        const newest = await this.redis.zRangeWithScores(this.getLRUSetKey(), -1, -1);

        if (newest.length > 0) {
          newestAccessTime = new Date(newest[0].score);
        }
      }

      return {
        size,
        maxSize: this.maxSize,
        utilizationPercent: (size / this.maxSize) * 100,
        oldestAccessTime,
        newestAccessTime,
      };
    } catch (error) {
      logger.error('Error getting LRU stats:', error);
      return {
        size: 0,
        maxSize: this.maxSize,
        utilizationPercent: 0,
      };
    }
  }
}
