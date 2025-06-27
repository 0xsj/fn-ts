// src/domain/events/user/user-updated.event.ts
import { DomainEvent } from '../base.event';

export interface UserUpdatedPayload {
  userId: string;
  changes: Record<string, any>;
  previousValues: Record<string, any>;
}

/**
 * Event fired when a user is updated
 * Contains what changed and optionally the previous values
 */
export class UserUpdatedEvent extends DomainEvent<UserUpdatedPayload> {
  constructor(
    payload: UserUpdatedPayload,
    metadata?: { correlationId?: string; userId?: string; source?: string },
  ) {
    super('user.updated', payload, metadata);
  }
}
