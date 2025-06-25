// src/infrastructure/queue/queue.manager.ts
import { injectable } from 'tsyringe';
import { EmailQueue } from './queues/email.queue';
import { NotificationQueue } from './queues/notification.queue';
import { QueueName } from './types';
import { logger } from '../../shared/utils/logger';

@injectable()
export class QueueManager {
  private queues: Map<string, any> = new Map();
  private initialized = false;

  /**
   * Initialize all queues and start workers
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('Queue manager already initialized');
      return;
    }

    try {
      // Initialize Email Queue
      const emailQueue = new EmailQueue();
      emailQueue.startWorker();
      this.queues.set(QueueName.EMAIL, emailQueue);

      // Initialize Notification Queue
      const notificationQueue = new NotificationQueue();
      notificationQueue.startWorker();
      this.queues.set(QueueName.NOTIFICATION, notificationQueue);

      this.initialized = true;
      logger.info('Queue manager initialized successfully', {
        queues: Array.from(this.queues.keys()),
      });
    } catch (error) {
      logger.error('Failed to initialize queue manager', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get a specific queue
   */
  getQueue<T = any>(queueName: QueueName): T {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }
    return queue;
  }

  /**
   * Get email queue
   */
  getEmailQueue(): EmailQueue {
    return this.getQueue<EmailQueue>(QueueName.EMAIL);
  }

  /**
   * Get notification queue
   */
  getNotificationQueue(): NotificationQueue {
    return this.getQueue<NotificationQueue>(QueueName.NOTIFICATION);
  }

  /**
   * Get metrics for all queues
   */
  async getAllMetrics() {
    const metrics = await Promise.all(
      Array.from(this.queues.entries()).map(async ([name, queue]) => ({
        name,
        ...(await queue.getMetrics()),
      })),
    );

    return {
      queues: metrics,
      summary: {
        totalWaiting: metrics.reduce((sum, m) => sum + m.counts.waiting, 0),
        totalActive: metrics.reduce((sum, m) => sum + m.counts.active, 0),
        totalCompleted: metrics.reduce((sum, m) => sum + m.counts.completed, 0),
        totalFailed: metrics.reduce((sum, m) => sum + m.counts.failed, 0),
      },
    };
  }

  /**
   * Pause all queues
   */
  async pauseAll(): Promise<void> {
    await Promise.all(Array.from(this.queues.values()).map((queue) => queue.pause()));
    logger.info('All queues paused');
  }

  /**
   * Resume all queues
   */
  async resumeAll(): Promise<void> {
    await Promise.all(Array.from(this.queues.values()).map((queue) => queue.resume()));
    logger.info('All queues resumed');
  }

  /**
   * Gracefully shutdown all queues
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down queue manager...');

    // Close all queues
    await Promise.all(Array.from(this.queues.values()).map((queue) => queue.close()));

    this.queues.clear();
    this.initialized = false;

    logger.info('Queue manager shut down successfully');
  }

  /**
   * Clean old jobs from all queues
   */
  async cleanAllQueues(gracePeriod: number = 24 * 60 * 60 * 1000): Promise<void> {
    const results = await Promise.all(
      Array.from(this.queues.entries()).map(async ([name, queue]) => {
        const cleaned = await queue.clean(gracePeriod);
        return { queue: name, cleaned: cleaned.length };
      }),
    );

    logger.info('Cleaned all queues', { results });
  }
}
