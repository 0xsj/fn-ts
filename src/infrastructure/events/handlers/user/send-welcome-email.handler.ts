// src/infrastructure/events/handlers/user/send-welcome-email.handler.ts
import { BaseEventHandler } from '../base.handler';
import { UserCreatedEvent } from '../../../../domain/events/user/user-created.event';
import { logger } from '../../../../shared/utils/logger';

export class SendWelcomeEmailHandler extends BaseEventHandler<UserCreatedEvent> {
  constructor() {
    super('SendWelcomeEmail');
  }

  protected async execute(event: UserCreatedEvent): Promise<void> {
    const { userId, email, firstName } = event.payload;

    // TODO: In real app, this would queue an email job
    logger.info('Sending welcome email', {
      userId,
      email,
      template: `Welcome ${firstName}`,
    });

    // Simulate email sending
    await new Promise((resolve) => setTimeout(resolve, 100));

    logger.info('Welcome email sent successfully', {
      userId,
      email,
    });
  }
}
