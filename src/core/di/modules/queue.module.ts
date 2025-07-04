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

      // Register QueueManager as singleton
      container.registerSingleton(TOKENS.QueueManager, QueueManager);

      // Register processors as singletons
      container.registerSingleton(TOKENS.EmailProcessor, EmailProcessor);
      container.registerSingleton(TOKENS.NotificationProcessor, NotificationProcessor);
      container.registerSingleton(TOKENS.AnalyticsProcessor, AnalyticsProcessor);

      // Get the QueueManager instance and initialize it
      const queueManager = container.resolve<QueueManager>(TOKENS.QueueManager);
      await queueManager.initialize();

      this.log('Queue system initialized with all workers started');
    } catch (error) {
      this.logError('Failed to initialize queue system', error);
      throw error;
    }
  }
}
