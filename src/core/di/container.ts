// src/core/di/container.ts
import 'reflect-metadata';
import { container } from 'tsyringe';
import { Kysely } from 'kysely';
import type { Database } from '../../infrastructure/database/types';
import { createDatabase } from '../../infrastructure/database/connection';
import { UserRepository } from '../../infrastructure/database/repositories/user.repository';
import { UserService } from '../../domain/services/user.service';
import { RedisClient } from '../../infrastructure/cache/redis.client';
import { CacheManager } from '../../infrastructure/cache/cache.manager';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { HealthCheckService } from '../../infrastructure/monitoring/health/health-check.service';
import { EventBus } from '../../infrastructure/events/event-bus';
import { registerEventHandlers } from '../../infrastructure/events/event-bus.registry';
import { logger } from '../../shared/utils';
import { TOKENS } from './tokens';

export class DIContainer {
  private static initialized = false;

  static async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('DI Container already initialized');
      return;
    }

    try {
      await this.registerDatabase();
      await this.registerCache();
      this.registerRepositories();
      this.registerServices();
      this.registerEventBus(); // Add this
      this.registerHealthCheck();
      this.initialized = true;
      logger.info('DI Container initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize DI Container', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  private static async registerDatabase(): Promise<void> {
    const db = await createDatabase();
    container.registerInstance<Kysely<Database>>(TOKENS.Database, db);
  }

  private static async registerCache(): Promise<void> {
    const redisClient = RedisClient.getInstance();
    await redisClient.connect();
    container.registerInstance(TOKENS.RedisClient, redisClient);

    // Register CacheManager first as a singleton
    container.registerSingleton(TOKENS.CacheManager, CacheManager);

    // Register CacheService as a singleton that depends on CacheManager
    container.register(TOKENS.CacheService, {
      useFactory: (c) => {
        const cacheManager = c.resolve<CacheManager>(TOKENS.CacheManager);
        return new CacheService(cacheManager);
      },
    });
  }

  private static registerRepositories(): void {
    container.register(TOKENS.UserRepository, {
      useFactory: (c) => {
        const db = c.resolve<Kysely<Database>>(TOKENS.Database);
        return new UserRepository(db);
      },
    });
  }

  private static registerServices(): void {
    container.registerSingleton(TOKENS.UserService, UserService);
  }

  // Add this new method for EventBus
  private static registerEventBus(): void {
    // Register EventBus as singleton
    container.registerSingleton(TOKENS.EventBus, EventBus);
    
    // Get the EventBus instance and register handlers
    const eventBus = container.resolve<EventBus>(TOKENS.EventBus);
    registerEventHandlers(eventBus);
    
    logger.info('Event bus registered and handlers configured');
  }

  private static registerHealthCheck(): void {
    container.registerSingleton(TOKENS.HealthCheckService, HealthCheckService);
  }

  static resolve<T>(token: symbol): T {
    return container.resolve<T>(token);
  }

  static async dispose(): Promise<void> {
    const db = container.resolve<Kysely<Database>>(TOKENS.Database);
    await db.destroy();

    const redisClient = container.resolve<RedisClient>(TOKENS.RedisClient);
    await redisClient.disconnect();

    container.reset();
    this.initialized = false;
  }
}

export { container };