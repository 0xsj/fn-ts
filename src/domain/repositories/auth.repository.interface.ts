import { AsyncResult } from '../../shared/response';
import {
  ApiKey,
  AuthTokens,
  EmailVerificationToken,
  LoginRequest,
  LoginResponse,
  PasswordResetToken,
  RefreshTokenRequest,
  Session,
  TwoFactorSecretDB,
  User,
} from '../entities';

export interface ISessionRepository {
  // Session CRUD
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
    expiresIn?: number, // seconds
  ): AsyncResult<Session>;

  findSessionById(id: string): AsyncResult<Session | null>;
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

  // Session management
  extendSession(id: string, extendBy: number): AsyncResult<boolean>;
  revokeSession(id: string, revokedBy?: string, reason?: string): AsyncResult<boolean>;
  revokeAllUserSessions(userId: string, exceptSessionId?: string): AsyncResult<number>;
  revokeExpiredSessions(): AsyncResult<number>;

  // Activity tracking
  updateLastActivity(id: string): AsyncResult<boolean>;

  // Cleanup
  deleteInactiveSessions(beforeDate: Date): AsyncResult<number>;
  deleteRevokedSessions(beforeDate: Date): AsyncResult<number>;
}

export interface ITokenRepository {
  createPasswordResetToken(
    userId: string,
    tokenHash: string,
    expiresIn?: number,
    ipAddress?: string,
    userAgent?: string,
  ): AsyncResult<PasswordResetToken>;
  findPasswordResetToken(tokenHash: string): AsyncResult<PasswordResetToken | null>;
  findActivePasswordResetTokensByUserId(userId: string): AsyncResult<PasswordResetToken[]>;

  markPasswordResetTokenAsUsed(tokenHash: string): AsyncResult<boolean>;
  revokePasswordResetToken(tokenHash: string): AsyncResult<boolean>;
  revokeAllUserPasswordResetTokens(userId: string): AsyncResult<number>;
  deleteExpiredPasswordResetTokens(): AsyncResult<number>;
  createEmailVerificationToken(
    userId: string,
    email: string,
    tokenHash: string,
    expiresIn?: number, // seconds, default 24 hours
  ): AsyncResult<EmailVerificationToken>;
  findEmailVerificationToken(tokenHash: string): AsyncResult<EmailVerificationToken | null>;
  findActiveEmailVerificationToken(
    userId: string,
    email: string,
  ): AsyncResult<EmailVerificationToken | null>;

  markEmailVerificationTokenAsUsed(tokenHash: string): AsyncResult<boolean>;
  revokeEmailVerificationToken(tokenHash: string): AsyncResult<boolean>;
  revokeAllUserEmailVerificationTokens(userId: string): AsyncResult<number>;

  deleteExpiredEmailVerificationTokens(): AsyncResult<number>;

  createApiKey(input: {
    userId: string;
    name: string;
    keyHash: string;
    keyHint: string;
    scopes: string[];
    allowedIps?: string[];
    allowedOrigins?: string[];
    expiresAt?: Date;
  }): AsyncResult<ApiKey>;

  findApiKeyByHash(keyHash: string): AsyncResult<ApiKey | null>;
  findApiKeysByUserId(userId: string, includeRevoked?: boolean): AsyncResult<ApiKey[]>;

  updateApiKeyLastUsed(keyHash: string, ipAddress?: string): AsyncResult<boolean>;
  revokeApiKey(id: string, revokedBy: string, reason?: string): AsyncResult<boolean>;

  deleteExpiredApiKeys(): AsyncResult<number>;

  storeTwoFactorSecret(
    userId: string,
    encryptedSecret: string,
    backupCodes: string[], // hashed
  ): AsyncResult<TwoFactorSecretDB>;

  findTwoFactorSecret(userId: string): AsyncResult<TwoFactorSecretDB | null>;
  verifyBackupCode(userId: string, codeHash: string): AsyncResult<boolean>;
  markBackupCodeAsUsed(userId: string, codeHash: string): AsyncResult<boolean>;
  regenerateBackupCodes(userId: string, newCodes: string[]): AsyncResult<boolean>;

  deleteTwoFactorSecret(userId: string): AsyncResult<boolean>;
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
