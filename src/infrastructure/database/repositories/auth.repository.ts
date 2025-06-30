import { Kysely } from 'kysely';
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
import { AsyncResult, DatabaseError, ok, ResponseBuilder } from '../../../shared/response';
import { v4 as uuidv4 } from 'uuid';

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
        .select(['id'])
        .where('id', '=', id)
        .where('revoked_at', 'is', null)
        .executeTakeFirst();

      if (!existingSession) {
        return ResponseBuilder.ok(false);
      }

      // Now perform the update
      await this.db
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
        .select(['id'])
        .where('id', '=', id)
        .where('revoked_at', 'is', null)
        .executeTakeFirst();

      if (!session) {
        return ResponseBuilder.ok(false);
      }

      // Now update the session
      await this.db
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

  createPasswordResetToken(
    userId: string,
    tokenHash: string,
    expiresIn?: number,
    ipAddress?: string,
    userAgent?: string,
  ): AsyncResult<PasswordResetToken> {
    throw new Error('Method not implemented.');
  }
  findPasswordResetToken(tokenHash: string): AsyncResult<PasswordResetToken | null> {
    throw new Error('Method not implemented.');
  }
  findActivePasswordResetTokensByUserId(userId: string): AsyncResult<PasswordResetToken[]> {
    throw new Error('Method not implemented.');
  }
  markPasswordResetTokenAsUsed(tokenHash: string): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  revokePasswordResetToken(tokenHash: string): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  revokeAllUserPasswordResetTokens(userId: string): AsyncResult<number> {
    throw new Error('Method not implemented.');
  }
  deleteExpiredPasswordResetTokens(): AsyncResult<number> {
    throw new Error('Method not implemented.');
  }
  createEmailVerificationToken(
    userId: string,
    email: string,
    tokenHash: string,
    expiresIn?: number,
  ): AsyncResult<EmailVerificationToken> {
    throw new Error('Method not implemented.');
  }
  findEmailVerificationToken(tokenHash: string): AsyncResult<EmailVerificationToken | null> {
    throw new Error('Method not implemented.');
  }
  findActiveEmailVerificationToken(
    userId: string,
    email: string,
  ): AsyncResult<EmailVerificationToken | null> {
    throw new Error('Method not implemented.');
  }
  markEmailVerificationTokenAsUsed(tokenHash: string): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  revokeEmailVerificationToken(tokenHash: string): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  revokeAllUserEmailVerificationTokens(userId: string): AsyncResult<number> {
    throw new Error('Method not implemented.');
  }
  deleteExpiredEmailVerificationTokens(): AsyncResult<number> {
    throw new Error('Method not implemented.');
  }
  createApiKey(input: {
    userId: string;
    name: string;
    keyHash: string;
    keyHint: string;
    scopes: string[];
    allowedIps?: string[];
    allowedOrigins?: string[];
    expiresAt?: Date;
  }): AsyncResult<ApiKey> {
    throw new Error('Method not implemented.');
  }
  findApiKeyByHash(keyHash: string): AsyncResult<ApiKey | null> {
    throw new Error('Method not implemented.');
  }
  findApiKeysByUserId(userId: string, includeRevoked?: boolean): AsyncResult<ApiKey[]> {
    throw new Error('Method not implemented.');
  }
  updateApiKeyLastUsed(keyHash: string, ipAddress?: string): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  revokeApiKey(id: string, revokedBy: string, reason?: string): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  deleteExpiredApiKeys(): AsyncResult<number> {
    throw new Error('Method not implemented.');
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
  login(request: LoginRequest, ipAddress?: string, userAgent?: string): AsyncResult<LoginResponse> {
    throw new Error('Method not implemented.');
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
  logout(sessionId: string, logoutAll?: boolean): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  refreshToken(request: RefreshTokenRequest): AsyncResult<AuthTokens> {
    throw new Error('Method not implemented.');
  }
  validateAccessToken(token: string): AsyncResult<{ user: User; session: Session }> {
    throw new Error('Method not implemented.');
  }
  validateApiKey(
    key: string,
    requiredScopes?: string[],
  ): AsyncResult<{ user: User; apiKey: ApiKey }> {
    throw new Error('Method not implemented.');
  }
  changePassword(
    userId: string,
    request: ChangePasswordRequest,
    sessionId?: string,
  ): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  forgotPassword(
    request: ForgotPasswordRequest,
    ipAddress?: string,
  ): AsyncResult<{ success: boolean; email: string }> {
    throw new Error('Method not implemented.');
  }
  resetPassword(request: ResetPasswordRequest, ipAddress?: string): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  requirePasswordChange(userId: string): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  sendVerificationEmail(userId: string, email?: string): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  verifyEmail(request: VerifyEmailRequest): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  resendVerificationEmail(email: string): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  generateTwoFactorSecret(
    userId: string,
  ): AsyncResult<{ secret: string; qrCode: string; backupCodes: string[] }> {
    throw new Error('Method not implemented.');
  }
  enableTwoFactor(
    userId: string,
    totpCode: string,
    sessionId?: string,
  ): AsyncResult<{ backupCodes: string[] }> {
    throw new Error('Method not implemented.');
  }
  disableTwoFactor(userId: string, password?: string, adminId?: string): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  verifyTwoFactor(userId: string, code: string, sessionId?: string): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  isTwoFactorEnabled(userId: string): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  linkAuthProvider(
    userId: string,
    provider: AuthProvider,
    providerUserId: string,
    providerData?: Record<string, any>,
  ): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  unlinkAuthProvider(userId: string, provider: AuthProvider): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  findUserByAuthProvider(provider: AuthProvider, providerUserId: string): AsyncResult<User | null> {
    throw new Error('Method not implemented.');
  }
  getUserAuthProviders(userId: string): AsyncResult<UserAuthProviderDB[]> {
    throw new Error('Method not implemented.');
  }
  trackFailedLogin(email: string, ipAddress?: string, reason?: string): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  isAccountLocked(email: string): AsyncResult<{ locked: boolean; until?: Date }> {
    throw new Error('Method not implemented.');
  }
  lockAccount(
    userId: string,
    reason: string,
    until?: Date,
    lockedBy?: string,
  ): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  unlockAccount(userId: string, unlockedBy?: string): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  getUserAuthActivity(
    userId: string,
    limit?: number,
  ): AsyncResult<{
    recentLogins: Array<{ timestamp: Date; ip: string; device: string }>;
    activeSessions: number;
    failedAttempts: number;
  }> {
    throw new Error('Method not implemented.');
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
}
