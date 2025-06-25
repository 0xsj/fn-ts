// src/infrastructure/cache/cache.manager.ts
import { injectable } from 'tsyringe';
import { CacheStrategy, CacheOptions } from './strategies/cache-strategy.interface';
import { TTLCacheStrategy } from './strategies/ttl.strategy';
import { RedisClient } from './redis.client';
import { logger } from '../../shared/utils/logger';
import { config } from '../../core/config';

export interface CacheInvalidationEvent {
  type: 'invalidate' | 'invalidate-pattern' | 'invalidate-tags';
  key?: string;
  pattern?: string;
  tags?: string[];
  source: string; // instance identifier
}

@injectable()
export class CacheManager {
  private strategy: CacheStrategy;
  private readonly prefix: string;
  private readonly instanceId: string;
  private readonly publisher = RedisClient.getInstance().getPublisher();
  private readonly subscriber = RedisClient.getInstance().getSubscriber();
  private readonly invalidationChannel = 'cache:invalidation';
  private tagIndex = new Map<string, Set<string>>();

  constructor() {
    this.strategy = new TTLCacheStrategy();
    this.prefix = config.redis.cache.keyPrefix;
    this.instanceId = `${process.env.HOSTNAME || 'local'}-${process.pid}`;
    this.setupInvalidationListener();
  }

  private setupInvalidationListener(): void {
    this.subscriber.subscribe(this.invalidationChannel, (message) => {
      try {
        const event: CacheInvalidationEvent = JSON.parse(message);

        // Ignore events from self to prevent loops
        if (event.source === this.instanceId) return;

        this.handleInvalidationEvent(event);
      } catch (error) {
        logger.error('Error handling cache invalidation event:', error);
      }
    });
  }

  private async handleInvalidationEvent(event: CacheInvalidationEvent): Promise<void> {
    logger.debug('Handling cache invalidation event:', event);

    switch (event.type) {
      case 'invalidate':
        if (event.key) {
          await this.strategy.delete(this.buildKey(event.key));
        }
        break;

      case 'invalidate-pattern':
        if (event.pattern) {
          await this.strategy.deletePattern(this.buildKey(event.pattern));
        }
        break;

      case 'invalidate-tags':
        if (event.tags) {
          await this.invalidateByTags(event.tags, false);
        }
        break;
    }
  }

  private buildKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  private async broadcastInvalidation(
    event: Omit<CacheInvalidationEvent, 'source'>,
  ): Promise<void> {
    const fullEvent: CacheInvalidationEvent = {
      ...event,
      source: this.instanceId,
    };

    await this.publisher.publish(this.invalidationChannel, JSON.stringify(fullEvent));
  }

  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.buildKey(key);
    const result = await this.strategy.get<T>(fullKey);

    if (result !== null) {
      logger.debug(`Cache hit for key: ${key}`);
    } else {
      logger.debug(`Cache miss for key: ${key}`);
    }

    return result;
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const fullKey = this.buildKey(key);
    const ttl = options?.ttl || config.redis.cache.ttl;

    logger.debug(`CacheManager.set called with key: ${key}, fullKey: ${fullKey}, ttl: ${ttl}`);

    try {
      await this.strategy.set(fullKey, value, ttl);

      // Handle tags
      if (options?.tags) {
        await this.addToTags(fullKey, options.tags);
      }

      logger.debug(`Cache set for key: ${key}, TTL: ${ttl}s`);
    } catch (error) {
      logger.error(`Failed to set cache for key ${key}:`, error);
      throw error;
    }
  }

  async invalidate(key: string, broadcast = true): Promise<boolean> {
    const fullKey = this.buildKey(key);
    const result = await this.strategy.delete(fullKey);

    if (result && broadcast) {
      await this.broadcastInvalidation({ type: 'invalidate', key });
    }

    logger.debug(`Cache invalidated for key: ${key}`);
    return result;
  }

  async invalidatePattern(pattern: string, broadcast = true): Promise<number> {
    const fullPattern = this.buildKey(pattern);
    const count = await this.strategy.deletePattern(fullPattern);

    if (count > 0 && broadcast) {
      await this.broadcastInvalidation({ type: 'invalidate-pattern', pattern });
    }

    logger.debug(`Cache invalidated ${count} keys for pattern: ${pattern}`);
    return count;
  }

  async invalidateByTags(tags: string[], broadcast = true): Promise<number> {
    let totalInvalidated = 0;

    for (const tag of tags) {
      const keys = this.tagIndex.get(tag);
      if (keys) {
        for (const key of keys) {
          const deleted = await this.strategy.delete(key);
          if (deleted) totalInvalidated++;
        }
        this.tagIndex.delete(tag);
      }
    }

    if (totalInvalidated > 0 && broadcast) {
      await this.broadcastInvalidation({ type: 'invalidate-tags', tags });
    }

    logger.debug(`Cache invalidated ${totalInvalidated} keys for tags: ${tags.join(', ')}`);
    return totalInvalidated;
  }

  private async addToTags(key: string, tags: string[]): Promise<void> {
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(key);
    }
  }

  async exists(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key);
    return this.strategy.exists(fullKey);
  }

  async ttl(key: string): Promise<number> {
    const fullKey = this.buildKey(key);
    return this.strategy.ttl(fullKey);
  }

  async flush(): Promise<void> {
    await this.invalidatePattern('*', true);
    this.tagIndex.clear();
    logger.info('Cache flushed');
  }
}
