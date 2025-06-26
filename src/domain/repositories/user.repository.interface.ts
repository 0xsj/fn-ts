// src/domain/repositories/user.repository.interface.ts
import { AsyncResult } from '../../shared/response';
import { CreateUserInput, User, UserPasswordDB, UserStatus } from '../entities';

export interface IUserRepository {
  // Basic CRUD operations
  findById(id: string, correlationId?: string): AsyncResult<User | null>;
  findByEmail(email: string, correlationId?: string): AsyncResult<User | null>;
  findByUsername(username: string, correlationId?: string): AsyncResult<User | null>;
  findAll(correlationId?: string): AsyncResult<User[]>;

  create(
    input: CreateUserInput & { passwordHash: string },
    correlationId?: string,
  ): AsyncResult<User>;

  update(
    id: string,
    updates: Partial<Omit<User, 'id' | 'createdAt'>>,
    correlationId?: string,
  ): AsyncResult<User | null>;

  delete(id: string, correlationId?: string): AsyncResult<boolean>;

  // Password management (user_passwords table)
  createUserPassword(
    userId: string,
    passwordHash: string,
    correlationId?: string,
  ): AsyncResult<boolean>;

  getUserPassword(userId: string, correlationId?: string): AsyncResult<UserPasswordDB | null>;

  updateUserPassword(
    userId: string,
    passwordHash: string,
    mustChange?: boolean,
    correlationId?: string,
  ): AsyncResult<boolean>;

  // Activity tracking
  updateLastActivity(userId: string, correlationId?: string): AsyncResult<boolean>;
  incrementLoginCount(userId: string, correlationId?: string): AsyncResult<boolean>;

  // Bulk operations
  findByIds(ids: string[], correlationId?: string): AsyncResult<User[]>;
  findByOrganization(organizationId: string, correlationId?: string): AsyncResult<User[]>;

  // Status management
  updateStatus(userId: string, status: UserStatus, correlationId?: string): AsyncResult<boolean>;

  // Email/Phone verification
  markEmailVerified(
    userId: string,
    verifiedAt?: Date,
    correlationId?: string,
  ): AsyncResult<boolean>;
  markPhoneVerified(
    userId: string,
    verifiedAt?: Date,
    correlationId?: string,
  ): AsyncResult<boolean>;

  // Check existence
  existsByEmail(email: string, excludeId?: string, correlationId?: string): AsyncResult<boolean>;
  existsByUsername(
    username: string,
    excludeId?: string,
    correlationId?: string,
  ): AsyncResult<boolean>;
}
