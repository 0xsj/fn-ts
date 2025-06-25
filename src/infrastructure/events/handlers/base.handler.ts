// src/infrastructure/events/handlers/base.handler.ts
import { IEventHandler, DomainEvent } from '../../../domain/events/base.event';
import { logger } from '../../../shared/utils/logger';

export abstract class BaseEventHandler<T extends DomainEvent> implements IEventHandler<T> {
  protected readonly handlerName: string;

  constructor(handlerName: string) {
    this.handlerName = handlerName;
  }

  async handle(event: T): Promise<void> {
    const startTime = Date.now();

    logger.debug(`Handler ${this.handlerName} processing event`, {
      eventName: event.eventName,
      eventId: event.eventId,
    });

    try {
      await this.execute(event);

      const duration = Date.now() - startTime;
      logger.debug(`Handler ${this.handlerName} completed`, {
        eventName: event.eventName,
        eventId: event.eventId,
        duration,
      });
    } catch (error) {
      logger.error(`Handler ${this.handlerName} failed`, {
        eventName: event.eventName,
        eventId: event.eventId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  protected abstract execute(event: T): Promise<void>;
}
