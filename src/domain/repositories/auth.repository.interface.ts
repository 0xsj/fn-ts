import { AsyncResult } from '../../shared/response';
import {
  AuthTokens,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  Session,
  User,
} from '../entities';

export interface ISessionRepository {
  createSession(
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
  ): AsyncResult<Session>;
  findSessionById(): AsyncResult<Session | null>;
  findSessionByTokenHash(tokenHash: string): AsyncResult<Session | null>;
  findSessionByRefreshTokenHash(refreshTokenHash: string): AsyncResult<Session | null>;
  findActiveSessionsByUserId(userId: string): AsyncResult<Session[]>;
  findActiveSessionsByDeviceId(userId: string, deviceId: string): AsyncResult<Session | null>;
  updateSession(
    id: string,
    updates: {
      lastActivityAt?: Date;
      refreshTokenHash?: string;
      refreshExpiresAt?: Date;
    },
  ): AsyncResult<Session | null>;
  extendSession(id: string, extendBy: number): AsyncResult<boolean>;
  revokeSession(id: string, revokedBy?: string, reason?: string): AsyncResult<boolean>;
  revokeAllUserSessions(userId: string, exceptSessionId?: string): AsyncResult<number>;
  revokeExpiredSessions(): AsyncResult<number>;
  updateLastActivity(id: string): AsyncResult<boolean>;
  deleteInactiveSessions(beforeDate: Date): AsyncResult<number>;
  deleteRevokedSessions(beforeDate: Date): AsyncResult<number>;
}

export interface ITokenRepository {
  createPasswordResetToken;
  findPasswordResetToken;
  findActivePasswordResetTokensByUserId;
  markPasswordResetTokenAsUsed;
  revokePasswordResetToken;
  revokeAllUserPasswordResetTokens;
  deleteExpiredPasswordResetTokens;
  createEmailVerificationToken;
  findEmailVerificationToken;
  findActiveEmailVerificationToken;
  markEmailVerificationTokenAsUsed;
  revokeEmailVerificationToken;
  revokeAllUserEmailVerificationTokens;
  deleteExpiredEmailVerificationTokens;
  createApiKey;
  findApiKeyByHash;
  findApiKeysByUserId;
  updateApiKeyLastUsed;
  revokeApiKey;
  deleteExpiredApiKeys;
  storeTwoFactorSecret;
  findTwoFactorSecret;
  verifyBackupCode;
  markBackupCodeAsUsed;
  regenerateBackupCodes;
  deleteTwoFactorSecret;
}

export interface IAuthRepository {
  login(request: LoginRequest, ipAddress?: string, userAgent?: string): AsyncResult<LoginResponse>;
  loginWithProvider;
  logout(sessionId: string, logoutAl?: boolean): AsyncResult<boolean>;
  refreshToken(request: RefreshTokenRequest): AsyncResult<AuthTokens>;
  validateAccessToken(token: string): AsyncResult<User>;
  validateApiKey;
  changePassword;
  forgotPassword;
  resetPassword;
  requirePasswordChange;
  sendVerificationEmail;
  verifyEmail;
  resendVerificationEmail;
  generateTwoFactorSecret;
  enableTwoFactor;
  disableTwoFactor;
  verifyTwoFactor;
  isTwoFactorEnabled;
  linkAuthProvider;
  unlinkAuthProvider;
  findUserByAuthProvider;
  getUserAuthProviders;
  trackFailedLogin;
  isAccountLocked;
  lockAccount;
  unlockAccount;
  getUserAuthActivity;
}
