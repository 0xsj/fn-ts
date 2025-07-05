import { inject, injectable } from 'tsyringe';
import { TOKENS } from '../../core/di/tokens';
import { IAuth, ISession, IToken } from '../interface/auth.interface';
import {
  AsyncResult,
  isSuccessResponse,
  NotFoundError,
  ResponseBuilder,
  ValidationError,
} from '../../shared/response';
import {
  AuthTokens,
  ChangePasswordRequest,
  LoginRequest,
  LoginResponse,
  Session,
  User,
} from '../entities';
import { ILogger, logger, validators } from '../../shared/utils';
import { AuditWithContext } from '../../shared/decorators/audit.decorator';
import { AuditContext } from './analytics.service';
import { EmailService } from '../../infrastructure/integrations/email/email.service';
import { QueueManager } from '../../infrastructure/queue/queue.manager';
import {
  InjectAuthRepository,
  InjectEmailService,
  InjectEventBus,
  InjectLogger,
  InjectQueueManager,
} from '../../core/di/decorators/inject.decorator';
import { EventBus } from '../../infrastructure/events/event-bus';
import { Injectable } from '../../core/di/decorators/injectable.decorator';

@Injectable()
export class AuthService {
  constructor(
    @InjectAuthRepository() private authRepo: IAuth,
    @InjectAuthRepository() private sessionRepo: ISession,
    @InjectAuthRepository() private tokenRepo: IToken,
    @InjectEmailService() private emailService: EmailService,
    @InjectQueueManager() private queueManager: QueueManager,
    @InjectEventBus() private eventBus: EventBus,
    @InjectLogger() private logger: ILogger,
  ) {
    this.logger.info('AuthService initialized');
  }

  async getSession(sessionId: string): AsyncResult<Session> {
    if (!validators.isValidUUID(sessionId)) {
      return new ValidationError({ sessionId: ['Invalid session ID format'] }, undefined);
    }

    const result = await this.sessionRepo.findSessionById(sessionId);
    if (!result.success) {
      return result;
    }

    const session = result.body().data;
    if (!session) {
      return new NotFoundError('Session not found');
    }

    // Business validation errors
    if (this.isSessionExpired(session)) {
      return new ValidationError({ session: ['Session has expired'] });
    }

    if (!session.isActive) {
      return new ValidationError({ session: ['Session has been revoked'] });
    }

    return ResponseBuilder.ok(session);
  }

  @AuditWithContext('login', 'auth', {
    entityIdResolver: (args) => {
      const request = args[0] as LoginRequest;
      return request?.email || 'unknown';
    },
    contextResolver: (instance, args) => args[1] || {}, // context is 2nd argument
  })
  async login(request: LoginRequest, context?: AuditContext): AsyncResult<LoginResponse> {
    // Validate login request
    const validationErrors: Record<string, string[]> = {};
    if (!request.email || !validators.isValidEmail(request.email)) {
      validationErrors.email = ['Invalid email format'];
    }
    if (!request.password || request.password.length < 8) {
      validationErrors.password = ['Password must be at least 8 characters'];
    }
    if (request.deviceType && !['web', 'mobile', 'desktop'].includes(request.deviceType)) {
      validationErrors.deviceType = ['Invalid device type'];
    }

    if (Object.keys(validationErrors).length > 0) {
      return new ValidationError(validationErrors);
    }

    // Sanitize inputs
    const sanitizedRequest: LoginRequest = {
      ...request,
      email: request.email.toLowerCase().trim(),
      deviceId: request.deviceId?.trim(),
      deviceName: request.deviceName?.trim(),
    };

    // Delegate to repository with IP and user agent from context
    const loginResult = await this.authRepo.login(
      sanitizedRequest,
      context?.ipAddress,
      context?.userAgent,
    );

    if (!isSuccessResponse(loginResult)) {
      return loginResult;
    }

    const loginResponse = loginResult.body().data;

    // Optional: Emit login event
    // await this.eventBus.emit(
    //   new UserLoggedInEvent({
    //     userId: loginResponse.user.id,
    //     sessionId: loginResponse.session.id,
    //     ipAddress: context?.ipAddress,
    //     userAgent: context?.userAgent,
    //     timestamp: new Date(),
    //   })
    // );

    return ResponseBuilder.ok(loginResponse);
  }

  @AuditWithContext('logout', 'auth', {
    entityIdResolver: (args) => args[0], // sessionId
    contextResolver: (instance, args) => args[2] || {}, // context is 3rd argument
  })
  async logout(
    sessionId: string,
    logoutAll: boolean = false,
    context?: AuditContext,
  ): AsyncResult<boolean> {
    if (!validators.isValidUUID(sessionId)) {
      return new ValidationError({ sessionId: ['Invalid session ID format'] });
    }

    // Verify session exists and belongs to the user
    const sessionResult = await this.getSession(sessionId);
    if (!isSuccessResponse(sessionResult)) {
      return sessionResult;
    }

    const session = sessionResult.body().data;

    // Delegate to repository
    const result = await this.authRepo.logout(session.id, logoutAll);

    if (!isSuccessResponse(result)) {
      return result;
    }

    // Queue logout email using getEmailQueue() method
    this.queueManager
      .getEmailQueue()
      .sendEmailJob({
        to: { email: 'test@example.com' }, // TODO: Get actual user email
        subject: '👋 You have been logged out',
        template: 'logout-notification',
        data: {
          sessionId: session.id,
          userId: session.userId,
          logoutTime: new Date().toLocaleString(),
          logoutAll,
        },
        correlationId: context?.correlationId,
      })
      .catch((error: Error) => {
        // Fixed: Added explicit type
        logger.error('Failed to queue logout email', {
          sessionId,
          error: error.message || 'Unknown error',
        });
      });

    return ResponseBuilder.ok(true);
  }

  async refreshToken(refreshToken: string): AsyncResult<AuthTokens> {
    if (!refreshToken || refreshToken.length < 32) {
      return new ValidationError({ refreshToken: ['Invalid refresh token'] });
    }

    // Delegate to repository
    const result = await this.authRepo.refreshToken({ refreshToken });

    if (!isSuccessResponse(result)) {
      return result;
    }

    return ResponseBuilder.ok(result.body().data);
  }

  async validateAccessToken(token: string): AsyncResult<{ user: User; session: Session }> {
    if (!token || token.length < 32) {
      return new ValidationError({ token: ['Invalid access token'] });
    }

    // Delegate to repository
    const result = await this.authRepo.validateAccessToken(token);

    if (!isSuccessResponse(result)) {
      return result;
    }

    const { user, session } = result.body().data;

    // Optional: Update last activity
    await this.sessionRepo.updateLastActivity(session.id);

    return ResponseBuilder.ok({ user, session });
  }

  async changePassword(
    userId: string,
    request: ChangePasswordRequest,
    sessionId?: string,
  ): AsyncResult<boolean> {
    // Validate user ID
    if (!validators.isValidUUID(userId)) {
      return new ValidationError({ userId: ['Invalid user ID format'] });
    }

    // Validate passwords match
    if (request.newPassword !== request.confirmPassword) {
      return new ValidationError({ confirmPassword: ['Passwords do not match'] });
    }

    // Validate password strength
    if (!validators.isStrongPassword(request.newPassword)) {
      return new ValidationError({
        newPassword: [
          'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
        ],
      });
    }

    // Delegate to repository
    const result = await this.authRepo.changePassword(userId, request, sessionId);

    if (!isSuccessResponse(result)) {
      return result;
    }

    // Optional: Emit password changed event
    // await this.eventBus.emit(
    //   new PasswordChangedEvent({
    //     userId,
    //     sessionId,
    //     timestamp: new Date(),
    //   })
    // );

    return ResponseBuilder.ok(true);
  }

  // In AuthService

  // In AuthService

  async forgotPassword(
    email: string,
    ipAddress?: string,
  ): AsyncResult<{ success: boolean; email: string }> {
    // Validate email
    if (!email || !validators.isValidEmail(email)) {
      return new ValidationError({ email: ['Invalid email format'] });
    }

    const sanitizedEmail = email.toLowerCase().trim();

    // Delegate to repository
    const result = await this.authRepo.forgotPassword({ email: sanitizedEmail }, ipAddress);

    if (!isSuccessResponse(result)) {
      return result;
    }

    // Email sending would happen here in the service layer
    // But we need to get the user and token from somewhere
    // Since the interface doesn't return the token, you might need to:
    // 1. Query the token table separately, or
    // 2. Use an event system, or
    // 3. Change the interface to return the token

    // For now, just return the result as is
    return result;
  }

  async resetPassword(
    token: string,
    newPassword: string,
    confirmPassword: string,
    ipAddress?: string,
  ): AsyncResult<boolean> {
    // Validate token
    if (!token || token.length < 32) {
      return new ValidationError({ token: ['Invalid reset token'] });
    }

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      return new ValidationError({ confirmPassword: ['Passwords do not match'] });
    }

    // Validate password strength
    if (!validators.isStrongPassword(newPassword)) {
      return new ValidationError({
        newPassword: [
          'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
        ],
      });
    }

    // Delegate to repository
    const result = await this.authRepo.resetPassword(
      { token, newPassword, confirmPassword },
      ipAddress,
    );

    if (!isSuccessResponse(result)) {
      return result;
    }

    return ResponseBuilder.ok(true);
  }

  async verifyEmail(token: string): AsyncResult<boolean> {
    if (!token || token.length < 32) {
      return new ValidationError({ token: ['Invalid verification token'] });
    }

    // Delegate to repository
    const result = await this.authRepo.verifyEmail({ token });

    if (!isSuccessResponse(result)) {
      return result;
    }

    return ResponseBuilder.ok(true);
  }

  async validateSession(sessionId: string): AsyncResult<Session> {
    const sessionResult = await this.getSession(sessionId);

    if (!isSuccessResponse(sessionResult)) {
      return sessionResult;
    }

    const session = sessionResult.body().data;

    // Update last activity
    await this.sessionRepo.updateLastActivity(session.id);

    return ResponseBuilder.ok(session);
  }

  async getActiveSessions(userId: string): AsyncResult<Session[]> {
    if (!validators.isValidUUID(userId)) {
      return new ValidationError({ userId: ['Invalid user ID format'] });
    }

    const result = await this.sessionRepo.findActiveSessionsByUserId(userId);

    if (!isSuccessResponse(result)) {
      return result;
    }

    return ResponseBuilder.ok(result.body().data);
  }

  async revokeSession(sessionId: string, reason?: string): AsyncResult<boolean> {
    if (!validators.isValidUUID(sessionId)) {
      return new ValidationError({ sessionId: ['Invalid session ID format'] });
    }

    const result = await this.sessionRepo.revokeSession(sessionId, undefined, reason);

    if (!isSuccessResponse(result)) {
      return result;
    }

    return ResponseBuilder.ok(true);
  }

  private isSessionExpired(session: Session): boolean {
    return session.expiresAt < new Date();
  }
}
