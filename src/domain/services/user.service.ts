// src/domain/services/user.service.ts
import { injectable, inject } from 'tsyringe';
import { TOKENS } from '../../core/di/tokens';
import type { IUserRepository } from '../interface/user.interface';
import type { CreateUserInput, UpdateUserInput, User } from '../entities';
import type { AsyncResult } from '../../shared/response';
import {
  ConflictError,
  NotFoundError,
  ResponseBuilder,
  InternalServerError,
  ok,
} from '../../shared/response';
import { isSuccessResponse } from '../../shared/response';
import { hashPassword, verifyPassword } from '../../shared/utils/crypto';
import { Cacheable, CacheInvalidate, CacheUpdate } from '../../infrastructure/cache/decorators';
import { getCacheService } from '../../infrastructure/cache/decorators/cache-helper';
import { EventBus } from '../../infrastructure/events/event-bus';
import { UserCreatedEvent, UserUpdatedEvent, UserDeletedEvent } from '../events/user';

@injectable()
export class UserService {
  constructor(
    @inject(TOKENS.UserRepository) private userRepo: IUserRepository,
    @inject(TOKENS.EventBus) private eventBus: EventBus,
  ) {}

  async createUser(input: CreateUserInput, correlationId?: string): AsyncResult<User> {
    // Check email uniqueness
    const existingEmail = await this.userRepo.existsByEmail(input.email, undefined, correlationId);
    if (isSuccessResponse(existingEmail) && existingEmail.body().data) {
      return new ConflictError('Email already exists', correlationId);
    }

    // Check username uniqueness if provided
    if (input.username) {
      const existingUsername = await this.userRepo.existsByUsername(
        input.username,
        undefined,
        correlationId,
      );
      if (isSuccessResponse(existingUsername) && existingUsername.body().data) {
        return new ConflictError('Username already exists', correlationId);
      }
    }

    const passwordHash = await hashPassword(input.password);

    const result = await this.userRepo.create(
      {
        ...input,
        passwordHash,
      },
      correlationId,
    );

    // Create password entry in user_passwords table
    if (isSuccessResponse(result)) {
      const user = result.body().data;
      if (user) {
        await this.userRepo.createUserPassword(user.id, passwordHash);

        // Invalidate user list cache
        await this.invalidateUserCaches();

        // Emit user created event with new fields
        await this.eventBus.emit(
          new UserCreatedEvent(
            {
              userId: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              username: user.username,
              displayName: user.displayName,
              type: user.type,
              status: user.status,
              organizationId: user.organizationId,
            },
            correlationId ? { correlationId, userId: user.id } : { userId: user.id },
          ),
        );
      }
    }

    return result;
  }

  @Cacheable({ ttl: 3600, tags: ['user'] }) // Cache for 1 hour
  async findUserById(id: string, correlationId?: string): AsyncResult<User | null> {
    return this.userRepo.findById(id, correlationId);
  }

  @Cacheable({ ttl: 3600, tags: ['user'] })
  async findUserByEmail(email: string, correlationId?: string): AsyncResult<User | null> {
    return this.userRepo.findByEmail(email, correlationId);
  }

  @Cacheable({ ttl: 3600, tags: ['user'] })
  async findUserByUsername(username: string, correlationId?: string): AsyncResult<User | null> {
    return this.userRepo.findByUsername(username, correlationId);
  }

  @Cacheable({ ttl: 300, tags: ['users', 'user-list'] }) // Cache for 5 minutes
  async findAllUsers(correlationId?: string): AsyncResult<User[]> {
    return this.userRepo.findAll(correlationId);
  }

  @Cacheable({ ttl: 300, tags: ['users', 'user-org'] })
  async findUsersByOrganization(
    organizationId: string,
    correlationId?: string,
  ): AsyncResult<User[]> {
    return this.userRepo.findByOrganization(organizationId, correlationId);
  }

  @Cacheable({ ttl: 600, tags: ['users'] })
  async findUsersByIds(ids: string[], correlationId?: string): AsyncResult<User[]> {
    return this.userRepo.findByIds(ids, correlationId);
  }

  @CacheInvalidate({
    patterns: (id: string) => [
      `UserService:findUserById:${id}`,
      `UserService:findUserByUsername:*`,
    ],
    tags: ['users', 'user-list', 'user-org'],
  })
  @CacheUpdate({
    key: (id: string) => `UserService:findUserById:${id}`,
    ttl: 3600,
  })
  async updateUser(
    id: string,
    updates: UpdateUserInput,
    correlationId?: string,
  ): AsyncResult<User> {
    const existingUser = await this.userRepo.findById(id, correlationId);

    if (!isSuccessResponse(existingUser)) {
      return existingUser;
    }

    const currentUser = existingUser.body().data;
    if (!currentUser) {
      return new NotFoundError('User not found', correlationId);
    }

    // Track all changes for the event
    const changes: any = {};
    const previousValues: any = {};

    const trackChange = (field: keyof UpdateUserInput, currentValue: any) => {
      if (updates[field] !== undefined && updates[field] !== currentValue) {
        changes[field] = updates[field];
        previousValues[field] = currentValue;
      }
    };

    // Track all field changes from UpdateUserInput
    trackChange('firstName', currentUser.firstName);
    trackChange('lastName', currentUser.lastName);
    trackChange('displayName', currentUser.displayName);
    trackChange('username', currentUser.username);
    trackChange('phone', currentUser.phone);
    trackChange('avatarUrl', currentUser.avatarUrl);
    trackChange('title', currentUser.title);
    trackChange('department', currentUser.department);
    trackChange('employeeId', currentUser.employeeId);
    trackChange('timezone', currentUser.timezone);
    trackChange('locale', currentUser.locale);
    trackChange('locationId', currentUser.locationId);
    trackChange('customFields', currentUser.customFields);
    trackChange('tags', currentUser.tags);

    // Handle username change with uniqueness check
    if (updates.username && updates.username !== currentUser.username) {
      const usernameExists = await this.userRepo.existsByUsername(
        updates.username,
        id,
        correlationId,
      );
      if (isSuccessResponse(usernameExists) && usernameExists.body().data) {
        return new ConflictError('Username already exists', correlationId);
      }
    }

    // Handle emergency contact as a nested object
    if (updates.emergencyContact !== undefined) {
      const currentEmergency = currentUser.emergencyContact || {};
      const updatedEmergency = updates.emergencyContact || {};

      if (JSON.stringify(currentEmergency) !== JSON.stringify(updatedEmergency)) {
        changes.emergencyContact = updates.emergencyContact;
        previousValues.emergencyContact = currentUser.emergencyContact;
      }
    }

    // No changes to update
    if (Object.keys(changes).length === 0) {
      return ResponseBuilder.ok(currentUser, correlationId);
    }

    // Remove undefined values
    const updateData: Partial<Omit<User, 'id' | 'createdAt'>> = {};
    Object.keys(updates).forEach((key) => {
      const value = updates[key as keyof typeof updates];
      if (value !== undefined) {
        updateData[key as keyof typeof updateData] = value as any;
      }
    });

    // Update the user
    const result = await this.userRepo.update(id, updateData, correlationId);

    if (!isSuccessResponse(result)) {
      return result;
    }

    const updatedUser = result.body().data;
    if (!updatedUser) {
      return new InternalServerError(correlationId, {
        message: 'Update succeeded but user not found',
      });
    }

    // Update last activity
    await this.userRepo.updateLastActivity(id, correlationId);

    // Emit update event
    await this.eventBus.emit(
      new UserUpdatedEvent(
        {
          userId: id,
          changes,
          previousValues,
        },
        correlationId ? { correlationId, userId: id } : { userId: id },
      ),
    );

    return ResponseBuilder.ok(updatedUser, correlationId);
  }

  @CacheInvalidate({
    patterns: (id: string) => [`UserService:findUserById:${id}`],
    tags: ['users', 'user-list', 'user-org'],
  })
  async deleteUser(id: string, correlationId?: string): AsyncResult<boolean> {
    const existingUser = await this.userRepo.findById(id, correlationId);

    if (!isSuccessResponse(existingUser)) {
      return existingUser;
    }

    const user = existingUser.body().data;
    if (!user) {
      return new NotFoundError('User not found', correlationId);
    }

    // Since the schema uses soft delete, we should soft delete by default
    const result = await this.userRepo.update(
      id,
      {
        deletedAt: new Date(),
        deletedBy: null, // Should be set to the ID of the user performing the delete
        status: 'inactive',
        deactivatedReason: 'User account deleted',
      },
      correlationId,
    );

    if (!isSuccessResponse(result)) {
      return new InternalServerError(correlationId, { message: 'Failed to delete user' });
    }

    // Emit delete event
    await this.eventBus.emit(
      new UserDeletedEvent(
        {
          userId: id,
          email: user.email,
          username: user.username,
          softDelete: true,
        },
        correlationId ? { correlationId, userId: id } : { userId: id },
      ),
    );

    return ok(true, correlationId);
  }

  async hardDeleteUser(id: string, correlationId?: string): AsyncResult<boolean> {
    const existingUser = await this.userRepo.findById(id, correlationId);

    if (!isSuccessResponse(existingUser)) {
      return existingUser;
    }

    const user = existingUser.body().data;
    if (!user) {
      return new NotFoundError('User not found', correlationId);
    }

    // Delete from user_passwords table first
    // Note: You might need to add a deleteUserPasswords method to the repository
    // await this.userRepo.deleteUserPasswords(id, correlationId);

    // Hard delete the user
    const result = await this.userRepo.delete(id, correlationId);

    if (isSuccessResponse(result) && result.body().data) {
      await this.eventBus.emit(
        new UserDeletedEvent(
          {
            userId: id,
            email: user.email,
            username: user.username,
            softDelete: false,
          },
          correlationId ? { correlationId, userId: id } : { userId: id },
        ),
      );
    }

    return result;
  }

  async verifyPassword(email: string, password: string, correlationId?: string): AsyncResult<User> {
    const userResult = await this.userRepo.findByEmail(email, correlationId);

    if (!isSuccessResponse(userResult)) {
      return userResult;
    }

    const user = userResult.body().data;
    if (!user) {
      return new NotFoundError('Invalid credentials', correlationId);
    }

    // Check if user is active
    if (user.status !== 'active') {
      return new NotFoundError('Account is not active', correlationId);
    }

    // Check if user is soft deleted
    if (user.deletedAt) {
      return new NotFoundError('Invalid credentials', correlationId);
    }

    // Get password from user_passwords table
    const passwordResult = await this.userRepo.getUserPassword(user.id, correlationId);

    if (!isSuccessResponse(passwordResult)) {
      return new NotFoundError('Invalid credentials', correlationId);
    }

    const userPassword = passwordResult.body().data;
    if (!userPassword) {
      return new NotFoundError('Invalid credentials', correlationId);
    }

    // Check if password has expired
    if (userPassword.expires_at && userPassword.expires_at < new Date()) {
      return new ConflictError('Password has expired', correlationId);
    }

    // Verify the password
    const isValid = await verifyPassword(password, userPassword.password_hash);

    if (!isValid) {
      // You might want to track failed login attempts here
      // await this.userRepo.incrementFailedLoginAttempts(user.id, correlationId);
      return new NotFoundError('Invalid credentials', correlationId);
    }

    // Check if password must be changed
    if (userPassword.must_change) {
      return new ConflictError('Password must be changed', correlationId, {
        mustChangePassword: true,
        userId: user.id,
      });
    }

    // Update login tracking
    await this.userRepo.incrementLoginCount(user.id, correlationId);
    await this.userRepo.updateLastActivity(user.id, correlationId);

    return ResponseBuilder.ok(user, correlationId);
  }

  // src/domain/services/user.service.ts

  // TODO: Password Management Functions
  // async changePassword(userId: string, currentPassword: string, newPassword: string, correlationId?: string): AsyncResult<boolean>
  // async forgotPassword(email: string, correlationId?: string): AsyncResult<boolean>
  // async resetPassword(token: string, newPassword: string, correlationId?: string): AsyncResult<boolean>
  // async forcePasswordChange(userId: string, correlationId?: string): AsyncResult<boolean>
  // async checkPasswordHistory(userId: string, passwordHash: string, correlationId?: string): AsyncResult<boolean>

  // TODO: User Preferences Functions
  // async updateUserPreferences(userId: string, preferences: UpdateUserPreferencesInput, correlationId?: string): AsyncResult<User>
  // async resetUserPreferences(userId: string, correlationId?: string): AsyncResult<User>

  // TODO: Admin Functions
  // async adminUpdateUser(id: string, updates: AdminUpdateUserInput, adminId: string, correlationId?: string): AsyncResult<User>
  // async adminChangeUserStatus(userId: string, status: UserStatus, reason?: string, adminId?: string, correlationId?: string): AsyncResult<User>
  // async adminResetUserPassword(userId: string, adminId: string, correlationId?: string): AsyncResult<string>
  // async adminUnlockUser(userId: string, adminId: string, correlationId?: string): AsyncResult<boolean>

  // TODO: Email/Phone Verification Functions
  // async sendEmailVerification(userId: string, correlationId?: string): AsyncResult<boolean>
  // async verifyEmail(userId: string, token: string, correlationId?: string): AsyncResult<boolean>
  // async sendPhoneVerification(userId: string, correlationId?: string): AsyncResult<boolean>
  // async verifyPhone(userId: string, code: string, correlationId?: string): AsyncResult<boolean>

  // TODO: Two-Factor Authentication Functions
  // async enableTwoFactor(userId: string, correlationId?: string): AsyncResult<{ secret: string; qrCode: string }>
  // async confirmTwoFactor(userId: string, token: string, correlationId?: string): AsyncResult<boolean>
  // async disableTwoFactor(userId: string, correlationId?: string): AsyncResult<boolean>
  // async verifyTwoFactor(userId: string, token: string, correlationId?: string): AsyncResult<boolean>

  // TODO: Session Management Functions
  // async createSession(userId: string, deviceInfo?: any, correlationId?: string): AsyncResult<Session>
  // async invalidateSession(sessionId: string, correlationId?: string): AsyncResult<boolean>
  // async invalidateAllUserSessions(userId: string, correlationId?: string): AsyncResult<boolean>
  // async getActiveSessions(userId: string, correlationId?: string): AsyncResult<Session[]>

  // TODO: Security Functions
  // async trackFailedLogin(email: string, ip?: string, correlationId?: string): AsyncResult<boolean>
  // async lockUserAccount(userId: string, reason: string, duration?: number, correlationId?: string): AsyncResult<boolean>
  // async unlockUserAccount(userId: string, correlationId?: string): AsyncResult<boolean>
  // async isUserLocked(userId: string, correlationId?: string): AsyncResult<boolean>

  // TODO: Bulk Operations
  // async bulkCreateUsers(users: CreateUserInput[], correlationId?: string): AsyncResult<BatchResult>
  // async bulkUpdateUserStatus(userIds: string[], status: UserStatus, correlationId?: string): AsyncResult<BatchResult>
  // async bulkDeleteUsers(userIds: string[], soft?: boolean, correlationId?: string): AsyncResult<BatchResult>

  // TODO: Search and Filter Functions
  // async searchUsers(query: string, filters?: UserFilters, pagination?: PaginationParams, correlationId?: string): AsyncResult<PaginatedResponse<User>>
  // async findUsersByRole(roleId: string, correlationId?: string): AsyncResult<User[]>
  // async findUsersByPermission(permission: string, correlationId?: string): AsyncResult<User[]>
  // async findInactiveUsers(days: number, correlationId?: string): AsyncResult<User[]>

  // TODO: Emergency Contact Functions
  // async updateEmergencyContact(userId: string, contact: User['emergencyContact'], correlationId?: string): AsyncResult<User>
  // async getEmergencyContacts(userIds: string[], correlationId?: string): AsyncResult<{ userId: string; contact: User['emergencyContact'] }[]>

  // TODO: User Activity Functions
  // async getUserActivity(userId: string, startDate?: Date, endDate?: Date, correlationId?: string): AsyncResult<UserActivity[]>
  // async getUserLoginHistory(userId: string, limit?: number, correlationId?: string): AsyncResult<LoginHistory[]>
  // async updateUserLocation(userId: string, locationId: string, correlationId?: string): AsyncResult<User>

  // TODO: Integration Functions
  // async linkAuthProvider(userId: string, provider: AuthProvider, providerData: any, correlationId?: string): AsyncResult<boolean>
  // async unlinkAuthProvider(userId: string, provider: AuthProvider, correlationId?: string): AsyncResult<boolean>
  // async getLinkedAuthProviders(userId: string, correlationId?: string): AsyncResult<UserAuthProviderDB[]>

  // TODO: Export/Import Functions
  // async exportUserData(userId: string, format: 'json' | 'csv', correlationId?: string): AsyncResult<Buffer>
  // async importUsers(data: Buffer, format: 'json' | 'csv', correlationId?: string): AsyncResult<BatchResult>

  // TODO: Compliance Functions
  // async anonymizeUser(userId: string, correlationId?: string): AsyncResult<boolean>
  // async getUserDataForGDPR(userId: string, correlationId?: string): AsyncResult<any>
  // async deleteUserDataForGDPR(userId: string, correlationId?: string): AsyncResult<boolean>

  private async invalidateUserCaches(): Promise<void> {
    const cacheService = getCacheService();
    await cacheService.invalidateByTags(['users', 'user-list']);
  }
}
