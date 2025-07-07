// src/domain/events/user/user-registered.event.ts

import { DomainEvent } from '../base.event';

export interface UserRegisteredPayload {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  registeredAt: Date;
}

export class UserRegisteredEvent extends DomainEvent<UserRegisteredPayload> {
  constructor(
    payload: UserRegisteredPayload,
    metadata?: { correlationId?: string; userId?: string },
  ) {
    super('user.registered', payload, metadata);
  }
}
