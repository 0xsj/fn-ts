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

const logRevocation = (method: string, sessionId: string, reason: string) => {
  console.log(
    `[SESSION REVOKED] Method: ${method}, Session: ${sessionId}, Reason: ${reason}, Stack:`,
    new Error().stack,
  );
};

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
      console.log(
        `[REVOKE SESSION CALLED] Session: ${id}, RevokedBy: ${revokedBy}, Reason: ${reason}`,
      );
      console.log(`[REVOKE SESSION] Stack trace:`, new Error().stack);

      const now = new Date();

      // First check if the session exists and is not already revoked
      const existingSession = await this.db
        .selectFrom('sessions')
        .select(['id', 'revoked_at'])
        .where('id', '=', id)
        .where('revoked_at', 'is', null)
        .executeTakeFirst();

      console.log(`[REVOKE SESSION] Existing session check:`, existingSession);

      if (!existingSession) {
        console.log(`[REVOKE SESSION] Session not found or already revoked`);
        return ResponseBuilder.ok(false);
      }

      // Now perform the update
      console.log(`[REVOKE SESSION] Updating session to revoked state`);

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

      console.log(`[REVOKE SESSION] Update result:`, result);
      console.log(`[REVOKE SESSION] Successfully revoked session: ${id}`);

      return ResponseBuilder.ok(true);
    } catch (error) {
      console.error(`[REVOKE SESSION ERROR]`, error);
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
      console.log(`[UPDATE LAST ACTIVITY] Called for session: ${id}`);

      const now = new Date();

      // First check if session exists and is not revoked
      const session = await this.db
        .selectFrom('sessions')
        .select(['id', 'revoked_at'])
        .where('id', '=', id)
        .where('revoked_at', 'is', null)
        .executeTakeFirst();

      console.log(`[UPDATE LAST ACTIVITY] Session check:`, session);

      if (!session) {
        console.log(`[UPDATE LAST ACTIVITY] Session not found or revoked`);
        return ResponseBuilder.ok(false);
      }

      // Now update the session
      console.log(`[UPDATE LAST ACTIVITY] Updating last_activity_at to:`, now);

      const result = await this.db
        .updateTable('sessions')
        .set({
          last_activity_at: now,
          updated_at: now,
        })
        .where('id', '=', id)
        .execute();

      console.log(`[UPDATE LAST ACTIVITY] Update result:`, result);

      return ResponseBuilder.ok(true);
    } catch (error) {
      console.error(`[UPDATE LAST ACTIVITY ERROR]`, error);
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
      console.log(`[LOGOUT CALLED] SessionId: ${sessionId}, LogoutAll: ${logoutAll}`);

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

        console.log(`[LOGOUT] Revoking all sessions for user: ${session.user_id}`);

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
        console.log(`[LOGOUT] Attempting to revoke single session: ${sessionId}`);
        console.log(`[LOGOUT] Stack trace:`, new Error().stack);

        // Revoke only the specific session
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

        console.log(`[LOGOUT] Raw update result:`, result);

        // Fix: Use numUpdatedRows instead of affectedRows
        const affectedRows = Number((result as any)[0]?.numUpdatedRows || 0n);
        console.log(`[LOGOUT] Affected rows: ${affectedRows}`);

        if (affectedRows === 0) {
          return new NotFoundError('Session not found or already revoked');
        }

        console.log(`[LOGOUT] Successfully revoked session: ${sessionId}`);
      }

      return ResponseBuilder.ok(true);
    } catch (error) {
      console.error(`[LOGOUT ERROR]`, error);
      return new DatabaseError('logout', error);
    }
  }

  async refreshToken(request: RefreshTokenRequest): AsyncResult<AuthTokens> {
    try {
      console.log(`[REFRESH TOKEN CALLED] Token: ${request.refreshToken.substring(0, 8)}...`);
      console.log(`[REFRESH TOKEN] Stack trace:`, new Error().stack);

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
        console.log(`[REFRESH TOKEN] No session found for token hash`);
        return new UnauthorizedError('Invalid refresh token');
      }

      console.log(`[REFRESH TOKEN] Found session: ${session.id}`);

      // Check if refresh token has expired
      if (session.refresh_expires_at && new Date(session.refresh_expires_at) < new Date()) {
        console.log(`[REFRESH TOKEN] Refresh token expired, revoking session: ${session.id}`);

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
        console.log(`[REFRESH TOKEN] Session absolute timeout, revoking session: ${session.id}`);

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

      console.log(`[REFRESH TOKEN] Generating new tokens for session: ${session.id}`);

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

      console.log(`[REFRESH TOKEN] Successfully updated session with new tokens`);

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
      console.error(`[REFRESH TOKEN ERROR]`, error);
      return new DatabaseError('refreshToken', error);
    }
  }

  // async validateAccessToken(token: string): AsyncResult<{ user: User; session: Session }> {
  //   try {
  //     // Hash the provided token
  //     const crypto = await import('crypto');
  //     const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  //     // Find session by token hash
  //     const sessionResult = await this.db
  //       .selectFrom('sessions')
  //       .selectAll()
  //       .where('token_hash', '=', tokenHash)
  //       .where('revoked_at', 'is', null)
  //       .executeTakeFirst();

  //     if (!sessionResult) {
  //       return new UnauthorizedError(undefined, { reason: 'Invalid token' });
  //     }

  //     // Check if session has expired
  //     if (new Date(sessionResult.expires_at) < new Date()) {
  //       // Optionally revoke the expired session
  //       await this.db
  //         .updateTable('sessions')
  //         .set({
  //           revoked_at: new Date(),
  //           revoke_reason: 'Token expired',
  //           updated_at: new Date(),
  //         })
  //         .where('id', '=', sessionResult.id)
  //         .execute();

  //       return new UnauthorizedError(undefined, { reason: 'Token expired' });
  //     }

  //     // Check idle timeout if set
  //     if (sessionResult.idle_timeout_at && new Date(sessionResult.idle_timeout_at) < new Date()) {
  //       await this.db
  //         .updateTable('sessions')
  //         .set({
  //           revoked_at: new Date(),
  //           revoke_reason: 'Session idle timeout',
  //           updated_at: new Date(),
  //         })
  //         .where('id', '=', sessionResult.id)
  //         .execute();

  //       return new UnauthorizedError(undefined, { reason: 'Session timeout' });
  //     }

  //     // Get user data
  //     const userResult = await this.db
  //       .selectFrom('users')
  //       .selectAll()
  //       .where('id', '=', sessionResult.user_id)
  //       .where('deleted_at', 'is', null)
  //       .executeTakeFirst();

  //     if (!userResult) {
  //       return new UnauthorizedError(undefined, { reason: 'User not found' });
  //     }

  //     if (userResult.status !== 'active') {
  //       return new UnauthorizedError(undefined, { reason: 'User account is not active' });
  //     }

  //     // Map database results to domain entities
  //     const session = this.mapToSession(sessionResult);
  //     const user = this.mapToUser(userResult);

  //     return ResponseBuilder.ok({ user, session });
  //   } catch (error) {
  //     return new DatabaseError('validateAccessToken', error);
  //   }
  // }

  async validateAccessToken(token: string): AsyncResult<{ user: User; session: Session }> {
    try {
      console.log(`[VALIDATE ACCESS TOKEN CALLED] Token: ${token.substring(0, 8)}...`);
      console.log(`[VALIDATE ACCESS TOKEN] Stack trace:`, new Error().stack);

      // Hash the provided token
      const crypto = await import('crypto');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      console.log(`[VALIDATE ACCESS TOKEN] Token hash: ${tokenHash.substring(0, 16)}...`);

      // Find session by token hash
      const sessionResult = await this.db
        .selectFrom('sessions')
        .selectAll()
        .where('token_hash', '=', tokenHash)
        .where('revoked_at', 'is', null)
        .executeTakeFirst();

      if (!sessionResult) {
        console.log(`[VALIDATE ACCESS TOKEN] No active session found for token`);
        return new UnauthorizedError(undefined, { reason: 'Invalid token' });
      }

      console.log(`[VALIDATE ACCESS TOKEN] Found session: ${sessionResult.id}`);
      console.log(`[VALIDATE ACCESS TOKEN] Session expires at: ${sessionResult.expires_at}`);
      console.log(`[VALIDATE ACCESS TOKEN] Session revoked at: ${sessionResult.revoked_at}`);

      // Check if session has expired
      const now = new Date();
      const expiresAt = new Date(sessionResult.expires_at);

      console.log(`[VALIDATE ACCESS TOKEN] Current time: ${now.toISOString()}`);
      console.log(`[VALIDATE ACCESS TOKEN] Expires at: ${expiresAt.toISOString()}`);
      console.log(`[VALIDATE ACCESS TOKEN] Is expired: ${expiresAt < now}`);

      if (expiresAt < now) {
        console.log(`[VALIDATE ACCESS TOKEN] Token expired, returning unauthorized`);
        // Don't automatically revoke - just return unauthorized
        // Let a cleanup job handle revocation later
        return new UnauthorizedError(undefined, { reason: 'Token expired' });
      }

      // Check idle timeout if set
      if (sessionResult.idle_timeout_at) {
        const idleTimeout = new Date(sessionResult.idle_timeout_at);
        console.log(`[VALIDATE ACCESS TOKEN] Idle timeout at: ${idleTimeout.toISOString()}`);
        if (idleTimeout < now) {
          console.log(`[VALIDATE ACCESS TOKEN] Session idle timeout reached`);
          // Don't automatically revoke here either
          return new UnauthorizedError(undefined, { reason: 'Session timeout' });
        }
      }

      // Get user data
      console.log(
        `[VALIDATE ACCESS TOKEN] Fetching user data for user_id: ${sessionResult.user_id}`,
      );

      const userResult = await this.db
        .selectFrom('users')
        .selectAll()
        .where('id', '=', sessionResult.user_id)
        .where('deleted_at', 'is', null)
        .executeTakeFirst();

      if (!userResult) {
        console.log(`[VALIDATE ACCESS TOKEN] User not found`);
        return new UnauthorizedError(undefined, { reason: 'User not found' });
      }

      if (userResult.status !== 'active') {
        console.log(`[VALIDATE ACCESS TOKEN] User status is not active: ${userResult.status}`);
        return new UnauthorizedError(undefined, { reason: 'User account is not active' });
      }

      console.log(`[VALIDATE ACCESS TOKEN] Validation successful for user: ${userResult.email}`);

      // Map database results to domain entities
      const session = this.mapToSession(sessionResult);
      const user = this.mapToUser(userResult);

      return ResponseBuilder.ok({ user, session });
    } catch (error) {
      console.error(`[VALIDATE ACCESS TOKEN ERROR]`, error);
      return new DatabaseError('validateAccessToken', error);
    }
  }

  validateApiKey(
    key: string,
    requiredScopes?: string[],
  ): AsyncResult<{ user: User; apiKey: ApiKey }> {
    throw new Error('Method not implemented.');
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
}
