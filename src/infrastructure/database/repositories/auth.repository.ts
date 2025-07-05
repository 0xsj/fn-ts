import { Kysely, sql } from 'kysely';
import { IAuth, ISession, IToken } from '../../../domain/interface/auth.interface';
import { Database } from '../types';
import {
  LoginRequest,
  LoginResponse,
  AuthProvider,
  RefreshTokenRequest,
  AuthTokens,
  User,
  Session,
  ApiKey,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
  UserAuthProviderDB,
  EmailVerificationToken,
  PasswordResetToken,
  TwoFactorSecretDB,
} from '../../../domain/entities';
import {
  AsyncResult,
  DatabaseError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  ok,
  ResponseBuilder,
  UnauthorizedError,
  ValidationError,
} from '../../../shared/response';
import { v4 as uuidv4 } from 'uuid';

const logRevocation = (method: string, sessionId: string, reason: string) => {};

export class AuthRepository implements ISession, IToken, IAuth {
  constructor(private db: Kysely<Database>) {}
  async createSession(
    userId: string,
    tokenHash: string,
    refreshTokenHash: string,
    deviceInfo?: {
      deviceId?: string;
      deviceName?: string;
      deviceType?: 'web' | 'mobile' | 'desktop' | 'api';
      userAgent?: string;
      ipAddress?: string;
    },
    expiresIn?: number,
  ): AsyncResult<Session> {
    try {
      const sessionId = uuidv4();
      const now = new Date();

      // Default expiration times if not provided
      const tokenExpiresIn = expiresIn || 3600; // 1 hour default
      const refreshExpiresIn = 86400; // 24 hours for refresh token

      const expiresAt = new Date(now.getTime() + tokenExpiresIn * 1000);
      const refreshExpiresAt = new Date(now.getTime() + refreshExpiresIn * 1000);

      // Calculate timeout values
      const idleTimeoutAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes idle timeout
      const absoluteTimeoutAt = new Date(now.getTime() + 8 * 60 * 60 * 1000); // 8 hours absolute timeout

      await this.db
        .insertInto('sessions')
        .values({
          id: sessionId,
          user_id: userId,
          token_hash: tokenHash,
          refresh_token_hash: refreshTokenHash,

          // Device info
          device_id: deviceInfo?.deviceId || null,
          device_name: deviceInfo?.deviceName || null,
          device_type: deviceInfo?.deviceType || 'web',
          user_agent: deviceInfo?.userAgent || null,
          ip_address: deviceInfo?.ipAddress || null,

          // Expiration
          expires_at: expiresAt,
          refresh_expires_at: refreshExpiresAt,
          idle_timeout_at: idleTimeoutAt,
          absolute_timeout_at: absoluteTimeoutAt,

          // Activity
          last_activity_at: now,

          // Security
          is_mfa_verified: false,
          security_stamp: null,

          // Not revoked
          revoked_at: null,
          revoked_by: null,
          revoke_reason: null,

          created_at: now,
          updated_at: now,
        })
        .execute();

      // Return the created session
      const session: Session = {
        id: sessionId,
        userId,
        tokenHash,
        refreshTokenHash,

        deviceId: deviceInfo?.deviceId || null,
        deviceName: deviceInfo?.deviceName || null,
        deviceType: deviceInfo?.deviceType || 'web',
        userAgent: deviceInfo?.userAgent || null,
        ipAddress: deviceInfo?.ipAddress || null,

        expiresAt,
        refreshExpiresAt,
        idleTimeoutAt,
        absoluteTimeoutAt,

        lastActivityAt: now,

        isMfaVerified: false,
        securityStamp: null,

        isActive: true,

        revokedAt: null,
        revokedBy: null,
        revokeReason: null,

        createdAt: now,
        updatedAt: now,
      };

      return ResponseBuilder.ok(session);
    } catch (error) {
      return new DatabaseError('createSession', error);
    }
  }
  async findSessionById(id: string): AsyncResult<Session | null> {
    try {
      const row = await this.db
        .selectFrom('sessions')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();

      return ResponseBuilder.ok(row ? this.mapToSession(row) : null);
    } catch (error) {
      return new DatabaseError('findSessionById', error);
    }
  }

  async findSessionByTokenHash(tokenHash: string): AsyncResult<Session | null> {
    try {
      const row = await this.db
        .selectFrom('sessions')
        .selectAll()
        .where('token_hash', '=', tokenHash)
        .executeTakeFirst();

      return ResponseBuilder.ok(row ? this.mapToSession(row) : null);
    } catch (error) {
      return new DatabaseError('findSessionByTokenHash', error);
    }
  }

  async findSessionByRefreshTokenHash(refreshTokenHash: string): AsyncResult<Session | null> {
    try {
      const row = await this.db
        .selectFrom('sessions')
        .selectAll()
        .where('refresh_token_hash', '=', refreshTokenHash)
        .executeTakeFirst();

      return ResponseBuilder.ok(row ? this.mapToSession(row) : null);
    } catch (error) {
      return new DatabaseError('findSessionByRefreshTokenHash', error);
    }
  }

  async findActiveSessionsByUserId(userId: string): AsyncResult<Session[]> {
    try {
      const rows = await this.db
        .selectFrom('sessions')
        .selectAll()
        .where('user_id', '=', userId)
        .where('revoked_at', 'is', null)
        .where('expires_at', '>', new Date())
        .execute();

      return ResponseBuilder.ok(rows.map((row) => this.mapToSession(row)));
    } catch (error) {
      return new DatabaseError('findActiveSessionsByUserId', error);
    }
  }

  async findActiveSessionsByDeviceId(
    userId: string,
    deviceId: string,
  ): AsyncResult<Session | null> {
    try {
      const row = await this.db
        .selectFrom('sessions')
        .selectAll()
        .where('user_id', '=', userId)
        .where('device_id', '=', deviceId)
        .where('revoked_at', 'is', null)
        .where('expires_at', '>', new Date())
        .orderBy('created_at', 'desc')
        .executeTakeFirst();

      return ResponseBuilder.ok(row ? this.mapToSession(row) : null);
    } catch (error) {
      return new DatabaseError('findActiveSessionsByDeviceId', error);
    }
  }

  async updateSession(
    id: string,
    updates: {
      lastActivityAt?: Date;
      refreshTokenHash?: string;
      refreshExpiresAt?: Date;
    },
  ): AsyncResult<Session | null> {
    try {
      // Build update object with only the fields that need updating
      const dbUpdates: any = {
        updated_at: new Date(),
      };

      if (updates.lastActivityAt !== undefined) {
        dbUpdates.last_activity_at = updates.lastActivityAt;
      }

      if (updates.refreshTokenHash !== undefined) {
        dbUpdates.refresh_token_hash = updates.refreshTokenHash;
      }

      if (updates.refreshExpiresAt !== undefined) {
        dbUpdates.refresh_expires_at = updates.refreshExpiresAt;
      }

      // Perform the update
      const result = await this.db
        .updateTable('sessions')
        .set(dbUpdates)
        .where('id', '=', id)
        .execute();

      // If no rows were updated, session doesn't exist
      if (result.length === 0) {
        return ResponseBuilder.ok(null);
      }

      // Fetch and return the updated session
      const row = await this.db
        .selectFrom('sessions')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();

      return ResponseBuilder.ok(row ? this.mapToSession(row) : null);
    } catch (error) {
      return new DatabaseError('updateSession', error);
    }
  }

  async extendSession(id: string, extendBy: number): AsyncResult<boolean> {
    try {
      // Get current session to calculate new expiration
      const currentSession = await this.db
        .selectFrom('sessions')
        .select(['expires_at', 'refresh_expires_at', 'revoked_at'])
        .where('id', '=', id)
        .executeTakeFirst();

      if (!currentSession || currentSession.revoked_at) {
        return ResponseBuilder.ok(false);
      }

      const now = new Date();
      const currentExpiry = currentSession.expires_at;

      // Calculate new expiration times
      const newExpiresAt = new Date(
        Math.max(currentExpiry.getTime(), now.getTime()) + extendBy * 1000,
      );

      // Also extend refresh token if it exists
      const newRefreshExpiresAt = currentSession.refresh_expires_at
        ? new Date(newExpiresAt.getTime() + 86400000) // 24 hours after token expiry
        : null;

      const result = await this.db
        .updateTable('sessions')
        .set({
          expires_at: newExpiresAt,
          refresh_expires_at: newRefreshExpiresAt,
          updated_at: new Date(),
        })
        .where('id', '=', id)
        .where('revoked_at', 'is', null)
        .execute();

      return ResponseBuilder.ok(result.length > 0);
    } catch (error) {
      return new DatabaseError('extendSession', error);
    }
  }

  async revokeSession(id: string, revokedBy?: string, reason?: string): AsyncResult<boolean> {
    try {
      const now = new Date();

      // First check if the session exists and is not already revoked
      const existingSession = await this.db
        .selectFrom('sessions')
        .select(['id', 'revoked_at'])
        .where('id', '=', id)
        .where('revoked_at', 'is', null)
        .executeTakeFirst();

      if (!existingSession) {
        return ResponseBuilder.ok(false);
      }

      const result = await this.db
        .updateTable('sessions')
        .set({
          revoked_at: now,
          revoked_by: revokedBy || null,
          revoke_reason: reason || null,
          updated_at: now,
        })
        .where('id', '=', id)
        .execute();
      return ResponseBuilder.ok(true);
    } catch (error) {
      return new DatabaseError('revokeSession', error);
    }
  }

  async revokeAllUserSessions(userId: string, exceptSessionId?: string): AsyncResult<number> {
    try {
      const now = new Date();

      let query = this.db
        .updateTable('sessions')
        .set({
          revoked_at: now,
          revoked_by: userId, // User revoked their own sessions
          revoke_reason: 'Bulk revocation',
          updated_at: now,
        })
        .where('user_id', '=', userId)
        .where('revoked_at', 'is', null); // Only revoke active sessions

      // Exclude specific session if provided (e.g., current session)
      if (exceptSessionId) {
        query = query.where('id', '!=', exceptSessionId);
      }

      const result = await query.execute();

      // Get the number of sessions that were revoked
      // Convert BigInt to number
      const numRevoked = (result as any)[0]?.numUpdatedRows ?? 0n;
      return ResponseBuilder.ok(Number(numRevoked));
    } catch (error) {
      return new DatabaseError('revokeAllUserSessions', error);
    }
  }

  async revokeExpiredSessions(): AsyncResult<number> {
    try {
      const now = new Date();

      const result = await this.db
        .updateTable('sessions')
        .set({
          revoked_at: now,
          revoked_by: 'system',
          revoke_reason: 'Session expired',
          updated_at: now,
        })
        .where('expires_at', '<', now)
        .where('revoked_at', 'is', null) // Only revoke sessions that aren't already revoked
        .execute();

      // Get the number of sessions that were revoked
      // Convert BigInt to number
      const numRevoked = (result as any)[0]?.numUpdatedRows ?? 0n;
      return ResponseBuilder.ok(Number(numRevoked));
    } catch (error) {
      return new DatabaseError('revokeExpiredSessions', error);
    }
  }
  async updateLastActivity(id: string): AsyncResult<boolean> {
    try {
      const now = new Date();

      // First check if session exists and is not revoked
      const session = await this.db
        .selectFrom('sessions')
        .select(['id', 'revoked_at'])
        .where('id', '=', id)
        .where('revoked_at', 'is', null)
        .executeTakeFirst();

      if (!session) {
        return ResponseBuilder.ok(false);
      }

      const result = await this.db
        .updateTable('sessions')
        .set({
          last_activity_at: now,
          updated_at: now,
        })
        .where('id', '=', id)
        .execute();

      return ResponseBuilder.ok(true);
    } catch (error) {
      return new DatabaseError('updateLastActivity', error);
    }
  }

  async deleteInactiveSessions(beforeDate: Date): AsyncResult<number> {
    try {
      // Delete sessions that haven't been active since the specified date
      // and are expired (to avoid deleting valid but unused sessions)
      const result = await this.db
        .deleteFrom('sessions')
        .where('last_activity_at', '<', beforeDate)
        .where('expires_at', '<', new Date()) // Also must be expired
        .execute();

      // Convert BigInt to number
      const numDeleted = (result as any)[0]?.numDeletedRows ?? 0n;
      return ResponseBuilder.ok(Number(numDeleted));
    } catch (error) {
      return new DatabaseError('deleteInactiveSessions', error);
    }
  }

  async deleteRevokedSessions(beforeDate: Date): AsyncResult<number> {
    try {
      // Delete sessions that were revoked before the specified date
      const result = await this.db
        .deleteFrom('sessions')
        .where('revoked_at', '<', beforeDate)
        .where('revoked_at', 'is not', null) // Ensure they are actually revoked
        .execute();

      // Convert BigInt to number
      const numDeleted = (result as any)[0]?.numDeletedRows ?? 0n;
      return ResponseBuilder.ok(Number(numDeleted));
    } catch (error) {
      return new DatabaseError('deleteRevokedSessions', error);
    }
  }

  async createPasswordResetToken(
    userId: string,
    tokenHash: string,
    expiresIn?: number,
    ipAddress?: string,
    userAgent?: string,
  ): AsyncResult<PasswordResetToken> {
    try {
      const tokenId = uuidv4();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (expiresIn || 60 * 60) * 1000); // Default 1 hour

      await this.db
        .insertInto('password_reset_tokens')
        .values({
          id: tokenId,
          user_id: userId,
          token_hash: tokenHash,
          expires_at: expiresAt,
          used_at: null,
          ip_address: ipAddress || null,
          user_agent: userAgent || null,
          created_at: now,
          updated_at: now,
        })
        .execute();

      const token: PasswordResetToken = {
        id: tokenId,
        userId,
        tokenHash,
        expiresAt,
        usedAt: null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        createdAt: now,
        updatedAt: now,
      };

      return ResponseBuilder.ok(token);
    } catch (error) {
      return new DatabaseError('createPasswordResetToken', error);
    }
  }

  async findPasswordResetToken(tokenHash: string): AsyncResult<PasswordResetToken | null> {
    try {
      const row = await this.db
        .selectFrom('password_reset_tokens')
        .selectAll()
        .where('token_hash', '=', tokenHash)
        .executeTakeFirst();

      return ResponseBuilder.ok(row ? this.mapToPasswordResetToken(row) : null);
    } catch (error) {
      return new DatabaseError('findPasswordResetToken', error);
    }
  }

  async findActivePasswordResetTokensByUserId(userId: string): AsyncResult<PasswordResetToken[]> {
    try {
      const now = new Date();

      const rows = await this.db
        .selectFrom('password_reset_tokens')
        .selectAll()
        .where('user_id', '=', userId)
        .where('expires_at', '>', now) // Not expired
        .where('used_at', 'is', null) // Not used
        .orderBy('created_at', 'desc')
        .execute();

      const tokens = rows.map((row) => this.mapToPasswordResetToken(row));

      return ResponseBuilder.ok(tokens);
    } catch (error) {
      return new DatabaseError('findActivePasswordResetTokensByUserId', error);
    }
  }

  async markPasswordResetTokenAsUsed(tokenHash: string): AsyncResult<boolean> {
    try {
      const now = new Date();

      const result = await this.db
        .updateTable('password_reset_tokens')
        .set({
          used_at: now,
          updated_at: now,
        })
        .where('token_hash', '=', tokenHash)
        .where('used_at', 'is', null) // Only mark if not already used
        .where('expires_at', '>', now) // Only mark if not expired
        .execute();

      // Check if any rows were updated
      const success = result.length > 0;

      return ResponseBuilder.ok(success);
    } catch (error) {
      return new DatabaseError('markPasswordResetTokenAsUsed', error);
    }
  }
  async revokePasswordResetToken(tokenHash: string): AsyncResult<boolean> {
    try {
      const now = new Date();

      // Mark the token as used (revoked) even if not actually used for password reset
      const result = await this.db
        .updateTable('password_reset_tokens')
        .set({
          used_at: now, // Mark as "used" to revoke it
          updated_at: now,
        })
        .where('token_hash', '=', tokenHash)
        .where('used_at', 'is', null) // Only revoke if not already used
        .execute();

      // Check if any rows were updated
      const success = result.length > 0;

      return ResponseBuilder.ok(success);
    } catch (error) {
      return new DatabaseError('revokePasswordResetToken', error);
    }
  }
  async revokeAllUserPasswordResetTokens(userId: string): AsyncResult<number> {
    try {
      const now = new Date();

      // Mark all unused tokens for this user as used (revoked)
      const result = await this.db
        .updateTable('password_reset_tokens')
        .set({
          used_at: now, // Mark as "used" to revoke them
          updated_at: now,
        })
        .where('user_id', '=', userId)
        .where('used_at', 'is', null) // Only revoke unused tokens
        .execute();

      // Return the number of tokens that were revoked
      const revokedCount = result.length;

      return ResponseBuilder.ok(revokedCount);
    } catch (error) {
      return new DatabaseError('revokeAllUserPasswordResetTokens', error);
    }
  }
  async deleteExpiredPasswordResetTokens(): AsyncResult<number> {
    try {
      const now = new Date();

      // Delete tokens that are expired AND have been used, or are very old
      // Keep recent expired tokens for audit trail
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const result = await this.db
        .deleteFrom('password_reset_tokens')
        .where((eb) =>
          eb.or([
            // Delete used tokens older than 30 days
            eb.and([eb('used_at', 'is not', null), eb('used_at', '<', thirtyDaysAgo)]),
            // Delete expired unused tokens older than 30 days
            eb.and([eb('expires_at', '<', thirtyDaysAgo), eb('used_at', 'is', null)]),
          ]),
        )
        .execute();

      // Return the number of tokens deleted
      const deletedCount = result.length;

      return ResponseBuilder.ok(deletedCount);
    } catch (error) {
      return new DatabaseError('deleteExpiredPasswordResetTokens', error);
    }
  }

  async createEmailVerificationToken(
    userId: string,
    email: string,
    tokenHash: string,
    expiresIn?: number,
  ): AsyncResult<EmailVerificationToken> {
    try {
      const tokenId = uuidv4();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (expiresIn || 24 * 60 * 60) * 1000); // Default 24 hours

      await this.db
        .insertInto('email_verification_tokens')
        .values({
          id: tokenId,
          user_id: userId,
          email: email.toLowerCase(),
          token_hash: tokenHash,
          expires_at: expiresAt,
          verified_at: null,
          created_at: now,
          updated_at: now,
        })
        .execute();

      const token: EmailVerificationToken = {
        id: tokenId,
        userId,
        email,
        tokenHash,
        expiresAt,
        verifiedAt: null,
        createdAt: now,
        updatedAt: now,
      };

      return ResponseBuilder.ok(token);
    } catch (error) {
      return new DatabaseError('createEmailVerificationToken', error);
    }
  }

  async findEmailVerificationToken(tokenHash: string): AsyncResult<EmailVerificationToken | null> {
    try {
      const row = await this.db
        .selectFrom('email_verification_tokens')
        .selectAll()
        .where('token_hash', '=', tokenHash)
        .executeTakeFirst();

      if (!row) {
        return ResponseBuilder.ok(null);
      }

      const token = this.mapToEmailVerificationToken(row);

      return ResponseBuilder.ok(token);
    } catch (error) {
      return new DatabaseError('findEmailVerificationToken', error);
    }
  }

  async findActiveEmailVerificationToken(
    userId: string,
    email: string,
  ): AsyncResult<EmailVerificationToken | null> {
    try {
      const now = new Date();

      const row = await this.db
        .selectFrom('email_verification_tokens')
        .selectAll()
        .where('user_id', '=', userId)
        .where('email', '=', email.toLowerCase())
        .where('expires_at', '>', now) // Not expired
        .where('verified_at', 'is', null) // Not used
        .orderBy('created_at', 'desc') // Get most recent
        .executeTakeFirst();

      if (!row) {
        return ResponseBuilder.ok(null);
      }

      const token = this.mapToEmailVerificationToken(row);

      return ResponseBuilder.ok(token);
    } catch (error) {
      return new DatabaseError('findActiveEmailVerificationToken', error);
    }
  }

  async markEmailVerificationTokenAsUsed(tokenHash: string): AsyncResult<boolean> {
    try {
      const now = new Date();

      const result = await this.db
        .updateTable('email_verification_tokens')
        .set({
          verified_at: now,
          updated_at: now,
        })
        .where('token_hash', '=', tokenHash)
        .where('verified_at', 'is', null) // Only mark if not already verified
        .where('expires_at', '>', now) // Only mark if not expired
        .execute();

      // Check if any rows were updated
      const success = result.length > 0;

      return ResponseBuilder.ok(success);
    } catch (error) {
      return new DatabaseError('markEmailVerificationTokenAsUsed', error);
    }
  }

  async revokeEmailVerificationToken(tokenHash: string): AsyncResult<boolean> {
    try {
      const now = new Date();

      // Mark the token as verified (revoked) even if not actually used for verification
      const result = await this.db
        .updateTable('email_verification_tokens')
        .set({
          verified_at: now, // Mark as "verified" to revoke it
          updated_at: now,
        })
        .where('token_hash', '=', tokenHash)
        .where('verified_at', 'is', null) // Only revoke if not already used
        .execute();

      // Check if any rows were updated
      const success = result.length > 0;

      return ResponseBuilder.ok(success);
    } catch (error) {
      return new DatabaseError('revokeEmailVerificationToken', error);
    }
  }

  async revokeAllUserEmailVerificationTokens(userId: string): AsyncResult<number> {
    try {
      const now = new Date();

      // Mark all unused email verification tokens for this user as used (revoked)
      const result = await this.db
        .updateTable('email_verification_tokens')
        .set({
          verified_at: now, // Mark as "verified" to revoke them
          updated_at: now,
        })
        .where('user_id', '=', userId)
        .where('verified_at', 'is', null) // Only revoke unused tokens
        .execute();

      // Return the number of tokens that were revoked
      const revokedCount = result.length;

      return ResponseBuilder.ok(revokedCount);
    } catch (error) {
      return new DatabaseError('revokeAllUserEmailVerificationTokens', error);
    }
  }

  async deleteExpiredEmailVerificationTokens(): AsyncResult<number> {
    try {
      const now = new Date();

      // Delete tokens that are expired AND have been verified, or are very old
      // Keep recent expired tokens for audit trail
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const result = await this.db
        .deleteFrom('email_verification_tokens')
        .where((eb) =>
          eb.or([
            // Delete verified tokens older than 30 days
            eb.and([eb('verified_at', 'is not', null), eb('verified_at', '<', thirtyDaysAgo)]),
            // Delete expired unverified tokens older than 30 days
            eb.and([eb('expires_at', '<', thirtyDaysAgo), eb('verified_at', 'is', null)]),
          ]),
        )
        .execute();

      // Return the number of tokens deleted
      const deletedCount = result.length;

      return ResponseBuilder.ok(deletedCount);
    } catch (error) {
      return new DatabaseError('deleteExpiredEmailVerificationTokens', error);
    }
  }

  async createApiKey(input: {
    userId: string;
    name: string;
    keyHash: string;
    keyHint: string;
    scopes: string[];
    allowedIps?: string[];
    allowedOrigins?: string[];
    expiresAt?: Date;
  }): AsyncResult<ApiKey> {
    try {
      const apiKeyId = uuidv4();
      const now = new Date();

      await this.db
        .insertInto('api_keys')
        .values({
          id: apiKeyId,
          user_id: input.userId,
          name: input.name,
          key_hash: input.keyHash,
          key_prefix: input.keyHint,
          scopes: input.scopes, // Pass array directly - Kysely handles JSON serialization
          allowed_ips: input.allowedIps || null, // Pass array or null
          allowed_origins: input.allowedOrigins || null, // Pass array or null
          expires_at: input.expiresAt || null,

          // Additional fields from migration
          organization_id: null,
          rate_limit_per_hour: null,
          is_active: true,

          // Initial state
          last_used_at: null,
          last_used_ip: null,
          usage_count: 0,
          revoked_at: null,

          created_at: now,
          updated_at: now,
        })
        .execute();

      const apiKey: ApiKey = {
        id: apiKeyId,
        userId: input.userId,
        name: input.name,
        keyHash: input.keyHash,
        keyPrefix: input.keyHint,
        scopes: input.scopes,
        allowedIps: input.allowedIps || null,
        allowedOrigins: input.allowedOrigins || null,

        // Additional fields
        organizationId: null,
        rateLimitPerHour: null,

        lastUsedAt: null,
        lastUsedIp: null,
        usageCount: 0,
        expiresAt: input.expiresAt || null,

        isActive: true,
        revokedAt: null,
        revokedReason: null,

        createdAt: now,
        updatedAt: now,
        revokedBy: null,
      };

      return ResponseBuilder.ok(apiKey);
    } catch (error) {
      return new DatabaseError('createApiKey', error);
    }
  }

  async findApiKeyByHash(keyHash: string): AsyncResult<ApiKey | null> {
    try {
      const row = await this.db
        .selectFrom('api_keys')
        .selectAll()
        .where('key_hash', '=', keyHash)
        .executeTakeFirst();

      if (!row) {
        return ResponseBuilder.ok(null);
      }

      const apiKey = this.mapToApiKey(row);

      return ResponseBuilder.ok(apiKey);
    } catch (error) {
      return new DatabaseError('findApiKeyByHash', error);
    }
  }

  async findApiKeysByUserId(userId: string, includeRevoked?: boolean): AsyncResult<ApiKey[]> {
    try {
      let query = this.db.selectFrom('api_keys').selectAll().where('user_id', '=', userId);

      // By default, only return active (non-revoked) keys
      if (!includeRevoked) {
        query = query.where('revoked_at', 'is', null);
      }

      const rows = await query
        .orderBy('created_at', 'desc') // Most recent first
        .execute();

      const apiKeys = rows.map((row) => this.mapToApiKey(row));

      return ResponseBuilder.ok(apiKeys);
    } catch (error) {
      return new DatabaseError('findApiKeysByUserId', error);
    }
  }

  async updateApiKeyLastUsed(keyHash: string, ipAddress?: string): AsyncResult<boolean> {
    try {
      const now = new Date();

      const result = await this.db
        .updateTable('api_keys')
        .set({
          last_used_at: now,
          last_used_ip: ipAddress || null,
          usage_count: sql`usage_count + 1`, // Increment usage count
          updated_at: now,
        })
        .where('key_hash', '=', keyHash)
        .where('is_active', '=', true) // Only update if active
        .where('revoked_at', 'is', null) // Only update if not revoked
        .where((eb) =>
          eb.or([
            eb('expires_at', 'is', null), // No expiration
            eb('expires_at', '>', now), // Or not expired
          ]),
        )
        .execute();

      const success = result.length > 0;

      return ResponseBuilder.ok(success);
    } catch (error) {
      return new DatabaseError('updateApiKeyLastUsed', error);
    }
  }

  async revokeApiKey(id: string, revokedBy: string, reason?: string): AsyncResult<boolean> {
    try {
      const now = new Date();

      const result = await this.db
        .updateTable('api_keys')
        .set({
          revoked_at: now,
          is_active: false, // Also mark as inactive
          updated_at: now,
        })
        .where('id', '=', id)
        .where('revoked_at', 'is', null) // Only revoke if not already revoked
        .execute();

      const success = result.length > 0;

      return ResponseBuilder.ok(success);
    } catch (error) {
      return new DatabaseError('revokeApiKey', error);
    }
  }

  async deleteExpiredApiKeys(): AsyncResult<number> {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Delete API keys that are:
      // 1. Expired AND revoked (older than 30 days)
      // 2. Expired AND inactive (older than 30 days)
      const result = await this.db
        .deleteFrom('api_keys')
        .where((eb) =>
          eb.and([
            eb('expires_at', '<', thirtyDaysAgo), // Expired more than 30 days ago
            eb.or([
              eb('revoked_at', 'is not', null), // Is revoked
              eb('is_active', '=', false), // Or is inactive
            ]),
          ]),
        )
        .execute();

      const deletedCount = result.length;

      return ResponseBuilder.ok(deletedCount);
    } catch (error) {
      return new DatabaseError('deleteExpiredApiKeys', error);
    }
  }

  storeTwoFactorSecret(
    userId: string,
    encryptedSecret: string,
    backupCodes: string[],
  ): AsyncResult<TwoFactorSecretDB> {
    throw new Error('Method not implemented.');
  }
  findTwoFactorSecret(userId: string): AsyncResult<TwoFactorSecretDB | null> {
    throw new Error('Method not implemented.');
  }
  verifyBackupCode(userId: string, codeHash: string): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  markBackupCodeAsUsed(userId: string, codeHash: string): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  regenerateBackupCodes(userId: string, newCodes: string[]): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  deleteTwoFactorSecret(userId: string): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  async login(
    request: LoginRequest,
    ipAddress?: string,
    userAgent?: string,
  ): AsyncResult<LoginResponse> {
    try {
      // 1. Find user by email
      const userResult = await this.db
        .selectFrom('users')
        .selectAll()
        .where('email', '=', request.email.toLowerCase())
        .where('deleted_at', 'is', null)
        .executeTakeFirst();

      if (!userResult) {
        // Track failed login attempt
        await this.trackFailedLogin(request.email, ipAddress, 'User not found');
        return new NotFoundError('Invalid email or password');
      }

      // 2. Check if account is active
      if (userResult.status !== 'active') {
        await this.trackFailedLogin(request.email, ipAddress, `Account ${userResult.status}`);
        return new ForbiddenError(undefined, { reason: `Account is ${userResult.status}` });
      }

      // 3. Check if account is locked
      let securityResult = await this.db
        .selectFrom('user_security')
        .selectAll()
        .where('user_id', '=', userResult.id)
        .executeTakeFirst();

      // Create security record if it doesn't exist
      if (!securityResult) {
        await this.db
          .insertInto('user_security')
          .values({
            user_id: userResult.id,
            failed_login_attempts: 0,
            locked_until: null,
            last_login_at: null,
            last_login_ip: null,
            two_factor_enabled: false,
            two_factor_secret_id: null,
            last_password_change_at: null,
            password_history: sql`'[]'`,
            security_questions: sql`'[]'`,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .execute();

        // Fetch the newly created record
        securityResult = await this.db
          .selectFrom('user_security')
          .selectAll()
          .where('user_id', '=', userResult.id)
          .executeTakeFirst();
      }

      if (securityResult?.locked_until && new Date(securityResult.locked_until) > new Date()) {
        return new ForbiddenError(undefined, {
          reason: 'Account is temporarily locked',
          lockedUntil: securityResult.locked_until,
        });
      }

      // 4. Get password hash
      const passwordResult = await this.db
        .selectFrom('user_passwords')
        .select(['password_hash', 'must_change', 'expires_at'])
        .where('user_id', '=', userResult.id)
        .orderBy('created_at', 'desc')
        .executeTakeFirst();

      if (!passwordResult) {
        return new InternalServerError();
      }

      // 5. Verify password
      const bcrypt = await import('bcrypt');
      const isValidPassword = await bcrypt.compare(request.password, passwordResult.password_hash);

      if (!isValidPassword) {
        // Increment failed login attempts
        const newFailedAttempts = (securityResult?.failed_login_attempts || 0) + 1;

        await this.db
          .updateTable('user_security')
          .set({
            failed_login_attempts: newFailedAttempts,
            // Lock account after 5 failed attempts for 30 minutes
            locked_until: newFailedAttempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000) : null,
            updated_at: new Date(),
          })
          .where('user_id', '=', userResult.id)
          .execute();

        await this.trackFailedLogin(request.email, ipAddress, 'Invalid password');
        return new NotFoundError('Invalid email or password');
      }

      // 6. Check if password has expired
      if (passwordResult.expires_at && new Date(passwordResult.expires_at) < new Date()) {
        return new ForbiddenError(undefined, { reason: 'Password expired' });
      }

      // 7. Reset failed login attempts on successful login
      await this.db
        .updateTable('user_security')
        .set({
          failed_login_attempts: 0,
          locked_until: null,
          last_login_at: new Date(),
          last_login_ip: ipAddress || null,
          updated_at: new Date(),
        })
        .where('user_id', '=', userResult.id)
        .execute();

      // 8. Update user last activity
      await this.db
        .updateTable('users')
        .set({
          last_activity_at: new Date(),
          total_login_count: sql`total_login_count + 1`,
          updated_at: new Date(),
        })
        .where('id', '=', userResult.id)
        .execute();

      // 9. Generate tokens
      const crypto = await import('crypto');
      const accessToken = crypto.randomBytes(32).toString('hex');
      const refreshToken = crypto.randomBytes(32).toString('hex');

      // Hash tokens for storage
      const accessTokenHash = crypto.createHash('sha256').update(accessToken).digest('hex');
      const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

      // 10. Create session
      const sessionResult = await this.createSession(
        userResult.id,
        accessTokenHash,
        refreshTokenHash,
        {
          deviceId: request.deviceId,
          deviceName: request.deviceName,
          deviceType: request.deviceType || 'web',
          userAgent,
          ipAddress,
        },
        request.rememberMe ? 30 * 24 * 3600 : 3600, // 30 days if remember me, else 1 hour
      );

      if (!sessionResult.success) {
        return sessionResult;
      }

      const session = sessionResult.body().data;

      // 11. Get user's organization if any
      const orgMemberResult = await this.db
        .selectFrom('organization_members')
        .innerJoin('organizations', 'organizations.id', 'organization_members.organization_id')
        .select(['organizations.id', 'organizations.name', 'organization_members.role'])
        .where('organization_members.user_id', '=', userResult.id)
        .where('organization_members.status', '=', 'active')
        .where('organizations.status', '=', 'active')
        .executeTakeFirst();

      // 12. Prepare response
      const response: LoginResponse = {
        user: {
          id: userResult.id,
          email: userResult.email,
          firstName: userResult.first_name,
          lastName: userResult.last_name,
          displayName:
            userResult.display_name || `${userResult.first_name} ${userResult.last_name}`,
          avatarUrl: userResult.avatar_url,
          organizationId: orgMemberResult?.id || null,
        },
        tokens: {
          accessToken,
          refreshToken,
          tokenType: 'Bearer',
          expiresIn: Math.floor((session.expiresAt.getTime() - Date.now()) / 1000),
          refreshExpiresIn: Math.floor((session.refreshExpiresAt!.getTime() - Date.now()) / 1000),
        },
        session: {
          id: session.id,
          deviceId: session.deviceId || null,
          deviceName: session.deviceName || null,
          loginAt: session.createdAt,
        },
      };

      return ResponseBuilder.ok(
        response,
        undefined,
        passwordResult.must_change ? { warning: 'Password change required' } : undefined,
      );
    } catch (error) {
      return new DatabaseError('login', error);
    }
  }
  loginWithProvider(
    provider: AuthProvider,
    providerUserId: string,
    providerData: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ): AsyncResult<LoginResponse> {
    throw new Error('Method not implemented.');
  }

  async logout(sessionId: string, logoutAll?: boolean): AsyncResult<boolean> {
    try {
      if (logoutAll) {
        // Get the user ID from the session first
        const session = await this.db
          .selectFrom('sessions')
          .select(['user_id'])
          .where('id', '=', sessionId)
          .executeTakeFirst();

        if (!session) {
          return new NotFoundError('Session not found');
        }

        // Revoke all sessions for this user
        await this.db
          .updateTable('sessions')
          .set({
            revoked_at: new Date(),
            revoked_by: session.user_id,
            revoke_reason: 'User logged out from all devices',
            updated_at: new Date(),
          })
          .where('user_id', '=', session.user_id)
          .where('revoked_at', 'is', null) // Only active sessions
          .execute();
      } else {
        const result = await this.db
          .updateTable('sessions')
          .set({
            revoked_at: new Date(),
            revoked_by: 'self',
            revoke_reason: 'User logged out',
            updated_at: new Date(),
          })
          .where('id', '=', sessionId)
          .where('revoked_at', 'is', null) // Only if active
          .execute();

        // Fix: Use numUpdatedRows instead of affectedRows
        const affectedRows = Number((result as any)[0]?.numUpdatedRows || 0n);

        if (affectedRows === 0) {
          return new NotFoundError('Session not found or already revoked');
        }
      }

      return ResponseBuilder.ok(true);
    } catch (error) {
      return new DatabaseError('logout', error);
    }
  }

  async refreshToken(request: RefreshTokenRequest): AsyncResult<AuthTokens> {
    try {
      // Hash the provided refresh token
      const crypto = await import('crypto');
      const refreshTokenHash = crypto
        .createHash('sha256')
        .update(request.refreshToken)
        .digest('hex');

      // Find the session by refresh token hash
      const session = await this.db
        .selectFrom('sessions')
        .selectAll()
        .where('refresh_token_hash', '=', refreshTokenHash)
        .where('revoked_at', 'is', null)
        .executeTakeFirst();

      if (!session) {
        return new UnauthorizedError('Invalid refresh token');
      }

      // Check if refresh token has expired
      if (session.refresh_expires_at && new Date(session.refresh_expires_at) < new Date()) {
        // Revoke the session
        await this.db
          .updateTable('sessions')
          .set({
            revoked_at: new Date(),
            revoke_reason: 'Refresh token expired',
            updated_at: new Date(),
          })
          .where('id', '=', session.id)
          .execute();

        return new UnauthorizedError('Refresh token expired');
      }

      // Check if the session itself has expired (absolute timeout)
      if (session.absolute_timeout_at && new Date(session.absolute_timeout_at) < new Date()) {
        await this.db
          .updateTable('sessions')
          .set({
            revoked_at: new Date(),
            revoke_reason: 'Session absolute timeout',
            updated_at: new Date(),
          })
          .where('id', '=', session.id)
          .execute();

        return new UnauthorizedError('Session expired');
      }

      // Generate new tokens
      const newAccessToken = crypto.randomBytes(32).toString('hex');
      const newRefreshToken = crypto.randomBytes(32).toString('hex');

      // Hash tokens for storage
      const newAccessTokenHash = crypto.createHash('sha256').update(newAccessToken).digest('hex');
      const newRefreshTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

      // Calculate new expiration times
      const now = new Date();
      const accessTokenExpiry = new Date(now.getTime() + 3600 * 1000); // 1 hour
      const refreshTokenExpiry = new Date(now.getTime() + 30 * 24 * 3600 * 1000); // 30 days

      // Update session with new tokens
      await this.db
        .updateTable('sessions')
        .set({
          token_hash: newAccessTokenHash,
          refresh_token_hash: newRefreshTokenHash,
          expires_at: accessTokenExpiry,
          refresh_expires_at: refreshTokenExpiry,
          last_activity_at: now,
          updated_at: now,
        })
        .where('id', '=', session.id)
        .execute();

      // Return new tokens
      const response: AuthTokens = {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        tokenType: 'Bearer',
        expiresIn: 3600, // 1 hour in seconds
        refreshExpiresIn: 30 * 24 * 3600, // 30 days in seconds
      };

      return ResponseBuilder.ok(response);
    } catch (error) {
      return new DatabaseError('refreshToken', error);
    }
  }

  async validateAccessToken(token: string): AsyncResult<{ user: User; session: Session }> {
    try {
      // Hash the provided token
      const crypto = await import('crypto');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // Find session by token hash
      const sessionResult = await this.db
        .selectFrom('sessions')
        .selectAll()
        .where('token_hash', '=', tokenHash)
        .where('revoked_at', 'is', null)
        .executeTakeFirst();

      if (!sessionResult) {
        return new UnauthorizedError(undefined, { reason: 'Invalid token' });
      }

      // Check if session has expired
      const now = new Date();
      const expiresAt = new Date(sessionResult.expires_at);

      if (expiresAt < now) {
        return new UnauthorizedError(undefined, { reason: 'Token expired' });
      }

      // Check idle timeout if set
      if (sessionResult.idle_timeout_at) {
        const idleTimeout = new Date(sessionResult.idle_timeout_at);
        if (idleTimeout < now) {
          // Don't automatically revoke here either
          return new UnauthorizedError(undefined, { reason: 'Session timeout' });
        }
      }

      const userResult = await this.db
        .selectFrom('users')
        .selectAll()
        .where('id', '=', sessionResult.user_id)
        .where('deleted_at', 'is', null)
        .executeTakeFirst();

      if (!userResult) {
        return new UnauthorizedError(undefined, { reason: 'User not found' });
      }

      if (userResult.status !== 'active') {
        return new UnauthorizedError(undefined, { reason: 'User account is not active' });
      }

      // Map database results to domain entities
      const session = this.mapToSession(sessionResult);
      const user = this.mapToUser(userResult);

      return ResponseBuilder.ok({ user, session });
    } catch (error) {
      return new DatabaseError('validateAccessToken', error);
    }
  }

  async validateApiKey(
    key: string,
    requiredScopes?: string[],
  ): AsyncResult<{ user: User; apiKey: ApiKey }> {
    try {
      // Hash the provided API key
      const crypto = await import('crypto');
      const keyHash = crypto.createHash('sha256').update(key).digest('hex');

      // Find the API key by hash
      const apiKeyResult = await this.db
        .selectFrom('api_keys')
        .selectAll()
        .where('key_hash', '=', keyHash)
        .executeTakeFirst();

      if (!apiKeyResult) {
        return new UnauthorizedError('Invalid API key');
      }

      // Check if API key is active
      if (!apiKeyResult.is_active) {
        return new UnauthorizedError('API key is inactive');
      }

      // Check if API key is revoked
      if (apiKeyResult.revoked_at) {
        return new UnauthorizedError('API key has been revoked');
      }

      // Check if API key has expired
      if (apiKeyResult.expires_at && new Date(apiKeyResult.expires_at) < new Date()) {
        return new UnauthorizedError('API key has expired');
      }

      // Check rate limiting if configured
      if (apiKeyResult.rate_limit_per_hour) {
        // This is a simplified check - in production you'd want to use Redis or similar
        // to track actual usage over the past hour
        if (apiKeyResult.usage_count >= apiKeyResult.rate_limit_per_hour) {
          return new ForbiddenError('API key rate limit exceeded');
        }
      }

      // Check required scopes if provided
      if (requiredScopes && requiredScopes.length > 0) {
        const apiKeyScopes = apiKeyResult.scopes as string[];
        const hasAllScopes = requiredScopes.every((scope) => apiKeyScopes.includes(scope));

        if (!hasAllScopes) {
          return new ForbiddenError('Insufficient API key permissions', {
            required: requiredScopes,
            available: apiKeyScopes,
          });
        }
      }

      // Get the user associated with this API key
      const userResult = await this.db
        .selectFrom('users')
        .selectAll()
        .where('id', '=', apiKeyResult.user_id)
        .where('deleted_at', 'is', null)
        .executeTakeFirst();

      if (!userResult) {
        return new UnauthorizedError('User not found for API key');
      }

      // Check if user account is active
      if (userResult.status !== 'active') {
        return new UnauthorizedError('User account is not active');
      }

      // Update last used information (don't await to avoid blocking the request)
      this.updateApiKeyLastUsed(keyHash).catch((error) => {
        console.error('Failed to update API key last used:', error);
      });

      // Map to domain entities
      const apiKey = this.mapToApiKey(apiKeyResult);
      const user = this.mapToUser(userResult);

      return ResponseBuilder.ok({ user, apiKey });
    } catch (error) {
      return new DatabaseError('validateApiKey', error);
    }
  }
  async changePassword(
    userId: string,
    request: ChangePasswordRequest,
    sessionId?: string,
  ): AsyncResult<boolean> {
    try {
      // 1. Get current password hash
      const currentPasswordResult = await this.db
        .selectFrom('user_passwords')
        .select(['password_hash'])
        .where('user_id', '=', userId)
        .orderBy('created_at', 'desc')
        .executeTakeFirst();

      if (!currentPasswordResult) {
        return new NotFoundError('User password not found');
      }

      // 2. Verify current password
      const bcrypt = await import('bcrypt');
      const isValidPassword = await bcrypt.compare(
        request.currentPassword,
        currentPasswordResult.password_hash,
      );

      if (!isValidPassword) {
        return new UnauthorizedError(undefined, { reason: 'Current password is incorrect' });
      }

      // 3. Check password history (optional - prevent reuse)
      const securityResult = await this.db
        .selectFrom('user_security')
        .select(['password_history'])
        .where('user_id', '=', userId)
        .executeTakeFirst();

      if (securityResult?.password_history) {
        // Check if new password was used before
        const passwordHistory = JSON.parse(securityResult.password_history as any) || [];
        for (const oldHash of passwordHistory) {
          const isReused = await bcrypt.compare(request.newPassword, oldHash);
          if (isReused) {
            return new ValidationError({
              newPassword: ['Password has been used before. Please choose a different password.'],
            });
          }
        }
      }

      // 4. Hash new password
      const newPasswordHash = await bcrypt.hash(request.newPassword, 10);

      // 5. Create new password record
      const passwordId = uuidv4();
      await this.db
        .insertInto('user_passwords')
        .values({
          id: passwordId,
          user_id: userId,
          password_hash: newPasswordHash,
          must_change: false,
          expires_at: null, // Or set expiration if needed
          created_at: new Date(),
        })
        .execute();

      // 6. Update password history
      await this.db
        .updateTable('user_security')
        .set({
          last_password_change_at: new Date(),
          password_history: sql`JSON_ARRAY_APPEND(
          COALESCE(password_history, '[]'), 
          '$', 
          ${currentPasswordResult.password_hash}
        )`,
          updated_at: new Date(),
        })
        .where('user_id', '=', userId)
        .execute();

      // 7. Revoke other sessions if requested
      if (request.logoutOtherSessions && sessionId) {
        await this.db
          .updateTable('sessions')
          .set({
            revoked_at: new Date(),
            revoked_by: userId,
            revoke_reason: 'Password changed',
            updated_at: new Date(),
          })
          .where('user_id', '=', userId)
          .where('id', '!=', sessionId) // Keep current session
          .where('revoked_at', 'is', null)
          .execute();
      }

      return ResponseBuilder.ok(true);
    } catch (error) {
      return new DatabaseError('changePassword', error);
    }
  }

  async forgotPassword(
    request: ForgotPasswordRequest,
    ipAddress?: string,
  ): AsyncResult<{ success: boolean; email: string; token?: string }> {
    try {
      // 1. Find user by email
      const userResult = await this.db
        .selectFrom('users')
        .select(['id', 'email', 'status'])
        .where('email', '=', request.email.toLowerCase())
        .where('deleted_at', 'is', null)
        .executeTakeFirst();

      // Always return success to prevent email enumeration
      if (!userResult) {
        return ResponseBuilder.ok({ success: true, email: request.email });
      }

      // Don't send reset for inactive accounts
      if (userResult.status !== 'active') {
        return ResponseBuilder.ok({ success: true, email: request.email });
      }

      // 2. Check for recent password reset requests (rate limiting)
      const recentTokens = await this.db
        .selectFrom('password_reset_tokens')
        .select(['created_at'])
        .where('user_id', '=', userResult.id)
        .where('created_at', '>', new Date(Date.now() - 5 * 60 * 1000)) // Last 5 minutes
        .execute();

      if (recentTokens.length >= 3) {
        // Too many requests, but still return success
        return ResponseBuilder.ok({ success: true, email: request.email });
      }

      // 3. Generate reset token
      const crypto = await import('crypto');
      const resetToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

      // 4. Store reset token
      const tokenId = uuidv4();
      const now = new Date();

      await this.db
        .insertInto('password_reset_tokens')
        .values({
          id: tokenId,
          user_id: userResult.id,
          token_hash: tokenHash,
          expires_at: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
          ip_address: ipAddress || null,
          user_agent: null,
          used_at: null,
          created_at: now,
          updated_at: now, // Added missing field
        })
        .execute();

      // Return the token so the service layer can send the email
      return ResponseBuilder.ok({
        success: true,
        email: request.email,
        token: resetToken, // Service layer will use this to send email
      });
    } catch (error) {
      return new DatabaseError('forgotPassword', error);
    }
  }

  async resetPassword(request: ResetPasswordRequest, ipAddress?: string): AsyncResult<boolean> {
    try {
      // 1. Hash the provided token
      const crypto = await import('crypto');
      const tokenHash = crypto.createHash('sha256').update(request.token).digest('hex');

      // 2. Find valid reset token
      const tokenResult = await this.db
        .selectFrom('password_reset_tokens')
        .select(['id', 'user_id', 'expires_at', 'used_at'])
        .where('token_hash', '=', tokenHash)
        .executeTakeFirst();

      if (!tokenResult) {
        return new UnauthorizedError(undefined, { reason: 'Invalid reset token' });
      }

      // 3. Check if token is expired
      if (new Date(tokenResult.expires_at) < new Date()) {
        return new UnauthorizedError(undefined, { reason: 'Reset token has expired' });
      }

      // 4. Check if token was already used
      if (tokenResult.used_at) {
        return new UnauthorizedError(undefined, { reason: 'Reset token has already been used' });
      }

      // 5. Get user
      const userResult = await this.db
        .selectFrom('users')
        .select(['id', 'status'])
        .where('id', '=', tokenResult.user_id)
        .executeTakeFirst();

      if (!userResult || userResult.status !== 'active') {
        return new UnauthorizedError(undefined, { reason: 'Invalid user' });
      }

      // 6. Hash new password
      const bcrypt = await import('bcrypt');
      const passwordHash = await bcrypt.hash(request.newPassword, 10);

      // 7. Create new password record
      const passwordId = uuidv4();
      await this.db
        .insertInto('user_passwords')
        .values({
          id: passwordId,
          user_id: tokenResult.user_id,
          password_hash: passwordHash,
          must_change: false,
          expires_at: null,
          created_at: new Date(),
        })
        .execute();

      // 8. Mark token as used
      await this.db
        .updateTable('password_reset_tokens')
        .set({
          used_at: new Date(),
          ip_address: ipAddress || null,
        })
        .where('id', '=', tokenResult.id)
        .execute();

      // 9. Update security record
      await this.db
        .updateTable('user_security')
        .set({
          last_password_change_at: new Date(),
          failed_login_attempts: 0, // Reset failed attempts
          locked_until: null, // Unlock account if locked
          updated_at: new Date(),
        })
        .where('user_id', '=', tokenResult.user_id)
        .execute();

      // 10. Revoke all sessions (force re-login)
      await this.db
        .updateTable('sessions')
        .set({
          revoked_at: new Date(),
          revoked_by: 'system',
          revoke_reason: 'Password reset',
          updated_at: new Date(),
        })
        .where('user_id', '=', tokenResult.user_id)
        .where('revoked_at', 'is', null)
        .execute();

      return ResponseBuilder.ok(true);
    } catch (error) {
      return new DatabaseError('resetPassword', error);
    }
  }
  async requirePasswordChange(userId: string): AsyncResult<boolean> {
    try {
      // Get the current password record
      const currentPassword = await this.db
        .selectFrom('user_passwords')
        .select(['id'])
        .where('user_id', '=', userId)
        .orderBy('created_at', 'desc')
        .executeTakeFirst();

      if (!currentPassword) {
        return new NotFoundError('No password record found for user');
      }

      // Update the password record to require change
      const result = await this.db
        .updateTable('user_passwords')
        .set({
          must_change: true,
        })
        .where('id', '=', currentPassword.id)
        .execute();

      const success = result.length > 0;

      // Optionally, you might want to expire all active sessions
      // to force the user to login again and see the password change requirement
      if (success) {
        await this.db
          .updateTable('sessions')
          .set({
            revoked_at: new Date(),
            revoked_by: 'system',
            revoke_reason: 'Password change required',
            updated_at: new Date(),
          })
          .where('user_id', '=', userId)
          .where('revoked_at', 'is', null)
          .execute();
      }

      return ResponseBuilder.ok(success);
    } catch (error) {
      return new DatabaseError('requirePasswordChange', error);
    }
  }

  async sendVerificationEmail(userId: string, email?: string): AsyncResult<boolean> {
    try {
      // Get user details
      const user = await this.db
        .selectFrom('users')
        .select(['id', 'email', 'email_verified', 'status'])
        .where('id', '=', userId)
        .where('deleted_at', 'is', null)
        .executeTakeFirst();

      if (!user) {
        return new NotFoundError('User not found');
      }

      // Use provided email or user's current email
      const targetEmail = email ? email.toLowerCase() : user.email;

      // If email is different, update user's email (for email change scenarios)
      if (email && email.toLowerCase() !== user.email.toLowerCase()) {
        await this.db
          .updateTable('users')
          .set({
            email: targetEmail,
            email_verified: false,
            email_verified_at: null,
            updated_at: new Date(),
          })
          .where('id', '=', userId)
          .execute();
      }

      // Check if already verified (only if not changing email)
      if (!email && user.email_verified) {
        return ResponseBuilder.ok(true, 'Email already verified');
      }

      // Generate verification token
      const crypto = await import('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // Create verification token
      const tokenResult = await this.createEmailVerificationToken(
        userId,
        targetEmail,
        tokenHash,
        24 * 60 * 60, // 24 hours
      );

      if (!tokenResult.success) {
        return tokenResult;
      }

      // Return success with token in metadata for service layer to send email
      return ResponseBuilder.ok(true, undefined, {
        token,
        email: targetEmail,
        isNewEmail: email !== undefined && email.toLowerCase() !== user.email.toLowerCase(),
      });
    } catch (error) {
      return new DatabaseError('sendVerificationEmail', error);
    }
  }

  async verifyEmail(request: VerifyEmailRequest): AsyncResult<boolean> {
    try {
      const crypto = await import('crypto');
      const tokenHash = crypto.createHash('sha256').update(request.token).digest('hex');

      const tokenResult = await this.db
        .selectFrom('email_verification_tokens')
        .selectAll()
        .where('token_hash', '=', tokenHash)
        .executeTakeFirst();

      if (!tokenResult) {
        return new NotFoundError('Invalid verification token');
      }

      if (new Date(tokenResult.expires_at) < new Date()) {
        return new ValidationError({ token: ['Verification token has expired'] });
      }

      if (tokenResult.verified_at) {
        return new ValidationError({ token: ['Verification token already used'] });
      }

      const trx = await this.db.transaction().execute(async (tx) => {
        await tx
          .updateTable('email_verification_tokens')
          .set({
            verified_at: new Date(),
            updated_at: new Date(), // Now we can update this!
          })
          .where('id', '=', tokenResult.id)
          .execute();

        await tx
          .updateTable('users')
          .set({
            email_verified: true,
            email_verified_at: new Date(),
            status: 'active',
            updated_at: new Date(),
          })
          .where('id', '=', tokenResult.user_id)
          .where('email', '=', tokenResult.email)
          .execute();

        return true;
      });

      return ResponseBuilder.ok(true);
    } catch (error) {
      return new DatabaseError('verifyEmail', error);
    }
  }

  async resendVerificationEmail(email: string): AsyncResult<boolean> {
    try {
      // Find user by email
      const user = await this.db
        .selectFrom('users')
        .select(['id', 'email_verified', 'status'])
        .where('email', '=', email.toLowerCase())
        .where('deleted_at', 'is', null)
        .executeTakeFirst();

      // Always return success to prevent email enumeration
      if (!user) {
        return ResponseBuilder.ok(true);
      }

      // Check if already verified
      if (user.email_verified) {
        return ResponseBuilder.ok(true); // Already verified, no need to send
      }

      // Check if account is active
      if (user.status !== 'active' && user.status !== 'pending_verification') {
        return ResponseBuilder.ok(true); // Don't send for inactive accounts
      }

      // Check for rate limiting - prevent spam
      const recentTokens = await this.db
        .selectFrom('email_verification_tokens')
        .select(['created_at'])
        .where('user_id', '=', user.id)
        .where('email', '=', email.toLowerCase())
        .where('created_at', '>', new Date(Date.now() - 5 * 60 * 1000)) // Last 5 minutes
        .execute();

      if (recentTokens.length >= 3) {
        // Too many requests in the last 5 minutes
        return new ValidationError({
          email: [
            'Too many verification emails requested. Please wait a few minutes before trying again.',
          ],
        });
      }

      // Check if there's an active (unused, not expired) token
      const existingToken = await this.db
        .selectFrom('email_verification_tokens')
        .select(['id', 'token_hash', 'expires_at'])
        .where('user_id', '=', user.id)
        .where('email', '=', email.toLowerCase())
        .where('verified_at', 'is', null)
        .where('expires_at', '>', new Date())
        .orderBy('created_at', 'desc')
        .executeTakeFirst();

      let token: string;

      if (existingToken) {
        // Reuse existing token if it's still valid
        // In a real implementation, you'd need to retrieve the original token
        // For now, we'll generate a new one
        const crypto = await import('crypto');
        token = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        // Update the existing token with new hash and expiration
        await this.db
          .updateTable('email_verification_tokens')
          .set({
            token_hash: tokenHash,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            updated_at: new Date(),
          })
          .where('id', '=', existingToken.id)
          .execute();
      } else {
        // Create new verification token
        const crypto = await import('crypto');
        token = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const tokenResult = await this.createEmailVerificationToken(
          user.id,
          email,
          tokenHash,
          24 * 60 * 60, // 24 hours
        );

        if (!tokenResult.success) {
          return tokenResult;
        }
      }

      // The actual email sending would be handled by the service layer
      // Store the token in the metadata field instead
      return ResponseBuilder.ok(true, undefined, { token });
    } catch (error) {
      return new DatabaseError('resendVerificationEmail', error);
    }
  }

  async generateTwoFactorSecret(
    userId: string,
  ): AsyncResult<{ secret: string; qrCode: string; backupCodes: string[] }> {
    try {
      // Check if user exists
      const user = await this.db
        .selectFrom('users')
        .select(['id', 'email', 'first_name', 'last_name'])
        .where('id', '=', userId)
        .where('deleted_at', 'is', null)
        .executeTakeFirst();

      if (!user) {
        return new NotFoundError('User not found');
      }

      // Check if 2FA is already enabled
      const securityRecord = await this.db
        .selectFrom('user_security')
        .select(['two_factor_enabled', 'two_factor_secret_id'])
        .where('user_id', '=', userId)
        .executeTakeFirst();

      if (securityRecord?.two_factor_enabled) {
        return new ValidationError({
          twoFactor: ['Two-factor authentication is already enabled'],
        });
      }

      // Generate new secret
      const { authenticator } = await import('otplib');
      const secret = authenticator.generateSecret();

      // Generate QR code
      const serviceName = 'FireNotifications'; // Your app name
      const userLabel = user.email;
      const otpauth = authenticator.keyuri(userLabel, serviceName, secret);

      // Generate QR code as data URL
      const qrcode = await import('qrcode');
      const qrCode = await qrcode.toDataURL(otpauth);

      // Store the secret (not enabled yet)
      const secretId = uuidv4();
      const now = new Date();

      // If user already has a pending secret, delete it first
      if (securityRecord?.two_factor_secret_id) {
        await this.db
          .deleteFrom('two_factor_secrets')
          .where('id', '=', securityRecord.two_factor_secret_id)
          .where('enabled', '=', false) // Only delete if not enabled
          .execute();
      }

      // Create new secret record (not enabled yet)
      await this.db
        .insertInto('two_factor_secrets')
        .values({
          id: secretId,
          user_id: userId,
          secret: secret, // In production, encrypt this
          backup_codes: [], // Will be generated when enabling
          enabled: false,
          enabled_at: null,
          last_used_at: null,
          created_at: now,
          updated_at: now,
        })
        .execute();

      // Update or create user security record
      if (securityRecord) {
        await this.db
          .updateTable('user_security')
          .set({
            two_factor_secret_id: secretId,
            updated_at: now,
          })
          .where('user_id', '=', userId)
          .execute();
      } else {
        await this.db
          .insertInto('user_security')
          .values({
            user_id: userId,
            failed_login_attempts: 0,
            locked_until: null,
            last_login_at: null,
            last_login_ip: null,
            two_factor_enabled: false,
            two_factor_secret_id: secretId,
            last_password_change_at: null,
            password_history: sql`'[]'`,
            security_questions: sql`'[]'`,
            created_at: now,
            updated_at: now,
          })
          .execute();
      }

      // Return the secret and QR code
      // Note: We don't generate backup codes here - they're generated when 2FA is actually enabled
      return ResponseBuilder.ok({
        secret,
        qrCode,
        backupCodes: [], // Empty for now, will be provided when enableTwoFactor is called
      });
    } catch (error) {
      return new DatabaseError('generateTwoFactorSecret', error);
    }
  }

  async enableTwoFactor(
    userId: string,
    totpCode: string,
    sessionId?: string,
  ): AsyncResult<{ backupCodes: string[] }> {
    try {
      // Get user's security record
      const securityRecord = await this.db
        .selectFrom('user_security')
        .select(['two_factor_secret_id', 'two_factor_enabled'])
        .where('user_id', '=', userId)
        .executeTakeFirst();

      // Check if 2FA is already enabled
      if (securityRecord?.two_factor_enabled) {
        return new ValidationError({
          twoFactor: ['Two-factor authentication is already enabled'],
        });
      }

      // Get the pending secret (should have been created via generateTwoFactorSecret)
      if (!securityRecord?.two_factor_secret_id) {
        return new ValidationError({
          twoFactor: ['No pending two-factor setup found. Please generate a secret first.'],
        });
      }

      // Get the secret to verify the code
      const secretRecord = await this.db
        .selectFrom('two_factor_secrets')
        .select(['secret', 'backup_codes'])
        .where('id', '=', securityRecord.two_factor_secret_id)
        .where('enabled', '=', false) // Should not be enabled yet
        .executeTakeFirst();

      if (!secretRecord) {
        return new ValidationError({
          twoFactor: ['Two-factor setup expired or not found'],
        });
      }

      // Verify the TOTP code
      const { authenticator } = await import('otplib');
      authenticator.options = {
        window: 2, // Allow some clock drift
      };

      const isValidCode = authenticator.verify({
        token: totpCode,
        secret: secretRecord.secret,
      });

      if (!isValidCode) {
        return new ValidationError({
          totpCode: ['Invalid verification code'],
        });
      }

      // Generate plain text backup codes for user to save
      const crypto = await import('crypto');
      const bcrypt = await import('bcrypt');
      const plainBackupCodes: string[] = [];
      const hashedBackupCodes: string[] = [];

      // Generate 8 backup codes
      for (let i = 0; i < 8; i++) {
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        plainBackupCodes.push(code);
        const hashedCode = await bcrypt.hash(code, 10);
        hashedBackupCodes.push(hashedCode);
      }

      // Enable 2FA in a transaction
      await this.db.transaction().execute(async (trx) => {
        // Update the secret with hashed backup codes and mark as enabled
        await trx
          .updateTable('two_factor_secrets')
          .set({
            backup_codes: hashedBackupCodes,
            enabled: true,
            enabled_at: new Date(),
            last_used_at: new Date(),
          })
          .where('id', '=', securityRecord.two_factor_secret_id)
          .execute();

        // Update user security to mark 2FA as enabled
        await trx
          .updateTable('user_security')
          .set({
            two_factor_enabled: true,
            updated_at: new Date(),
          })
          .where('user_id', '=', userId)
          .execute();

        // If session provided, mark it as MFA verified
        if (sessionId) {
          await trx
            .updateTable('sessions')
            .set({
              is_mfa_verified: true,
              updated_at: new Date(),
            })
            .where('id', '=', sessionId)
            .execute();
        }
      });

      // Return the plain backup codes for the user to save
      return ResponseBuilder.ok({
        backupCodes: plainBackupCodes,
      });
    } catch (error) {
      return new DatabaseError('enableTwoFactor', error);
    }
  }

  async disableTwoFactor(
    userId: string,
    password?: string,
    adminId?: string,
  ): AsyncResult<boolean> {
    try {
      // If not admin action, verify password
      if (!adminId && password) {
        // Get user's current password hash
        const passwordResult = await this.db
          .selectFrom('user_passwords')
          .select(['password_hash'])
          .where('user_id', '=', userId)
          .orderBy('created_at', 'desc')
          .executeTakeFirst();

        if (!passwordResult) {
          return new UnauthorizedError('Invalid password');
        }

        // Verify password
        const bcrypt = await import('bcrypt');
        const isValidPassword = await bcrypt.compare(password, passwordResult.password_hash);

        if (!isValidPassword) {
          return new UnauthorizedError('Invalid password');
        }
      } else if (!adminId && !password) {
        // Require either password or admin action
        return new UnauthorizedError('Password required to disable two-factor authentication');
      }

      // Get user's security record
      const securityRecord = await this.db
        .selectFrom('user_security')
        .select(['two_factor_enabled', 'two_factor_secret_id'])
        .where('user_id', '=', userId)
        .executeTakeFirst();

      if (!securityRecord || !securityRecord.two_factor_enabled) {
        return ResponseBuilder.ok(false); // Already disabled
      }

      // Start transaction to disable 2FA
      const result = await this.db.transaction().execute(async (trx) => {
        // Update user_security
        await trx
          .updateTable('user_security')
          .set({
            two_factor_enabled: false,
            two_factor_secret_id: null,
            updated_at: new Date(),
          })
          .where('user_id', '=', userId)
          .execute();

        // Delete the two-factor secret if it exists
        if (securityRecord.two_factor_secret_id) {
          await trx
            .deleteFrom('two_factor_secrets')
            .where('id', '=', securityRecord.two_factor_secret_id)
            .execute();
        }

        return true;
      });

      return ResponseBuilder.ok(result);
    } catch (error) {
      return new DatabaseError('disableTwoFactor', error);
    }
  }

  async verifyTwoFactor(userId: string, code: string, sessionId?: string): AsyncResult<boolean> {
    try {
      // Get user's two-factor secret
      const securityRecord = await this.db
        .selectFrom('user_security')
        .select(['two_factor_enabled', 'two_factor_secret_id'])
        .where('user_id', '=', userId)
        .executeTakeFirst();

      if (
        !securityRecord ||
        !securityRecord.two_factor_enabled ||
        !securityRecord.two_factor_secret_id
      ) {
        return new ValidationError({ code: ['Two-factor authentication is not enabled'] });
      }

      // Get the secret
      const secretRecord = await this.db
        .selectFrom('two_factor_secrets')
        .select(['secret', 'backup_codes'])
        .where('id', '=', securityRecord.two_factor_secret_id)
        .executeTakeFirst();

      if (!secretRecord) {
        return new InternalServerError('Two-factor secret not found');
      }

      let isValid = false;
      let isBackupCode = false;

      // First try to verify as TOTP code
      // Using otplib instead of speakeasy
      const { authenticator } = await import('otplib');

      // Configure otplib for better compatibility
      authenticator.options = {
        window: 2, // Allow 2 time steps before/after for clock drift
      };

      const totpValid = authenticator.verify({
        token: code,
        secret: secretRecord.secret, // This should be decrypted in production
      });

      if (totpValid) {
        isValid = true;
      } else {
        // Try backup codes if TOTP fails
        const bcrypt = await import('bcrypt');
        const backupCodes = secretRecord.backup_codes as string[];

        for (const hashedBackupCode of backupCodes) {
          const matches = await bcrypt.compare(code, hashedBackupCode);
          if (matches) {
            isValid = true;
            isBackupCode = true;

            // Remove used backup code
            const updatedCodes = backupCodes.filter((c) => c !== hashedBackupCode);
            await this.db
              .updateTable('two_factor_secrets')
              .set({
                backup_codes: updatedCodes, // Kysely should handle JSON serialization
                last_used_at: new Date(),
              })
              .where('id', '=', securityRecord.two_factor_secret_id)
              .execute();

            break;
          }
        }
      }

      if (!isValid) {
        return new ValidationError({ code: ['Invalid verification code'] });
      }

      // Update last used timestamp
      if (!isBackupCode) {
        await this.db
          .updateTable('two_factor_secrets')
          .set({
            last_used_at: new Date(),
          })
          .where('id', '=', securityRecord.two_factor_secret_id)
          .execute();
      }

      // If session ID provided, mark session as MFA verified
      if (sessionId) {
        await this.db
          .updateTable('sessions')
          .set({
            is_mfa_verified: true,
            updated_at: new Date(),
          })
          .where('id', '=', sessionId)
          .execute();
      }

      return ResponseBuilder.ok(true);
    } catch (error) {
      return new DatabaseError('verifyTwoFactor', error);
    }
  }

  async isTwoFactorEnabled(userId: string): AsyncResult<boolean> {
    try {
      const securityRecord = await this.db
        .selectFrom('user_security')
        .select(['two_factor_enabled'])
        .where('user_id', '=', userId)
        .executeTakeFirst();

      // If no security record exists, 2FA is not enabled
      const isEnabled = securityRecord?.two_factor_enabled || false;

      return ResponseBuilder.ok(isEnabled);
    } catch (error) {
      return new DatabaseError('isTwoFactorEnabled', error);
    }
  }

  linkAuthProvider(
    userId: string,
    provider: AuthProvider,
    providerUserId: string,
    providerData?: Record<string, any>,
  ): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }

  async unlinkAuthProvider(userId: string, provider: AuthProvider): AsyncResult<boolean> {
    try {
      // First check if this is the user's only auth method
      const authProviderCount = await this.db
        .selectFrom('user_auth_providers')
        .select((eb) => eb.fn.count<string>('id').as('count'))
        .where('user_id', '=', userId)
        .executeTakeFirst();

      const providerCount = Number(authProviderCount?.count || 0);

      // Also check if user has a password
      const hasPassword = await this.db
        .selectFrom('user_passwords')
        .select(['id'])
        .where('user_id', '=', userId)
        .orderBy('created_at', 'desc')
        .executeTakeFirst();

      // Prevent unlinking if this is the only auth method and no password
      if (providerCount <= 1 && !hasPassword) {
        return new ValidationError({
          provider: [
            'Cannot unlink the only authentication method. Please set a password or link another provider first.',
          ],
        });
      }

      // Check if the provider link exists
      const existingLink = await this.db
        .selectFrom('user_auth_providers')
        .select(['id'])
        .where('user_id', '=', userId)
        .where('provider', '=', provider)
        .executeTakeFirst();

      if (!existingLink) {
        return ResponseBuilder.ok(false);
      }

      // Delete the provider link
      const result = await this.db
        .deleteFrom('user_auth_providers')
        .where('user_id', '=', userId)
        .where('provider', '=', provider)
        .execute();

      const success = result.length > 0;

      return ResponseBuilder.ok(success);
    } catch (error) {
      return new DatabaseError('unlinkAuthProvider', error);
    }
  }

  async findUserByAuthProvider(
    provider: AuthProvider,
    providerUserId: string,
  ): AsyncResult<User | null> {
    try {
      // Find the auth provider link
      const authProvider = await this.db
        .selectFrom('user_auth_providers')
        .select(['user_id'])
        .where('provider', '=', provider)
        .where('provider_user_id', '=', providerUserId)
        .executeTakeFirst();

      if (!authProvider) {
        return ResponseBuilder.ok(null);
      }

      // Get the user
      const userResult = await this.db
        .selectFrom('users')
        .selectAll()
        .where('id', '=', authProvider.user_id)
        .where('deleted_at', 'is', null)
        .executeTakeFirst();

      if (!userResult) {
        return ResponseBuilder.ok(null);
      }

      // Map to User entity
      const user = this.mapToUser(userResult);

      return ResponseBuilder.ok(user);
    } catch (error) {
      return new DatabaseError('findUserByAuthProvider', error);
    }
  }
  async getUserAuthProviders(userId: string): AsyncResult<UserAuthProviderDB[]> {
    try {
      const authProviders = await this.db
        .selectFrom('user_auth_providers')
        .selectAll()
        .where('user_id', '=', userId)
        .orderBy('linked_at', 'desc')
        .execute();

      // Cast the result to any first to avoid TypeScript inference issues
      const providers: UserAuthProviderDB[] = (authProviders as any[]).map((row) => ({
        id: row.id,
        user_id: row.user_id,
        provider: row.provider as AuthProvider,
        provider_user_id: row.provider_user_id,

        // Provider-specific data (already stored as JSON)
        provider_data: row.provider_data || null,

        // Tokens (encrypted)
        access_token: row.access_token || null,
        refresh_token: row.refresh_token || null,
        token_expires_at: row.token_expires_at ? new Date(row.token_expires_at) : null,

        // Tracking
        linked_at: new Date(row.linked_at),
        last_used_at: row.last_used_at ? new Date(row.last_used_at) : null,
        is_primary: Boolean(row.is_primary),
      }));

      return ResponseBuilder.ok(providers);
    } catch (error) {
      return new DatabaseError('getUserAuthProviders', error);
    }
  }

  async trackFailedLogin(email: string, ipAddress?: string, reason?: string): AsyncResult<boolean> {
    try {
      // 1. Find user by email
      const user = await this.db
        .selectFrom('users')
        .select(['id'])
        .where('email', '=', email.toLowerCase())
        .where('deleted_at', 'is', null)
        .executeTakeFirst();

      if (!user) {
        // Don't reveal if user exists - still return success
        // You might want to log this attempt somewhere else for security monitoring
        return ResponseBuilder.ok(true);
      }

      // 2. Get or create security record - select all columns we need
      let securityRecord = await this.db
        .selectFrom('user_security')
        .selectAll() // Select all columns to have access to last_login_ip
        .where('user_id', '=', user.id)
        .executeTakeFirst();

      const now = new Date();

      if (!securityRecord) {
        // Create new security record with first failed attempt
        await this.db
          .insertInto('user_security')
          .values({
            user_id: user.id,
            failed_login_attempts: 1,
            locked_until: null,
            last_login_at: null,
            last_login_ip: ipAddress || null,
            two_factor_enabled: false,
            two_factor_secret_id: null,
            last_password_change_at: null,
            password_history: sql`'[]'`,
            security_questions: sql`'[]'`,
            created_at: now,
            updated_at: now,
          })
          .execute();

        return ResponseBuilder.ok(true);
      }

      // 3. Increment failed attempts
      const newFailedAttempts = (securityRecord.failed_login_attempts || 0) + 1;

      // 4. Determine if account should be locked
      let lockUntil = null;
      if (newFailedAttempts >= 5) {
        // Lock account for 30 minutes after 5 failed attempts
        lockUntil = new Date(now.getTime() + 30 * 60 * 1000);
      } else if (newFailedAttempts >= 10) {
        // Lock account for 1 hour after 10 failed attempts
        lockUntil = new Date(now.getTime() + 60 * 60 * 1000);
      } else if (newFailedAttempts >= 15) {
        // Lock account for 24 hours after 15 failed attempts
        lockUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      }

      // 5. Update security record
      await this.db
        .updateTable('user_security')
        .set({
          failed_login_attempts: newFailedAttempts,
          locked_until: lockUntil,
          last_login_ip: ipAddress || securityRecord.last_login_ip,
          updated_at: now,
        })
        .where('user_id', '=', user.id)
        .execute();

      return ResponseBuilder.ok(true);
    } catch (error) {
      return new DatabaseError('trackFailedLogin', error);
    }
  }

  async isAccountLocked(email: string): AsyncResult<{ locked: boolean; until?: Date }> {
    try {
      // 1. Find user by email
      const user = await this.db
        .selectFrom('users')
        .select(['id'])
        .where('email', '=', email.toLowerCase())
        .where('deleted_at', 'is', null)
        .executeTakeFirst();

      if (!user) {
        // Return not locked for non-existent users to prevent email enumeration
        return ResponseBuilder.ok({ locked: false });
      }

      // 2. Get security record
      const securityRecord = await this.db
        .selectFrom('user_security')
        .select(['locked_until'])
        .where('user_id', '=', user.id)
        .executeTakeFirst();

      if (!securityRecord || !securityRecord.locked_until) {
        // No security record or no lock set
        return ResponseBuilder.ok({ locked: false });
      }

      const now = new Date();
      const lockUntil = new Date(securityRecord.locked_until);

      // 3. Check if lock has expired
      if (lockUntil <= now) {
        // Lock has expired
        return ResponseBuilder.ok({ locked: false });
      }

      // Account is locked
      return ResponseBuilder.ok({
        locked: true,
        until: lockUntil,
      });
    } catch (error) {
      return new DatabaseError('isAccountLocked', error);
    }
  }

  async lockAccount(
    userId: string,
    reason: string,
    until?: Date,
    lockedBy?: string,
  ): AsyncResult<boolean> {
    try {
      // Default lock duration is 30 minutes if not specified
      const lockUntil = until || new Date(Date.now() + 30 * 60 * 1000);

      // Check if user exists
      const user = await this.db
        .selectFrom('users')
        .select(['id', 'status'])
        .where('id', '=', userId)
        .where('deleted_at', 'is', null)
        .executeTakeFirst();

      if (!user) {
        return new NotFoundError('User not found');
      }

      // Check if user_security record exists
      const securityRecord = await this.db
        .selectFrom('user_security')
        .select(['user_id'])
        .where('user_id', '=', userId)
        .executeTakeFirst();

      if (securityRecord) {
        // Update existing security record
        const result = await this.db
          .updateTable('user_security')
          .set({
            locked_until: lockUntil,
            updated_at: new Date(),
          })
          .where('user_id', '=', userId)
          .execute();

        const success = result.length > 0;
        return ResponseBuilder.ok(success);
      } else {
        // Create new security record with lock
        await this.db
          .insertInto('user_security')
          .values({
            user_id: userId,
            failed_login_attempts: 0,
            locked_until: lockUntil,
            last_login_at: null,
            last_login_ip: null,
            two_factor_enabled: false,
            two_factor_secret_id: null,
            last_password_change_at: null,
            password_history: sql`'[]'`,
            security_questions: sql`'[]'`,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .execute();

        return ResponseBuilder.ok(true);
      }

      // Optionally, you could also:
      // 1. Revoke all active sessions for this user
      // 2. Add audit log entry with reason and lockedBy
      // 3. Send notification to user about account lock
    } catch (error) {
      return new DatabaseError('lockAccount', error);
    }
  }

  async unlockAccount(userId: string, unlockedBy?: string): AsyncResult<boolean> {
    try {
      // Check if user_security record exists
      const securityRecord = await this.db
        .selectFrom('user_security')
        .select(['user_id', 'locked_until'])
        .where('user_id', '=', userId)
        .executeTakeFirst();

      if (!securityRecord) {
        // No security record means account is not locked
        return ResponseBuilder.ok(false);
      }

      // Check if account is actually locked
      if (!securityRecord.locked_until || new Date(securityRecord.locked_until) <= new Date()) {
        // Account is not locked or lock has already expired
        return ResponseBuilder.ok(false);
      }

      // Unlock the account
      const result = await this.db
        .updateTable('user_security')
        .set({
          locked_until: null,
          failed_login_attempts: 0, // Reset failed attempts
          updated_at: new Date(),
        })
        .where('user_id', '=', userId)
        .execute();

      // Check if update was successful
      const success = result.length > 0;

      return ResponseBuilder.ok(success);
    } catch (error) {
      return new DatabaseError('unlockAccount', error);
    }
  }

  async getUserAuthActivity(
    userId: string,
    limit?: number,
  ): AsyncResult<{
    recentLogins: Array<{ timestamp: Date; ip: string; device: string }>;
    activeSessions: number;
    failedAttempts: number;
  }> {
    try {
      // 1. Get recent login sessions (successful logins)
      const recentLoginsQuery = this.db
        .selectFrom('sessions')
        .select(['created_at', 'ip_address', 'device_name', 'device_type', 'user_agent'])
        .where('user_id', '=', userId)
        .orderBy('created_at', 'desc');

      // Apply limit if provided, default to 10
      const recentSessionsLimit = limit || 10;
      const recentSessions = await recentLoginsQuery.limit(recentSessionsLimit).execute();

      // Map to the expected format
      const recentLogins = recentSessions.map((session) => ({
        timestamp: new Date(session.created_at),
        ip: session.ip_address || 'Unknown',
        device: session.device_name || session.device_type || 'Unknown Device',
      }));

      // 2. Count active sessions (not revoked and not expired)
      const now = new Date();
      const activeSessionCount = await this.db
        .selectFrom('sessions')
        .select((eb) => eb.fn.count<string>('id').as('count'))
        .where('user_id', '=', userId)
        .where('revoked_at', 'is', null)
        .where('expires_at', '>', now)
        .executeTakeFirst();

      const activeSessions = Number(activeSessionCount?.count || 0);

      // 3. Get failed login attempts from user_security
      const securityInfo = await this.db
        .selectFrom('user_security')
        .select(['failed_login_attempts'])
        .where('user_id', '=', userId)
        .executeTakeFirst();

      const failedAttempts = securityInfo?.failed_login_attempts || 0;

      return ResponseBuilder.ok({
        recentLogins,
        activeSessions,
        failedAttempts,
      });
    } catch (error) {
      return new DatabaseError('getUserAuthActivity', error);
    }
  }

  private mapToSession(row: any): Session {
    return {
      id: row.id,
      userId: row.user_id,
      tokenHash: row.token_hash,
      refreshTokenHash: row.refresh_token_hash,

      deviceId: row.device_id,
      deviceName: row.device_name,
      deviceType: row.device_type,
      userAgent: row.user_agent,
      ipAddress: row.ip_address,

      expiresAt: row.expires_at,
      refreshExpiresAt: row.refresh_expires_at,
      idleTimeoutAt: row.idle_timeout_at,
      absoluteTimeoutAt: row.absolute_timeout_at,

      lastActivityAt: row.last_activity_at,

      // Security fields
      isMfaVerified: Boolean(row.is_mfa_verified),
      securityStamp: row.security_stamp,

      // Computed field
      isActive: !row.revoked_at,

      revokedAt: row.revoked_at,
      revokedBy: row.revoked_by,
      revokeReason: row.revoke_reason,

      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
  private mapToPasswordResetToken(row: any): PasswordResetToken {
    return {
      id: row.id,
      userId: row.user_id,
      tokenHash: row.token_hash,
      expiresAt: row.expires_at,
      usedAt: row.used_at,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapToUser(dbUser: any): User {
    return {
      id: dbUser.id,
      firstName: dbUser.first_name,
      lastName: dbUser.last_name,
      displayName: dbUser.display_name,
      username: dbUser.username,
      email: dbUser.email,
      emailVerified: dbUser.email_verified,
      emailVerifiedAt: dbUser.email_verified_at,
      phone: dbUser.phone,
      phoneVerified: dbUser.phone_verified,
      phoneVerifiedAt: dbUser.phone_verified_at,
      status: dbUser.status,
      type: dbUser.type,
      organizationId: dbUser.organization_id,
      avatarUrl: dbUser.avatar_url,
      title: dbUser.title,
      department: dbUser.department,
      employeeId: dbUser.employee_id,
      timezone: dbUser.timezone,
      locale: dbUser.locale,
      locationId: dbUser.location_id,
      emergencyContact: dbUser.emergency_contact,
      preferences: dbUser.preferences,
      cachedPermissions: dbUser.cached_permissions,
      permissionsUpdatedAt: dbUser.permissions_updated_at,
      lastActivityAt: dbUser.last_activity_at,
      totalLoginCount: dbUser.total_login_count,
      customFields: dbUser.custom_fields,
      tags: dbUser.tags,
      deactivatedReason: dbUser.deactivated_reason,
      createdAt: dbUser.created_at,
      updatedAt: dbUser.updated_at,
      deletedAt: dbUser.deleted_at,
      deletedBy: dbUser.deleted_by,
    };
  }

  private mapToEmailVerificationToken(row: any): EmailVerificationToken {
    return {
      id: row.id,
      userId: row.user_id,
      email: row.email,
      tokenHash: row.token_hash,
      expiresAt: row.expires_at,
      verifiedAt: row.verified_at, // Changed from usedAt
      createdAt: row.created_at,
      updatedAt: row.created_at, // Use created_at since updated_at doesn't exist in DB
    };
  }

  private mapToApiKey(row: any): ApiKey {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      keyHash: row.key_hash,
      keyPrefix: row.key_prefix,

      organizationId: row.organization_id,

      scopes: row.scopes || [], // JSON array
      allowedIps: row.allowed_ips || null, // JSON array or null
      allowedOrigins: row.allowed_origins || null, // JSON array or null

      rateLimitPerHour: row.rate_limit_per_hour,

      expiresAt: row.expires_at ? new Date(row.expires_at) : null,
      lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : null,
      lastUsedIp: row.last_used_ip,
      usageCount: Number(row.usage_count) || 0,

      isActive: Boolean(row.is_active),
      revokedAt: row.revoked_at ? new Date(row.revoked_at) : null,
      revokedBy: row.revoked_by || null, // Now included in the schema
      revokedReason: row.revoke_reason,

      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
