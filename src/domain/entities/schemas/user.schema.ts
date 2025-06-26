// src/domain/entities/schemas/user.schema.ts
import { z } from 'zod';
import {
  BaseEntityDBSchema,
  BaseEntitySchema,
  SoftDeletableDBSchema,
  SoftDeletableSchema,
} from './entity.schema';
import { PasswordSchema, AuthProviderSchema } from './auth.schema';

// ============================================
// User Status and Type Enums
// ============================================
export const UserStatusSchema = z.enum(['active', 'inactive', 'suspended', 'pending_verification']);
export const UserTypeSchema = z.enum(['internal', 'external', 'system', 'bot']);

// ============================================
// User Schema (extends SoftDeletable for user deactivation)
// ============================================
export const UserDBSchema = SoftDeletableDBSchema.extend({
  // Basic info
  first_name: z.string(),
  last_name: z.string(),
  display_name: z.string().nullable(),
  username: z.string().nullable(),

  // Contact
  email: z.string().email(),
  email_verified: z.boolean().default(false),
  email_verified_at: z.date().nullable(),

  phone: z.string().nullable(),
  phone_verified: z.boolean().default(false),
  phone_verified_at: z.date().nullable(),

  // NO PASSWORD HERE - stored in separate auth tables

  // Status
  status: UserStatusSchema.default('pending_verification'),
  type: UserTypeSchema.default('internal'),

  // Organization (for multi-tenancy)
  organization_id: z.string().uuid().nullable(),

  // Profile
  avatar_url: z.string().url().nullable(),
  title: z.string().nullable(),
  department: z.string().nullable(),
  employee_id: z.string().nullable(),

  // Location
  timezone: z.string().default('UTC'),
  locale: z.string().default('en'),
  location_id: z.string().uuid().nullable(),

  // Emergency contact
  emergency_contact: z
    .object({
      name: z.string().nullable(),
      relationship: z.string().nullable(),
      phone: z.string().nullable(),
      email: z.string().email().nullable(),
    })
    .nullable(),

  // Preferences
  preferences: z
    .object({
      theme: z.enum(['light', 'dark', 'system']).default('system'),
      language: z.string().default('en'),
      date_format: z.string().default('YYYY-MM-DD'),
      time_format: z.enum(['12h', '24h']).default('24h'),

      // Privacy
      profile_visibility: z.enum(['public', 'organization', 'private']).default('organization'),
      show_online_status: z.boolean().default(true),
    })
    .default({
      theme: 'system',
      language: 'en',
      date_format: 'YYYY-MM-DD',
      time_format: '24h',
      profile_visibility: 'organization',
      show_online_status: true,
    }),

  // Permissions (cached from roles)
  cached_permissions: z.array(z.string()).default([]),
  permissions_updated_at: z.date().nullable(),

  // Activity tracking
  last_activity_at: z.date().nullable(),
  total_login_count: z.number().int().default(0),

  // Metadata
  custom_fields: z.record(z.unknown()).default({}),
  tags: z.array(z.string()).default([]),

  // Deactivation (uses soft delete fields)
  deactivated_reason: z.string().nullable(),
});

export const UserSchema = SoftDeletableSchema.extend({
  firstName: z.string(),
  lastName: z.string(),
  displayName: z.string().nullable(),
  username: z.string().nullable(),

  email: z.string().email(),
  emailVerified: z.boolean().default(false),
  emailVerifiedAt: z.date().nullable(),

  phone: z.string().nullable(),
  phoneVerified: z.boolean().default(false),
  phoneVerifiedAt: z.date().nullable(),

  status: UserStatusSchema.default('pending_verification'),
  type: UserTypeSchema.default('internal'),

  organizationId: z.string().uuid().nullable(),

  avatarUrl: z.string().url().nullable(),
  title: z.string().nullable(),
  department: z.string().nullable(),
  employeeId: z.string().nullable(),

  timezone: z.string().default('UTC'),
  locale: z.string().default('en'),
  locationId: z.string().uuid().nullable(),

  emergencyContact: z
    .object({
      name: z.string().nullable(),
      relationship: z.string().nullable(),
      phone: z.string().nullable(),
      email: z.string().email().nullable(),
    })
    .nullable(),

  preferences: z
    .object({
      theme: z.enum(['light', 'dark', 'system']).default('system'),
      language: z.string().default('en'),
      dateFormat: z.string().default('YYYY-MM-DD'),
      timeFormat: z.enum(['12h', '24h']).default('24h'),
      profileVisibility: z.enum(['public', 'organization', 'private']).default('organization'),
      showOnlineStatus: z.boolean().default(true),
    })
    .default({
      theme: 'system',
      language: 'en',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '24h',
      profileVisibility: 'organization',
      showOnlineStatus: true,
    }),

  cachedPermissions: z.array(z.string()).default([]),
  permissionsUpdatedAt: z.date().nullable(),

  lastActivityAt: z.date().nullable(),
  totalLoginCount: z.number().int().default(0),

  customFields: z.record(z.unknown()).default({}),
  tags: z.array(z.string()).default([]),

  deactivatedReason: z.string().nullable(),
});

// ============================================
// Separate Auth-related tables that link to User
// ============================================

// user_passwords table
export const UserPasswordDBSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  password_hash: z.string(),
  created_at: z.date(),
  expires_at: z.date().nullable(),
  must_change: z.boolean().default(false),
});

// user_auth_providers table
export const UserAuthProviderDBSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  provider: AuthProviderSchema,
  provider_user_id: z.string(),
  provider_data: z.record(z.unknown()).nullable(),
  linked_at: z.date(),
  last_used_at: z.date().nullable(),
});

// user_security table
export const UserSecurityDBSchema = z.object({
  user_id: z.string().uuid(),

  // Login tracking
  failed_login_attempts: z.number().int().default(0),
  locked_until: z.date().nullable(),
  last_login_at: z.date().nullable(),
  last_login_ip: z.string().nullable(),

  // 2FA
  two_factor_enabled: z.boolean().default(false),
  two_factor_secret_id: z.string().uuid().nullable(), // References two_factor_secrets table

  // Password
  last_password_change_at: z.date().nullable(),
  password_history: z.array(z.string()).default([]), // Last N password hashes

  // Security questions
  security_questions: z
    .array(
      z.object({
        question: z.string(),
        answer_hash: z.string(),
      }),
    )
    .default([]),

  created_at: z.date(),
  updated_at: z.date(),
});

// ============================================
// User Input Schemas
// ============================================
export const CreateUserSchema = z.object({
  // User fields
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email().toLowerCase(),
  phone: z.string().min(10).optional(),

  // Password - use the shared PasswordSchema
  password: PasswordSchema,

  // Optional fields
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
  displayName: z.string().max(100).optional(),
  title: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  employeeId: z.string().max(50).optional(),

  // Organization
  organizationId: z.string().uuid().optional(),

  // Type
  type: UserTypeSchema.optional(),

  // Auto-activation (for admin creation)
  autoActivate: z.boolean().default(false),
  sendWelcomeEmail: z.boolean().default(true),
});

// For user registration
export const RegisterUserSchema = CreateUserSchema.extend({
  confirmPassword: z.string(),
  acceptTerms: z.boolean(),
  captchaToken: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export const UpdateUserSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  displayName: z.string().max(100).nullable().optional(),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),

  phone: z.string().min(10).nullable().optional(),

  // Profile
  avatarUrl: z.string().url().nullable().optional(),
  title: z.string().max(100).nullable().optional(),
  department: z.string().max(100).nullable().optional(),
  employeeId: z.string().max(50).nullable().optional(),

  // Location
  timezone: z.string().optional(),
  locale: z.string().optional(),
  locationId: z.string().uuid().nullable().optional(),

  // Emergency contact
  emergencyContact: z
    .object({
      name: z.string().nullable().optional(),
      relationship: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      email: z.string().email().nullable().optional(),
    })
    .optional(),

  // Custom fields
  customFields: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
});

export const UpdateUserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  language: z.string().optional(),
  dateFormat: z.string().optional(),
  timeFormat: z.enum(['12h', '24h']).optional(),
  profileVisibility: z.enum(['public', 'organization', 'private']).optional(),
  showOnlineStatus: z.boolean().optional(),
});

export const AdminUpdateUserSchema = UpdateUserSchema.extend({
  email: z.string().email().toLowerCase().optional(),
  status: UserStatusSchema.optional(),
  type: UserTypeSchema.optional(),
  organizationId: z.string().uuid().nullable().optional(),

  // Force actions
  mustChangePassword: z.boolean().optional(),
  emailVerified: z.boolean().optional(),
  phoneVerified: z.boolean().optional(),

  // Deactivation
  deactivated: z.boolean().optional(),
  deactivatedReason: z.string().optional(),
});

// ============================================
// User Response Schemas (for API responses)
// ============================================
export const UserPublicSchema = UserSchema.omit({
  // Remove all sensitive/internal fields
  cachedPermissions: true,
  permissionsUpdatedAt: true,
  totalLoginCount: true,
  deactivatedReason: true,
  deletedAt: true,
  deletedBy: true,
});

export const UserProfileSchema = UserPublicSchema.extend({
  // Add computed fields from joins
  roles: z
    .array(
      z.object({
        id: z.string().uuid(),
        name: z.string(),
        slug: z.string(),
      }),
    )
    .optional(),

  permissions: z.array(z.string()).optional(),

  organization: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      slug: z.string(),
      role: z.string(), // User's role in org
    })
    .optional(),

  // Auth info (from joined tables)
  hasPassword: z.boolean(),
  twoFactorEnabled: z.boolean(),
  authProviders: z.array(
    z.object({
      provider: AuthProviderSchema,
      linkedAt: z.date(),
    }),
  ),

  // Activity info
  lastLoginAt: z.date().nullable(),
  activeSessions: z.number(),
});

// ============================================
// Type Exports
// ============================================
export type UserStatus = z.infer<typeof UserStatusSchema>;
export type UserType = z.infer<typeof UserTypeSchema>;
export type UserDB = z.infer<typeof UserDBSchema>;
export type User = z.infer<typeof UserSchema>;
export type UserPassword = z.infer<typeof UserPasswordDBSchema>;
export type UserAuthProvider = z.infer<typeof UserAuthProviderDBSchema>;
export type UserSecurity = z.infer<typeof UserSecurityDBSchema>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type RegisterUserInput = z.infer<typeof RegisterUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type UpdateUserPreferencesInput = z.infer<typeof UpdateUserPreferencesSchema>;
export type AdminUpdateUserInput = z.infer<typeof AdminUpdateUserSchema>;
export type UserPublic = z.infer<typeof UserPublicSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
