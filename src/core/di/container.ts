// src/core/di/container.ts
import 'reflect-metadata';
import { container } from 'tsyringe';
import { Kysely } from 'kysely';
import type { Database } from '../../infrastructure/database/types';
import { logger } from '../../shared/utils';
import { TOKENS } from './tokens';
import {
  DatabaseModule,
  CacheModule,
  SearchModule,
  RepositoryModule,
  ServiceModule,
  IntegrationModule,
  QueueModule,
  MonitoringModule,
  CoreModule,
  ControllerModule,
} from './modules';
import { BaseModule } from './modules/base.module';
import { RedisClient } from '../../infrastructure/cache/redis.client';
import { QueueManager } from '../../infrastructure/queue/queue.manager';
import { MetricsService } from '../../infrastructure/monitoring/metrics/metrics.service';

export class DIContainer {
  private static initialized = false;
  private static modules: BaseModule[] = [
    new CoreModule(),
    new DatabaseModule(),
    new CacheModule(),
    new SearchModule(), // Optional, won't fail if ES is down
    new RepositoryModule(), // Depends on Database
    new ServiceModule(), // Depends on Repositories
    new IntegrationModule(), // Email, Push services
    new QueueModule(), // Depends on Redis from Cache
    new MonitoringModule(), // Depends on Services, Queue
    new ControllerModule()
  ];

  static async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('DI Container already initialized');
      return;
    }

    try {
      logger.info('Starting DI Container initialization...');

      // Register each module in order
      for (const module of this.modules) {
        logger.info(`Loading ${module.getName()}...`);
        await module.register(container);
        logger.info(`✓ ${module.getName()} loaded successfully`);
      }

      this.initialized = true;
      logger.info('✅ DI Container initialized successfully');

      // Log summary
      this.logInitializationSummary();
    } catch (error) {
      logger.error('❌ Failed to initialize DI Container', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  static resolve<T>(token: symbol): T {
    if (!this.initialized) {
      throw new Error('DI Container not initialized. Call DIContainer.initialize() first.');
    }
    return container.resolve<T>(token);
  }

  static async dispose(): Promise<void> {
    if (!this.initialized) {
      logger.warn('DI Container not initialized, nothing to dispose');
      return;
    }

    logger.info('Starting DI Container disposal...');

    try {
      // Stop metrics collection
      try {
        const metricsService = container.resolve<MetricsService>(TOKENS.MetricsService);
        await metricsService.stopCollection();
        logger.info('✓ Metrics collection stopped');
      } catch (error) {
        logger.warn('Failed to stop metrics collection', error);
      }

      // Shutdown queue manager
      try {
        const queueManager = container.resolve<QueueManager>(TOKENS.QueueManager);
        await queueManager.shutdown();
        logger.info('✓ Queue manager shut down');
      } catch (error) {
        logger.warn('Failed to shutdown queue manager', error);
      }

      // Close database connection
      try {
        const db = container.resolve<Kysely<Database>>(TOKENS.Database);
        await db.destroy();
        logger.info('✓ Database connection closed');
      } catch (error) {
        logger.warn('Failed to close database connection', error);
      }

      // Disconnect Redis
      try {
        const redisClient = container.resolve<RedisClient>(TOKENS.RedisClient);
        await redisClient.disconnect();
        logger.info('✓ Redis disconnected');
      } catch (error) {
        logger.warn('Failed to disconnect Redis', error);
      }

      // Reset container
      container.reset();
      this.initialized = false;

      logger.info('✅ DI Container disposed successfully');
    } catch (error) {
      logger.error('Error during DI Container disposal', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't throw during disposal
    }
  }

  private static logInitializationSummary(): void {
    logger.info('DI Container Summary:', {
      modulesLoaded: this.modules.length,
      modules: this.modules.map((m) => m.getName()),
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Check if container is initialized
   */
  static isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get container instance (for testing)
   */
  static getContainer() {
    return container;
  }
}

// Export for backward compatibility
export { container };
