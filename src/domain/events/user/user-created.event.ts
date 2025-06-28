// src/domain/events/user/user-created.event.ts
import { DomainEvent } from '../base.event';

export interface UserCreatedPayload {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string | null;
  displayName: string | null;
  type: 'internal' | 'external' | 'system' | 'bot';
  status: 'active' | 'inactive' | 'suspended' | 'pending_verification';
  organizationId: string | null;
}

/**
 * Event fired when a new user is created
 * This is a business event - it represents something that happened
 */
export class UserCreatedEvent extends DomainEvent<UserCreatedPayload> {
  constructor(
    payload: UserCreatedPayload,
    metadata?: { correlationId?: string; userId?: string; source?: string },
  ) {
    super('user.created', payload, metadata);
  }
}
