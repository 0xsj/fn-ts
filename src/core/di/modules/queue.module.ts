// src/core/di/modules/queue.module.ts
import { BaseModule } from './base.module';
import { DependencyContainer } from 'tsyringe';
import { QueueManager } from '../../../infrastructure/queue/queue.manager';
import { EmailProcessor } from '../../../infrastructure/queue/processors';
import { NotificationProcessor } from '../../../infrastructure/queue/processors';
import { AnalyticsProcessor } from '../../../infrastructure/queue/processors';
import { TOKENS } from '../tokens';

export class QueueModule extends BaseModule {
  constructor() {
    super('QueueModule');
  }

  async register(container: DependencyContainer): Promise<void> {
    try {
      this.log('Registering queue system...');

      // Check if Redis is available first
      try {
        const redisClient = container.resolve(TOKENS.RedisClient);
        this.log('Redis client resolved successfully');
      } catch (error) {
        this.logError('Redis client not available', error);
        throw new Error('QueueModule requires Redis to be initialized first');
      }

      // Register QueueManager as singleton
      container.registerSingleton(TOKENS.QueueManager, QueueManager);
      this.log('QueueManager registered');

      // Register processors as singletons
      container.registerSingleton(TOKENS.EmailProcessor, EmailProcessor);
      container.registerSingleton(TOKENS.NotificationProcessor, NotificationProcessor);
      container.registerSingleton(TOKENS.AnalyticsProcessor, AnalyticsProcessor);
      this.log('Queue processors registered');

      // Get the QueueManager instance and initialize it
      this.log('Resolving QueueManager instance...');
      const queueManager = container.resolve<QueueManager>(TOKENS.QueueManager);

      this.log('Initializing QueueManager...');
      await queueManager.initialize();

      this.log('Queue system initialized with all workers started');
    } catch (error) {
      this.logError('Failed to initialize queue system', error);

      // Log more details about the error
      if (error instanceof Error) {
        this.logError('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name,
        });
      }

      throw error;
    }
  }
}
