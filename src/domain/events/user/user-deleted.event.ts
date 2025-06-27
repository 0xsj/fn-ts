// src/domain/events/user/user-deleted.event.ts
import { DomainEvent } from '../base.event';

export interface UserDeletedPayload {
  userId: string;
  email: string;
  username: string | null;
  softDelete?: boolean;
  reason?: string;
}
/**
 * Event fired when a user is deleted
 * Contains the user ID and email for cleanup purposes
 */
export class UserDeletedEvent extends DomainEvent<UserDeletedPayload> {
  constructor(
    payload: UserDeletedPayload,
    metadata?: { correlationId?: string; userId?: string; source?: string },
  ) {
    super('user.deleted', payload, metadata);
  }
}
