// src/infrastructure/events/handlers/user/audit-log.handler.ts
import { BaseEventHandler } from '../base.handler';
import { DomainEvent } from '../../../../domain/events/base.event';
import { logger } from '../../../../shared/utils/logger';

export class AuditLogHandler extends BaseEventHandler<DomainEvent> {
  constructor() {
    super('AuditLog');
  }

  protected async execute(event: DomainEvent): Promise<void> {
    // In a real application, this would:
    // 1. Write to an audit log database table
    // 2. Send to a centralized logging service
    // 3. Store in an immutable audit trail

    logger.info('AUDIT LOG', {
      eventId: event.eventId,
      eventName: event.eventName,
      occurredAt: event.occurredAt,
      userId: event.metadata.userId,
      correlationId: event.metadata.correlationId,
      payload: event.payload,
      source: event.metadata.source || 'system',
    });

    // Simulate async operation (in real app, this would be a database write)
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
