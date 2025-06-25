// src/infrastructure/events/event-bus.ts
import { injectable } from 'tsyringe';
import { DomainEvent, IEventHandler } from '../../domain/events/base.event';
import { logger } from '../../shared/utils/logger';

/**
 * EventBus is the infrastructure component that delivers events
 * It's HOW events get from publishers to subscribers
 * This is a technical concern, not business logic
 */
@injectable()
export class EventBus {
  private handlers = new Map<string, Set<IEventHandler<any>>>();

  /**
   * Subscribe a handler to an event type
   */
  on<T extends DomainEvent>(eventName: string, handler: IEventHandler<T>): () => void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set());
    }

    this.handlers.get(eventName)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(eventName)?.delete(handler);
    };
  }

  /**
   * Emit an event to all registered handlers
   */
  async emit(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventName) || new Set();

    logger.info(`Emitting event: ${event.eventName}`, {
      eventId: event.eventId,
      handlerCount: handlers.size,
    });

    // Execute all handlers
    const promises = Array.from(handlers).map((handler) => this.executeHandler(handler, event));

    await Promise.allSettled(promises);
  }

  private async executeHandler(handler: IEventHandler<any>, event: DomainEvent): Promise<void> {
    try {
      await handler.handle(event);
    } catch (error) {
      logger.error('Event handler failed', {
        eventName: event.eventName,
        error,
      });
    }
  }
}
