// src/core/di/modules/cache.module.ts
import { BaseModule } from './base.module';
import { DependencyContainer } from 'tsyringe';
import { RedisClient } from '../../../infrastructure/cache/redis.client';
import { CacheManager } from '../../../infrastructure/cache/cache.manager';
import { CacheService } from '../../../infrastructure/cache/cache.service';
import { TOKENS } from '../tokens';

export class CacheModule extends BaseModule {
  constructor() {
    super('CacheModule');
  }

  async register(container: DependencyContainer): Promise<void> {
    try {
      this.log('Initializing Redis client...');

      // Get Redis instance and connect
      const redisClient = RedisClient.getInstance();
      await redisClient.connect();

      container.registerInstance(TOKENS.RedisClient, redisClient);

      // Register CacheManager as singleton
      container.registerSingleton(TOKENS.CacheManager, CacheManager);

      // Register CacheService with factory
      container.register(TOKENS.CacheService, {
        useFactory: (c) => {
          const cacheManager = c.resolve<CacheManager>(TOKENS.CacheManager);
          return new CacheService(cacheManager);
        },
      });

      this.log('Cache system initialized');
    } catch (error) {
      this.logError('Failed to initialize cache', error);
      throw error;
    }
  }
}
