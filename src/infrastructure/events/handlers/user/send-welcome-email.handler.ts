// src/infrastructure/events/handlers/user/send-welcome-email.handler.ts
import { BaseEventHandler } from '../base.handler';
import { UserCreatedEvent } from '../../../../domain/events/user/user-created.event';
import { QueueManager } from '../../../queue/queue.manager';
import { DIContainer } from '../../../../core/di/container';
import { TOKENS } from '../../../../core/di/tokens';
import { logger } from '../../../../shared/utils/logger';

export class SendWelcomeEmailHandler extends BaseEventHandler<UserCreatedEvent> {
  private queueManager?: QueueManager;

  constructor() {
    super('SendWelcomeEmail');
    // Don't resolve here - wait until needed
  }

  private getQueueManager(): QueueManager {
    if (!this.queueManager) {
      this.queueManager = DIContainer.resolve<QueueManager>(TOKENS.QueueManager);
    }
    return this.queueManager;
  }

  protected async execute(event: UserCreatedEvent): Promise<void> {
    const { userId, email, firstName } = event.payload;

    try {
      // Get queue manager lazily
      const queueManager = this.getQueueManager();
      const emailQueue = queueManager.getEmailQueue();

      // Use sendEmailJob with the welcome email data
      const jobId = await emailQueue.sendEmailJob({
        to: {
          email: email,
          name: firstName,
        },
        subject: 'Welcome to FireNotifications!',
        template: 'welcome',
        data: {
          firstName: firstName,
          userId: userId,
          activationLink: `${process.env.APP_URL}/activate/${userId}`, // Adjust as needed
        },
        correlationId: event.metadata.correlationId,
      });

      logger.info('Welcome email queued', {
        userId,
        email,
        jobId,
        correlationId: event.metadata.correlationId,
      });
    } catch (error) {
      logger.error('Failed to queue welcome email', {
        userId,
        email,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}
