import { AsyncResult } from "../../shared/response";
import { AuthTokens, LoginRequest, LoginResponse, RefreshTokenRequest, Session, User } from "../entities";

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
        expiresIn?: number
    ): AsyncResult<Session>;
    findSessionById(): AsyncResult<Session | null>;
    findSessionByTokenHash(): AsyncResult<Session | null>;
    findSessionByRefreshTokenHash
    findActiveSessionsByUserId
    findActiveSessionsByDeviceId
    updateSession
    extendSession
    revokeSession
    revokeAllUserSessions
    revokeExpiredSessions
    updateLastActivity
    deleteInactiveSessions
    deleteRevokedSessions

}

export interface ITokenRepository {
    createPasswordResetToken
    findPasswordResetToken
    findActivePasswordResetTokensByUserId
    markPasswordResetTokenAsUsed
    revokePasswordResetToken
    revokeAllUserPasswordResetTokens
    deleteExpiredPasswordResetTokens
    createEmailVerificationToken
    findEmailVerificationToken
    findActiveEmailVerificationToken
    markEmailVerificationTokenAsUsed
    revokeEmailVerificationToken
    revokeAllUserEmailVerificationTokens
    deleteExpiredEmailVerificationTokens
    createApiKey
    findApiKeyByHash
    findApiKeysByUserId
    updateApiKeyLastUsed
    revokeApiKey
    deleteExpiredApiKeys
    storeTwoFactorSecret
    findTwoFactorSecret
    verifyBackupCode
    markBackupCodeAsUsed
    regenerateBackupCodes
    deleteTwoFactorSecret

}

export interface IAuthRepository {
    login(request: LoginRequest, ipAddress?: string, userAgent?: string): AsyncResult<LoginResponse>;
    loginWithProvider
    logout(sessionId: string, logoutAl?: boolean): AsyncResult<boolean>;
    refreshToken(request: RefreshTokenRequest): AsyncResult<AuthTokens>;
    validateAccessToken(token: string): AsyncResult<User>;
    validateApiKey
    changePassword
    forgotPassword
    resetPassword
    requirePasswordChange
    sendVerificationEmail
    verifyEmail
    resendVerificationEmail
    generateTwoFactorSecret
    enableTwoFactor
    disableTwoFactor
    verifyTwoFactor
    isTwoFactorEnabled
    linkAuthProvider
    unlinkAuthProvider
    findUserByAuthProvider
    getUserAuthProviders
    trackFailedLogin
    isAccountLocked
    lockAccount
    unlockAccount
    getUserAuthActivity
}
