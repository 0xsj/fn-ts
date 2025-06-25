// src/infrastructure/events/handlers/user/send-welcome-email.handler.ts
import { BaseEventHandler } from '../base.handler';
import { UserCreatedEvent } from '../../../../domain/events/user/user-created.event';
import { QueueManager } from '../../../queue/queue.manager';
import { DIContainer } from '../../../../core/di/container';
import { TOKENS } from '../../../../core/di/tokens';
import { logger } from '../../../../shared/utils/logger';

export class SendWelcomeEmailHandler extends BaseEventHandler<UserCreatedEvent> {
  private queueManager: QueueManager;

  constructor() {
    super('SendWelcomeEmail');
    this.queueManager = DIContainer.resolve<QueueManager>(TOKENS.QueueManager);
  }

  protected async execute(event: UserCreatedEvent): Promise<void> {
    const { userId, email, firstName } = event.payload;

    try {
      // Queue the email instead of sending directly
      const emailQueue = this.queueManager.getEmailQueue();
      const jobId = await emailQueue.sendWelcomeEmail(
        userId,
        email,
        firstName,
        event.metadata.correlationId,
      );

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
