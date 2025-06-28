import { AsyncResult } from '../../shared/response';
import {
  ApiKey,
  AuthProvider,
  AuthTokens,
  ChangePasswordRequest,
  EmailVerificationToken,
  ForgotPasswordRequest,
  LoginRequest,
  LoginResponse,
  PasswordResetToken,
  RefreshTokenRequest,
  ResetPasswordRequest,
  Session,
  TwoFactorSecretDB,
  User,
  UserAuthProviderDB,
  VerifyEmailRequest,
} from '../entities';

export interface ISession {
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

export interface IToken {
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

export interface IAuth {
  login(request: LoginRequest, ipAddress?: string, userAgent?: string): AsyncResult<LoginResponse>;

  loginWithProvider(
    provider: AuthProvider,
    providerUserId: string,
    providerData: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ): AsyncResult<LoginResponse>;
  logout(sessionId: string, logoutAll?: boolean): AsyncResult<boolean>;
  refreshToken(request: RefreshTokenRequest): AsyncResult<AuthTokens>;
  validateAccessToken(token: string): AsyncResult<{ user: User; session: Session }>;

  validateApiKey(
    key: string,
    requiredScopes?: string[],
  ): AsyncResult<{ user: User; apiKey: ApiKey }>;

  changePassword(
    userId: string,
    request: ChangePasswordRequest,
    sessionId?: string,
  ): AsyncResult<boolean>;
  forgotPassword(
    request: ForgotPasswordRequest,
    ipAddress?: string,
  ): AsyncResult<{ success: boolean; email: string }>;
  resetPassword(request: ResetPasswordRequest, ipAddress?: string): AsyncResult<boolean>;
  requirePasswordChange(userId: string): AsyncResult<boolean>;
  sendVerificationEmail(userId: string, email?: string): AsyncResult<boolean>;
  verifyEmail(request: VerifyEmailRequest): AsyncResult<boolean>;
  resendVerificationEmail(email: string): AsyncResult<boolean>;
  generateTwoFactorSecret(userId: string): AsyncResult<{
    secret: string;
    qrCode: string;
    backupCodes: string[];
  }>;
  enableTwoFactor(
    userId: string,
    totpCode: string,
    sessionId?: string,
  ): AsyncResult<{ backupCodes: string[] }>;

  disableTwoFactor(userId: string, password?: string, adminId?: string): AsyncResult<boolean>;
  verifyTwoFactor(userId: string, code: string, sessionId?: string): AsyncResult<boolean>;

  isTwoFactorEnabled(userId: string): AsyncResult<boolean>;
  linkAuthProvider(
    userId: string,
    provider: AuthProvider,
    providerUserId: string,
    providerData?: Record<string, any>,
  ): AsyncResult<boolean>;

  unlinkAuthProvider(userId: string, provider: AuthProvider): AsyncResult<boolean>;

  findUserByAuthProvider(provider: AuthProvider, providerUserId: string): AsyncResult<User | null>;
  getUserAuthProviders(userId: string): AsyncResult<UserAuthProviderDB[]>;

  trackFailedLogin(email: string, ipAddress?: string, reason?: string): AsyncResult<boolean>;

  isAccountLocked(email: string): AsyncResult<{ locked: boolean; until?: Date }>;

  lockAccount(
    userId: string,
    reason: string,
    until?: Date,
    lockedBy?: string,
  ): AsyncResult<boolean>;

  unlockAccount(userId: string, unlockedBy?: string): AsyncResult<boolean>;

  getUserAuthActivity(
    userId: string,
    limit?: number,
  ): AsyncResult<{
    recentLogins: Array<{ timestamp: Date; ip: string; device: string }>;
    activeSessions: number;
    failedAttempts: number;
  }>;
}
