// src/domain/repositories/user.repository.interface.ts
import { AsyncResult } from '../../shared/response';
import { CreateUserInput, User, UserPasswordDB, UserStatus } from '../entities';

export interface IUser {
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
    // correlationId?: string,
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

// // src/domain/repositories/user.repository.interface.ts
// import { AsyncResult } from '../../shared/response';
// import {
//   User,
//   UserStatus,
//   UserType,
//   CreateUserInput,
//   RegisterUserInput,
//   UpdateUserInput,
//   UpdateUserPreferencesInput,
//   AdminUpdateUserInput,
//   UserPasswordDB,
//   UserAuthProviderDB,
//   UserSecurityDB,
//   UserProfile,
//   UserPublic,
//   AuthProvider
// } from '../entities';

// export interface IUserRepository {
//   // ============================================
//   // USER OPERATIONS
//   // ============================================
//   createUser(input: CreateUserInput & { passwordHash: string }): AsyncResult<User>;
//   registerUser(input: RegisterUserInput & { passwordHash: string }): AsyncResult<User>;
//   findUserById(id: string): AsyncResult<User | null>;
//   findUserByEmail(email: string): AsyncResult<User | null>;
//   findUserByUsername(username: string): AsyncResult<User | null>;
//   updateUser(id: string, updates: UpdateUserInput): AsyncResult<User | null>;
//   adminUpdateUser(id: string, updates: AdminUpdateUserInput): AsyncResult<User | null>;
//   deleteUser(id: string, deletedBy: string): AsyncResult<boolean>;
//   deactivateUser(id: string, reason?: string): AsyncResult<boolean>;
//   reactivateUser(id: string): AsyncResult<boolean>;

//   // ============================================
//   // USER SEARCH & LISTING
//   // ============================================
//   searchUsers(filters: {
//     query?: string;
//     status?: UserStatus;
//     type?: UserType;
//     organizationId?: string;
//     department?: string;
//     tags?: string[];
//     includeDeleted?: boolean;
//     limit?: number;
//     offset?: number;
//   }): AsyncResult<{ users: User[]; total: number }>;
//   findUsersByIds(ids: string[]): AsyncResult<User[]>;
//   findUsersByOrganization(organizationId: string, includeInactive?: boolean): AsyncResult<User[]>;
//   findUsersByDepartment(organizationId: string, department: string): AsyncResult<User[]>;

//   // ============================================
//   // AUTHENTICATION & SECURITY
//   // ============================================
//   createUserPassword(userId: string, passwordHash: string, mustChange?: boolean): AsyncResult<boolean>;
//   getUserPassword(userId: string): AsyncResult<UserPasswordDB | null>;
//   updateUserPassword(userId: string, passwordHash: string, mustChange?: boolean): AsyncResult<boolean>;
//   addPasswordHistory(userId: string, passwordHash: string): AsyncResult<boolean>;
//   checkPasswordHistory(userId: string, passwordHash: string, depth?: number): AsyncResult<boolean>;

//   getUserSecurity(userId: string): AsyncResult<UserSecurityDB | null>;
//   updateFailedLoginAttempts(userId: string, increment: boolean): AsyncResult<number>;
//   lockUserAccount(userId: string, until: Date): AsyncResult<boolean>;
//   unlockUserAccount(userId: string): AsyncResult<boolean>;

//   // ============================================
//   // AUTH PROVIDERS
//   // ============================================
//   linkAuthProvider(userId: string, provider: AuthProvider, providerUserId: string, providerData?: Record<string, unknown>): AsyncResult<boolean>;
//   unlinkAuthProvider(userId: string, provider: AuthProvider): AsyncResult<boolean>;
//   findUserByAuthProvider(provider: AuthProvider, providerUserId: string): AsyncResult<User | null>;
//   getUserAuthProviders(userId: string): AsyncResult<UserAuthProviderDB[]>;
//   updateAuthProviderLastUsed(userId: string, provider: AuthProvider): AsyncResult<boolean>;

//   // ============================================
//   // TWO-FACTOR AUTHENTICATION
//   // ============================================
//   enableTwoFactor(userId: string, secretId: string): AsyncResult<boolean>;
//   disableTwoFactor(userId: string): AsyncResult<boolean>;
//   getTwoFactorStatus(userId: string): AsyncResult<{ enabled: boolean; secretId: string | null }>;

//   // ============================================
//   // VERIFICATION
//   // ============================================
//   markEmailVerified(userId: string, verifiedAt?: Date): AsyncResult<boolean>;
//   markPhoneVerified(userId: string, verifiedAt?: Date): AsyncResult<boolean>;
//   updateEmail(userId: string, newEmail: string, verified?: boolean): AsyncResult<boolean>;
//   updatePhone(userId: string, newPhone: string, verified?: boolean): AsyncResult<boolean>;

//   // ============================================
//   // USER PREFERENCES
//   // ============================================
//   updateUserPreferences(userId: string, preferences: UpdateUserPreferencesInput): AsyncResult<boolean>;
//   getUserPreferences(userId: string): AsyncResult<User['preferences']>;

//   // ============================================
//   // PERMISSIONS & ROLES
//   // ============================================
//   updateCachedPermissions(userId: string, permissions: string[]): AsyncResult<boolean>;
//   getCachedPermissions(userId: string): AsyncResult<string[]>;
//   getUserRoles(userId: string): AsyncResult<Array<{ id: string; name: string; slug: string }>>;

//   // ============================================
//   // ACTIVITY TRACKING
//   // ============================================
//   updateLastActivity(userId: string): AsyncResult<boolean>;
//   updateLastLogin(userId: string, ip?: string): AsyncResult<boolean>;
//   incrementLoginCount(userId: string): AsyncResult<boolean>;
//   getUserActivity(userId: string): AsyncResult<{
//     lastActivityAt: Date | null;
//     lastLoginAt: Date | null;
//     totalLoginCount: number;
//     activeSessions: number;
//   }>;

//   // ============================================
//   // PROFILE OPERATIONS
//   // ============================================
//   getUserProfile(userId: string): AsyncResult<UserProfile>;
//   getUserPublicProfile(userId: string): AsyncResult<UserPublic>;
//   updateAvatar(userId: string, avatarUrl: string | null): AsyncResult<boolean>;
//   updateEmergencyContact(userId: string, contact: User['emergencyContact']): AsyncResult<boolean>;

//   // ============================================
//   // CUSTOM FIELDS & TAGS
//   // ============================================
//   updateCustomFields(userId: string, fields: Record<string, unknown>): AsyncResult<boolean>;
//   updateTags(userId: string, tags: string[]): AsyncResult<boolean>;
//   findUsersByTag(tag: string, organizationId?: string): AsyncResult<User[]>;

//   // ============================================
//   // VALIDATION
//   // ============================================
//   existsByEmail(email: string, excludeId?: string): AsyncResult<boolean>;
//   existsByUsername(username: string, excludeId?: string): AsyncResult<boolean>;
//   existsByPhone(phone: string, excludeId?: string): AsyncResult<boolean>;
//   checkUniqueConstraints(input: { email?: string; username?: string; phone?: string }, excludeId?: string): AsyncResult<{
//     email?: boolean;
//     username?: boolean;
//     phone?: boolean;
//   }>;

//   // ============================================
//   // BULK OPERATIONS
//   // ============================================
//   bulkUpdateStatus(userIds: string[], status: UserStatus): AsyncResult<number>;
//   bulkUpdateOrganization(userIds: string[], organizationId: string | null): AsyncResult<number>;
//   bulkDeactivateUsers(userIds: string[], reason?: string): AsyncResult<number>;
//   importUsers(users: Array<CreateUserInput & { passwordHash?: string }>): AsyncResult<{
//     imported: number;
//     failed: number;
//     errors: Array<{ index: number; error: string }>;
//   }>;

//   // ============================================
//   // CLEANUP & MAINTENANCE
//   // ============================================
//   cleanupUnverifiedUsers(beforeDate: Date): AsyncResult<number>;
//   purgeDeletedUsers(beforeDate: Date): AsyncResult<number>;
//   anonymizeUser(userId: string): AsyncResult<boolean>;
//   exportUserData(userId: string): AsyncResult<Record<string, unknown>>;
// }
