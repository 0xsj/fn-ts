// src/domain/entities/schemas/auth.schema.ts
import { z } from 'zod';
import { BaseEntitySchema, BaseEntityDBSchema } from './entity.schema';

// ============================================
// Reusable Password Schema
// ============================================
export const PasswordSchema = z
  .string()
  .min(8)
  .regex(/[A-Z]/, 'Must contain uppercase letter')
  .regex(/[a-z]/, 'Must contain lowercase letter')
  .regex(/[0-9]/, 'Must contain number');

// ============================================
// Auth Provider Schema
// ============================================
export const AuthProviderSchema = z.enum([
  'google',
  'github',
  'microsoft',
  'apple',
  'facebook',
  'saml',
  'oidc',
]);

export const AuthProviderDBSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  provider: AuthProviderSchema,
  provider_user_id: z.string(),

  // Provider-specific data
  provider_data: z
    .object({
      email: z.string().email().nullable(),
      name: z.string().nullable(),
      avatar_url: z.string().url().nullable(),
      raw_data: z.record(z.unknown()).nullable(),
    })
    .nullable(),

  // Tokens (encrypted)
  access_token: z.string().nullable(),
  refresh_token: z.string().nullable(),
  token_expires_at: z.date().nullable(),

  // Tracking
  linked_at: z.date(),
  last_used_at: z.date().nullable(),
  is_primary: z.boolean().default(false),
});

// ============================================
// Session Schema
// ============================================
export const SessionDBSchema = BaseEntityDBSchema.extend({
  user_id: z.string().uuid(),
  token_hash: z.string(), // Hashed session token
  refresh_token_hash: z.string().nullable(),

  // Device/Client info
  device_id: z.string().nullable(),
  device_name: z.string().nullable(),
  device_type: z.enum(['web', 'mobile', 'desktop', 'api']).default('web'),
  user_agent: z.string().nullable(),
  ip_address: z.string().nullable(),

  // Expiration
  expires_at: z.date(),
  refresh_expires_at: z.date().nullable(),
  idle_timeout_at: z.date().nullable(), // For idle session timeout

  // Activity tracking
  last_activity_at: z.date(),
  login_at: z.date(),

  // Status
  is_active: z.boolean().default(true),
  revoked_at: z.date().nullable(),
  revoked_by: z.string().uuid().nullable(),
  revoked_reason: z.string().nullable(),
});

export const SessionSchema = BaseEntitySchema.extend({
  userId: z.string().uuid(),
  tokenHash: z.string(),
  refreshTokenHash: z.string().nullable(),

  deviceId: z.string().nullable(),
  deviceName: z.string().nullable(),
  deviceType: z.enum(['web', 'mobile', 'desktop', 'api']).default('web'),
  userAgent: z.string().nullable(),
  ipAddress: z.string().nullable(),

  expiresAt: z.date(),
  refreshExpiresAt: z.date().nullable(),
  idleTimeoutAt: z.date().nullable(),

  lastActivityAt: z.date(),
  loginAt: z.date(),

  isActive: z.boolean().default(true),
  revokedAt: z.date().nullable(),
  revokedBy: z.string().uuid().nullable(),
  revokedReason: z.string().nullable(),
});

// ============================================
// JWT Token Schemas
// ============================================
export const AccessTokenPayloadSchema = z.object({
  // Standard JWT claims
  sub: z.string().uuid(), // userId
  iat: z.number(),
  exp: z.number(),
  iss: z.string().default('firenotifications'),
  aud: z.string().or(z.array(z.string())).default('firenotifications-api'),

  // Custom claims
  sessionId: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),

  // Permissions
  roles: z.array(z.string()),
  permissions: z.array(z.string()).optional(),

  // Multi-tenancy
  organizationId: z.string().uuid().nullable(),

  // Token metadata
  tokenType: z.literal('access'),
  deviceId: z.string().nullable(),
});

export const RefreshTokenPayloadSchema = z.object({
  sub: z.string().uuid(),
  iat: z.number(),
  exp: z.number(),

  sessionId: z.string().uuid(),
  tokenType: z.literal('refresh'),
  tokenFamily: z.string().uuid(), // For refresh token rotation
});

// ============================================
// Auth Request Schemas
// ============================================
export const LoginRequestSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8),

  // Device info (optional)
  deviceId: z.string().optional(),
  deviceName: z.string().optional(),
  deviceType: z.enum(['web', 'mobile', 'desktop']).optional(),

  // Remember me
  rememberMe: z.boolean().default(false),
});

export const OAuthLoginRequestSchema = z.object({
  provider: AuthProviderSchema,
  code: z.string(),
  state: z.string(),
  redirectUri: z.string().url(),
});

export const RefreshTokenRequestSchema = z.object({
  refreshToken: z.string(),
});

export const LogoutRequestSchema = z.object({
  refreshToken: z.string().optional(), // For token blacklisting
  logoutAll: z.boolean().default(false), // Logout from all devices
});

export const ChangePasswordRequestSchema = z
  .object({
    currentPassword: z.string(),
    newPassword: PasswordSchema,
    confirmPassword: z.string(),
    logoutOtherSessions: z.boolean().default(true),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const ForgotPasswordRequestSchema = z.object({
  email: z.string().email().toLowerCase(),
});

export const ResetPasswordRequestSchema = z
  .object({
    token: z.string(),
    newPassword: PasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const VerifyEmailRequestSchema = z.object({
  token: z.string(),
});

export const ResendVerificationRequestSchema = z.object({
  email: z.string().email().toLowerCase(),
});

// ============================================
// Auth Response Schemas
// ============================================
export const AuthTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  tokenType: z.string().default('Bearer'),
  expiresIn: z.number(), // seconds
  refreshExpiresIn: z.number(), // seconds
});

export const LoginResponseSchema = z.object({
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    firstName: z.string(),
    lastName: z.string(),
    displayName: z.string().nullable(),
    avatarUrl: z.string().url().nullable(),
    organizationId: z.string().uuid().nullable(),
  }),
  tokens: AuthTokensSchema,
  session: z.object({
    id: z.string().uuid(),
    deviceId: z.string().nullable(),
    deviceName: z.string().nullable(),
    loginAt: z.date(),
  }),
});

export const RefreshResponseSchema = z.object({
  tokens: AuthTokensSchema,
});

// ============================================
// Password Reset Token Schema
// ============================================
export const PasswordResetTokenDBSchema = BaseEntityDBSchema.extend({
  user_id: z.string().uuid(),
  token_hash: z.string(),
  expires_at: z.date(),
  used_at: z.date().nullable(),
  ip_address: z.string().nullable(),
  user_agent: z.string().nullable(),
});

export const PasswordResetTokenSchema = BaseEntitySchema.extend({
  userId: z.string().uuid(),
  tokenHash: z.string(),
  expiresAt: z.date(),
  usedAt: z.date().nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
});

// ============================================
// Email Verification Token Schema
// ============================================
export const EmailVerificationTokenDBSchema = BaseEntityDBSchema.extend({
  user_id: z.string().uuid(),
  email: z.string().email(),
  token_hash: z.string(),
  expires_at: z.date(),
  verified_at: z.date().nullable(),
});

export const EmailVerificationTokenSchema = BaseEntitySchema.extend({
  userId: z.string().uuid(),
  email: z.string().email(),
  tokenHash: z.string(),
  expiresAt: z.date(),
  verifiedAt: z.date().nullable(),
});

// ============================================
// API Key Schema (for service auth)
// ============================================
export const ApiKeyDBSchema = BaseEntityDBSchema.extend({
  name: z.string(),
  key_hash: z.string(),
  key_prefix: z.string(), // First 8 chars for identification

  // Ownership
  user_id: z.string().uuid().nullable(),
  organization_id: z.string().uuid().nullable(),

  // Permissions
  scopes: z.array(z.string()),
  allowed_ips: z.array(z.string()).nullable(), // IP whitelist
  allowed_origins: z.array(z.string()).nullable(), // CORS origins

  // Rate limiting
  rate_limit_per_hour: z.number().nullable(),

  // Expiration
  expires_at: z.date().nullable(),
  last_used_at: z.date().nullable(),
  last_used_ip: z.string().nullable(),
  usage_count: z.number().default(0),

  // Status
  is_active: z.boolean().default(true),
  revoked_at: z.date().nullable(),
  revoked_reason: z.string().nullable(),
});

export const ApiKeySchema = BaseEntitySchema.extend({
  name: z.string(),
  keyHash: z.string(),
  keyPrefix: z.string(),

  userId: z.string().uuid().nullable(),
  organizationId: z.string().uuid().nullable(),

  scopes: z.array(z.string()),
  allowedIps: z.array(z.string()).nullable(),
  allowedOrigins: z.array(z.string()).nullable(),

  rateLimitPerHour: z.number().nullable(),

  expiresAt: z.date().nullable(),
  lastUsedAt: z.date().nullable(),
  lastUsedIp: z.string().nullable(),
  usageCount: z.number().default(0),

  isActive: z.boolean().default(true),
  revokedAt: z.date().nullable(),
  revokedReason: z.string().nullable(),
});

// ============================================
// Two-Factor Auth Schemas
// ============================================
export const TwoFactorSecretDBSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  secret: z.string(), // Encrypted
  backup_codes: z.array(z.string()), // Encrypted
  enabled: z.boolean().default(false),
  enabled_at: z.date().nullable(),
  last_used_at: z.date().nullable(),
  created_at: z.date(),
  updated_at: z.date(),
});

export const EnableTwoFactorRequestSchema = z.object({
  password: z.string(), // Confirm password
  token: z.string(), // TOTP token
});

export const VerifyTwoFactorRequestSchema = z.object({
  userId: z.string().uuid(),
  token: z.string(), // TOTP token or backup code
});

// ============================================
// Type Exports
// ============================================
export type AuthProvider = z.infer<typeof AuthProviderSchema>;
export type AuthProviderDB = z.infer<typeof AuthProviderDBSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type SessionDB = z.infer<typeof SessionDBSchema>;
export type AccessTokenPayload = z.infer<typeof AccessTokenPayloadSchema>;
export type RefreshTokenPayload = z.infer<typeof RefreshTokenPayloadSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type OAuthLoginRequest = z.infer<typeof OAuthLoginRequestSchema>;
export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;
export type LogoutRequest = z.infer<typeof LogoutRequestSchema>;
export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequestSchema>;
export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequestSchema>;
export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>;
export type VerifyEmailRequest = z.infer<typeof VerifyEmailRequestSchema>;
export type AuthTokens = z.infer<typeof AuthTokensSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;
export type PasswordResetToken = z.infer<typeof PasswordResetTokenSchema>;
export type PasswordResetTokenDB = z.infer<typeof PasswordResetTokenDBSchema>;
export type EmailVerificationToken = z.infer<typeof EmailVerificationTokenSchema>;
export type EmailVerificationTokenDB = z.infer<typeof EmailVerificationTokenDBSchema>;
export type ApiKey = z.infer<typeof ApiKeySchema>;
export type ApiKeyDB = z.infer<typeof ApiKeyDBSchema>;
export type TwoFactorSecretDB = z.infer<typeof TwoFactorSecretDBSchema>;
export type EnableTwoFactorRequest = z.infer<typeof EnableTwoFactorRequestSchema>;
export type VerifyTwoFactorRequest = z.infer<typeof VerifyTwoFactorRequestSchema>;
