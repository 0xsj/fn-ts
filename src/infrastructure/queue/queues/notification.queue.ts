// src/infrastructure/queue/queues/notification.queue.ts
import { Job } from 'bullmq';
import { BaseQueue } from './base.queue';
import { NotificationJobData, QueueName } from '../types';
import { logger } from '../../../shared/utils/logger';
import { EmailQueue } from './email.queue';

export class NotificationQueue extends BaseQueue {
  private emailQueue: EmailQueue;

  constructor() {
    super(QueueName.NOTIFICATION);
    this.emailQueue = new EmailQueue();
  }

  /**
   * Initialize the worker for processing notifications
   */
  startWorker(): void {
    this.createWorker(async (job: Job<NotificationJobData>) => {
      logger.info('Processing notification job', {
        jobId: job.id,
        type: job.data.type,
        userId: job.data.userId,
        correlationId: job.data.correlationId,
      });

      try {
        switch (job.data.type) {
          case 'email':
            await this.handleEmailNotification(job.data);
            break;
          
          case 'sms':
            await this.handleSMSNotification(job.data);
            break;
          
          case 'push':
            await this.handlePushNotification(job.data);
            break;
          
          case 'in-app':
            await this.handleInAppNotification(job.data);
            break;
          
          default:
            throw new Error(`Unknown notification type: ${job.data.type}`);
        }

        return {
          success: true,
          processedAt: new Date(),
        };
      } catch (error) {
        logger.error('Failed to process notification', {
          jobId: job.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      }
    });
  }

  /**
   * Add a notification job
   */
  async sendNotification(data: NotificationJobData): Promise<string> {
    const job = await this.addJob({
      name: `notification-${data.type}`,
      data,
      options: {
        priority: data.type === 'push' ? 1 : 2,
        attempts: 3,
      },
    });

    return job.id!;
  }

  private async handleEmailNotification(data: NotificationJobData): Promise<void> {
    // Get user email from userId (in real app, fetch from database)
    const userEmail = 'user@example.com'; // TODO: Fetch from database

    await this.emailQueue.sendEmailJob({
      to: userEmail,
      subject: data.title,
      template: 'notification',
      data: {
        title: data.title,
        message: data.message,
        ...data.data,
      },
      correlationId: data.correlationId,
    });
  }

  private async handleSMSNotification(data: NotificationJobData): Promise<void> {
    // TODO: Implement SMS sending (Twilio, etc.)
    logger.info('SMS notification would be sent', {
      userId: data.userId,
      message: data.message,
    });
  }

  private async handlePushNotification(data: NotificationJobData): Promise<void> {
    // TODO: Implement push notification (FCM, APNS, etc.)
    logger.info('Push notification would be sent', {
      userId: data.userId,
      title: data.title,
      message: data.message,
    });
  }

  private async handleInAppNotification(data: NotificationJobData): Promise<void> {
    // TODO: Store in database for in-app notifications
    logger.info('In-app notification would be stored', {
      userId: data.userId,
      title: data.title,
      message: data.message,
    });
  }

  protected getConcurrency(): number {
    return 20; // Process more notifications concurrently
  }
}