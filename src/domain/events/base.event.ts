// src/domain/events/base.event.ts
import { v4 as uuidv4 } from 'uuid';

/**
 * Base class for all domain events
 * This represents WHAT happened in your business domain
 * It contains no infrastructure concerns
 */
export abstract class DomainEvent<TPayload = any> {
  public readonly eventId: string;
  public readonly eventName: string;
  public readonly occurredAt: Date;
  public readonly payload: TPayload;
  public readonly metadata: {
    correlationId?: string;
    userId?: string;
    source?: string;
  };

  constructor(
    eventName: string,
    payload: TPayload,
    metadata?: {
      correlationId?: string;
      userId?: string;
      source?: string;
    },
  ) {
    this.eventId = uuidv4();
    this.eventName = eventName;
    this.occurredAt = new Date();
    this.payload = payload;
    this.metadata = metadata || {};
  }
}

// Interface for event handlers
export interface IEventHandler<T extends DomainEvent> {
  handle(event: T): void | Promise<void>;
}
