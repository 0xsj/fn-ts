// src/domain/entities/schemas/auth.schema.ts
import { z } from 'zod';
import { BaseEntitySchema } from './entity.schema';
import { UserSchema } from './user.schema';

// ============================================
// Session Management
// ============================================
export const SessionSchema = BaseEntitySchema.extend({
  userId: z.string().uuid(),
  token: z.string(),
  refreshToken: z.string().optional(),
  
  // Session info
  deviceId: z.string().optional(),
  deviceName: z.string().optional(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
  
  // Expiration
  expiresAt: z.date(),
  refreshExpiresAt: z.date().optional(),
  
  // Activity
  lastActivityAt: z.date(),
  isActive: z.boolean().default(true),
  
  // Security
  revokedAt: z.date().nullable().optional(),
  revokedReason: z.string().optional(),
});

// ============================================
// JWT Token Payloads
// ============================================
export const AuthTokenPayloadSchema = z.object({
  sub: z.string().uuid(), // userId
  email: z.string().email(),
  sessionId: z.string().uuid(),
  
  // Optional claims
  roles: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
  tenantId: z.string().uuid().optional(),
  
  // Standard JWT claims
  iat: z.number(),
  exp: z.number(),
  iss: z.string().optional(),
  aud: z.string().or(z.array(z.string())).optional(),
});

export const RefreshTokenPayloadSchema = z.object({
  sub: z.string().uuid(),
  sessionId: z.string().uuid(),
  iat: z.number(),
  exp: z.number(),
});

// ============================================
// Auth Requests
// ============================================
export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  deviceId: z.string().optional(),
  deviceName: z.string().optional(),
});

export const RefreshTokenRequestSchema = z.object({
  refreshToken: z.string(),
});

export const LogoutRequestSchema = z.object({
  sessionId: z.string().uuid().optional(),
  allSessions: z.boolean().default(false),
});

export const ChangePasswordRequestSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8),
  logoutOtherSessions: z.boolean().default(true),
});

export const ForgotPasswordRequestSchema = z.object({
  email: z.string().email(),
});

export const ResetPasswordRequestSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8),
});

// ============================================
// Auth Responses
// ============================================
export const AuthResponseSchema = z.object({
  user: UserSchema.omit({ passwordHash: true }),
  tokens: z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresIn: z.number(),
    tokenType: z.string().default('Bearer'),
  }),
  session: z.object({
    id: z.string().uuid(),
    deviceId: z.string().optional(),
    createdAt: z.date(),
  }),
});

// ============================================
// Password Reset
// ============================================
export const PasswordResetTokenSchema = BaseEntitySchema.extend({
  userId: z.string().uuid(),
  token: z.string(),
  expiresAt: z.date(),
  usedAt: z.date().nullable().optional(),
  ipAddress: z.string().optional(),
});

// ============================================
// API Keys
// ============================================
export const ApiKeySchema = BaseEntitySchema.extend({
  name: z.string(),
  key: z.string(), // Hashed
  prefix: z.string(), // First few chars for identification
  
  // Ownership
  userId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  
  // Permissions
  scopes: z.array(z.string()),
  
  // Usage limits
  rateLimit: z.number().optional(),
  expiresAt: z.date().nullable().optional(),
  
  // Activity
  lastUsedAt: z.date().nullable().optional(),
  usageCount: z.number().default(0),
  
  // Security
  revokedAt: z.date().nullable().optional(),
  revokedReason: z.string().optional(),
});

// ============================================
// Type Exports
// ============================================
export type Session = z.infer<typeof SessionSchema>;
export type AuthTokenPayload = z.infer<typeof AuthTokenPayloadSchema>;
export type RefreshTokenPayload = z.infer<typeof RefreshTokenPayloadSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;
export type LogoutRequest = z.infer<typeof LogoutRequestSchema>;
export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequestSchema>;
export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequestSchema>;
export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type PasswordResetToken = z.infer<typeof PasswordResetTokenSchema>;
export type ApiKey = z.infer<typeof ApiKeySchema>;