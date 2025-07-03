// src/domain/services/__tests__/auth.service.test.ts
import 'reflect-metadata';
import { AuthService } from '../auth.service';
import { AuthRepository } from '../../../infrastructure/database/repositories/auth.repository';
import { Session } from '../../entities';
import { ResponseBuilder, NotFoundError, DatabaseError } from '../../../shared/response';
import type { IAuth, ISession, IToken } from '../../interface/auth.interface';
import { v4 as uuidv4 } from 'uuid'; // Add this import at the top

describe('AuthService Unit Tests', () => {
  let authService: AuthService;
  let mockAuthRepo: jest.Mocked<IAuth>;
  let mockSessionRepo: jest.Mocked<ISession>;
  let mockTokenRepo: jest.Mocked<IToken>;

  beforeEach(() => {
    // Create mock for IAuth
    mockAuthRepo = {
      login: jest.fn(),
      loginWithProvider: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
      validateAccessToken: jest.fn(),
      validateApiKey: jest.fn(),
      changePassword: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
      requirePasswordChange: jest.fn(),
      sendVerificationEmail: jest.fn(),
      verifyEmail: jest.fn(),
      resendVerificationEmail: jest.fn(),
      generateTwoFactorSecret: jest.fn(),
      enableTwoFactor: jest.fn(),
      disableTwoFactor: jest.fn(),
      verifyTwoFactor: jest.fn(),
      isTwoFactorEnabled: jest.fn(),
      linkAuthProvider: jest.fn(),
      unlinkAuthProvider: jest.fn(),
      findUserByAuthProvider: jest.fn(),
      getUserAuthProviders: jest.fn(),
      trackFailedLogin: jest.fn(),
      isAccountLocked: jest.fn(),
      lockAccount: jest.fn(),
      unlockAccount: jest.fn(),
      getUserAuthActivity: jest.fn(),
    } as jest.Mocked<IAuth>;

    // Create mock for ISession
    mockSessionRepo = {
      createSession: jest.fn(),
      findSessionById: jest.fn(),
      findSessionByTokenHash: jest.fn(),
      findSessionByRefreshTokenHash: jest.fn(),
      findActiveSessionsByUserId: jest.fn(),
      findActiveSessionsByDeviceId: jest.fn(),
      updateSession: jest.fn(),
      extendSession: jest.fn(),
      revokeSession: jest.fn(),
      revokeAllUserSessions: jest.fn(),
      revokeExpiredSessions: jest.fn(),
      updateLastActivity: jest.fn(),
      deleteInactiveSessions: jest.fn(),
      deleteRevokedSessions: jest.fn(),
    } as jest.Mocked<ISession>;

    // Create mock for IToken
    mockTokenRepo = {
      createPasswordResetToken: jest.fn(),
      findPasswordResetToken: jest.fn(),
      findActivePasswordResetTokensByUserId: jest.fn(),
      markPasswordResetTokenAsUsed: jest.fn(),
      revokePasswordResetToken: jest.fn(),
      revokeAllUserPasswordResetTokens: jest.fn(),
      deleteExpiredPasswordResetTokens: jest.fn(),
      createEmailVerificationToken: jest.fn(),
      findEmailVerificationToken: jest.fn(),
      findActiveEmailVerificationToken: jest.fn(),
      markEmailVerificationTokenAsUsed: jest.fn(),
      revokeEmailVerificationToken: jest.fn(),
      revokeAllUserEmailVerificationTokens: jest.fn(),
      deleteExpiredEmailVerificationTokens: jest.fn(),
      createApiKey: jest.fn(),
      findApiKeyByHash: jest.fn(),
      findApiKeysByUserId: jest.fn(),
      updateApiKeyLastUsed: jest.fn(),
      revokeApiKey: jest.fn(),
      deleteExpiredApiKeys: jest.fn(),
      storeTwoFactorSecret: jest.fn(),
      findTwoFactorSecret: jest.fn(),
      verifyBackupCode: jest.fn(),
      markBackupCodeAsUsed: jest.fn(),
      regenerateBackupCodes: jest.fn(),
      deleteTwoFactorSecret: jest.fn(),
    } as jest.Mocked<IToken>;

    // Create service with all three mocked repositories
    authService = new AuthService(mockAuthRepo, mockSessionRepo, mockTokenRepo);
  });

  // In src/domain/services/__tests__/auth.service.test.ts

  // Then update the tests:

  describe('getSession', () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1); // Set to future date

    const mockSession: Session = {
      id: uuidv4(),
      userId: uuidv4(),
      tokenHash: 'token-hash',
      refreshTokenHash: 'refresh-hash',
      deviceId: null,
      deviceName: null,
      deviceType: 'web',
      userAgent: null,
      ipAddress: null,
      expiresAt: futureDate, // Use future date to avoid expiration
      refreshExpiresAt: new Date(futureDate.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days later
      idleTimeoutAt: null,
      absoluteTimeoutAt: null,
      lastActivityAt: new Date(),
      isMfaVerified: false,
      securityStamp: null,
      isActive: true, // Ensure session is active
      revokedAt: null,
      revokedBy: null,
      revokeReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return session when repository finds it', async () => {
      // Arrange
      const sessionId = uuidv4();
      const sessionWithId = { ...mockSession, id: sessionId };
      mockSessionRepo.findSessionById.mockResolvedValueOnce(ResponseBuilder.ok(sessionWithId));

      // Act
      const result = await authService.getSession(sessionId);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.body().data).toEqual(sessionWithId);
      }
      expect(mockSessionRepo.findSessionById).toHaveBeenCalledWith(sessionId);
      expect(mockSessionRepo.findSessionById).toHaveBeenCalledTimes(1);
    });

    it('should return validation error for invalid UUID', async () => {
      // Act
      const result = await authService.getSession('invalid-uuid');

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.body().error.code).toBe('VALIDATION_ERROR');
        expect(result.body().error.details).toEqual({
          sessionId: ['Invalid session ID format'],
        });
      }
      expect(mockSessionRepo.findSessionById).not.toHaveBeenCalled();
    });

    it('should return NotFoundError when session does not exist', async () => {
      // Arrange
      const sessionId = uuidv4();
      mockSessionRepo.findSessionById.mockResolvedValueOnce(ResponseBuilder.ok(null));

      // Act
      const result = await authService.getSession(sessionId);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.body().error.code).toBe('NOT_FOUND');
        expect(result.body().error.message).toBe('Session not found');
      }
    });

    it('should propagate repository errors', async () => {
      // Arrange
      const sessionId = uuidv4();
      const dbError = new DatabaseError('findSessionById', new Error('Connection timeout'));
      mockSessionRepo.findSessionById.mockResolvedValueOnce(dbError);

      // Act
      const result = await authService.getSession(sessionId);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.body().error.code).toBe('DATABASE_ERROR');
      }
    });

    it('should return validation error for expired sessions', async () => {
      // Arrange
      const sessionId = uuidv4();
      const expiredSession: Session = {
        ...mockSession,
        id: sessionId,
        expiresAt: new Date('2020-01-01'), // Past date
        isActive: true,
      };
      mockSessionRepo.findSessionById.mockResolvedValueOnce(ResponseBuilder.ok(expiredSession));

      // Act
      const result = await authService.getSession(sessionId);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.body().error.code).toBe('VALIDATION_ERROR');
        expect(result.body().error.details).toEqual({
          session: ['Session has expired'],
        });
      }
    });

    it('should return validation error for revoked sessions', async () => {
      // Arrange
      const sessionId = uuidv4();
      const revokedSession: Session = {
        ...mockSession,
        id: sessionId,
        isActive: false, // Session is not active
        revokedAt: new Date(),
        revokedBy: 'admin-user',
        revokeReason: 'Security violation',
      };
      mockSessionRepo.findSessionById.mockResolvedValueOnce(ResponseBuilder.ok(revokedSession));

      // Act
      const result = await authService.getSession(sessionId);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.body().error.code).toBe('VALIDATION_ERROR');
        expect(result.body().error.details).toEqual({
          session: ['Session has been revoked'],
        });
      }
    });

    it('should handle sessions that are both expired and revoked', async () => {
      // Arrange
      const sessionId = uuidv4();
      const invalidSession: Session = {
        ...mockSession,
        id: sessionId,
        expiresAt: new Date('2020-01-01'), // Past date
        isActive: false, // Also revoked
      };
      mockSessionRepo.findSessionById.mockResolvedValueOnce(ResponseBuilder.ok(invalidSession));

      // Act
      const result = await authService.getSession(sessionId);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.body().error.code).toBe('VALIDATION_ERROR');
        // It will fail on the first check (expiration)
        expect(result.body().error.details).toEqual({
          session: ['Session has expired'],
        });
      }
    });
  });
});
