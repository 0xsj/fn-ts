import { inject, injectable } from 'tsyringe';
import { TOKENS } from '../../core/di/tokens';
import { IAuth, ISession, IToken } from '../interface/auth.interface';
import {
  AsyncResult,
  ForbiddenError,
  InternalServerError,
  isSuccessResponse,
  NotFoundError,
  ResponseBuilder,
  SuccessResponse,
  UnauthorizedError,
  ValidationError,
} from '../../shared/response';
import {
  ApiKey,
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
import { Inject, Injectable } from '../../core/di/decorators';
import { EventBus } from '../../infrastructure/events/event-bus';

@Injectable()
export class AuthService {
  constructor(
    @Inject(TOKENS.AuthRepository) private authRepo: IAuth,
    @Inject(TOKENS.AuthRepository) private sessionRepo: ISession,
    @Inject(TOKENS.AuthRepository) private tokenRepo: IToken,
    @Inject(TOKENS.EmailService) private emailService: EmailService,
    @Inject(TOKENS.QueueManager) private queueManager: QueueManager,
    @Inject(TOKENS.EventBus) private eventBus: EventBus,
    @Inject(TOKENS.Logger) private logger: ILogger,
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

  async createApiKey(
    userId: string,
    name: string,
    scopes: string[],
    options?: {
      expiresIn?: number; // days
      allowedIps?: string[];
      allowedOrigins?: string[];
    },
  ): AsyncResult<{ apiKey: ApiKey; plainKey: string }> {
    try {
      // 1. Validate inputs
      if (!validators.isValidUUID(userId)) {
        return new ValidationError({ userId: ['Invalid user ID format'] });
      }

      if (!name || name.trim().length < 3) {
        return new ValidationError({ name: ['API key name must be at least 3 characters'] });
      }

      if (!scopes || scopes.length === 0) {
        return new ValidationError({ scopes: ['At least one scope is required'] });
      }

      // Validate scopes against allowed list
      const allowedScopes = ['read', 'write', 'delete', 'admin', 'user:read', 'user:write']; // Define your scopes
      const invalidScopes = scopes.filter((scope) => !allowedScopes.includes(scope));
      if (invalidScopes.length > 0) {
        return new ValidationError({
          scopes: [`Invalid scopes: ${invalidScopes.join(', ')}`],
        });
      }

      // Validate options
      if (options?.expiresIn && options.expiresIn <= 0) {
        return new ValidationError({ expiresIn: ['Expiration days must be positive'] });
      }

      // Validate IP addresses if provided
      if (options?.allowedIps) {
        const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
        const ipv6Regex = /^([\da-f]{1,4}:){7}[\da-f]{1,4}$/i;

        const invalidIps = options.allowedIps.filter((ip) => {
          // Check if it's a valid IPv4 or IPv6
          if (!ipv4Regex.test(ip) && !ipv6Regex.test(ip)) {
            // Also check for CIDR notation (e.g., 192.168.1.0/24)
            const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
            return !cidrRegex.test(ip);
          }
          return false;
        });

        if (invalidIps.length > 0) {
          return new ValidationError({
            allowedIps: [`Invalid IP addresses: ${invalidIps.join(', ')}`],
          });
        }
      }

      // 2. Check if user exists and is active
      // You might want to inject UserRepository for this check
      // For now, we'll assume the user exists if the API key creation succeeds

      // 3. Check API key limits (optional)
      const existingKeysResult = await this.tokenRepo.findApiKeysByUserId(userId, false);
      if (isSuccessResponse(existingKeysResult)) {
        const activeKeys = existingKeysResult.body().data;
        const MAX_API_KEYS_PER_USER = 10; // Configure this

        if (activeKeys.length >= MAX_API_KEYS_PER_USER) {
          return new ValidationError({
            apiKey: [`Maximum number of API keys (${MAX_API_KEYS_PER_USER}) reached`],
          });
        }
      }

      // 4. Generate secure API key
      const crypto = await import('crypto');

      // Generate a 32-byte random key
      const keyBytes = crypto.randomBytes(32);
      const plainKey = keyBytes.toString('base64url'); // URL-safe base64

      // Create key prefix (hint) - first 8 characters
      const keyPrefix = plainKey.substring(0, 8);

      // Hash the key for storage
      const keyHash = crypto.createHash('sha256').update(plainKey).digest('hex');

      // 5. Calculate expiration
      let expiresAt: Date | undefined;
      if (options?.expiresIn) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + options.expiresIn);
      }

      // 6. Create API key in database
      const createResult = await this.tokenRepo.createApiKey({
        userId,
        name: name.trim(),
        keyHash,
        keyHint: keyPrefix,
        scopes,
        allowedIps: options?.allowedIps,
        allowedOrigins: options?.allowedOrigins,
        expiresAt,
      });

      if (!isSuccessResponse(createResult)) {
        return createResult;
      }

      const apiKey = createResult.body().data;

      // 7. Log API key creation
      this.logger.info('API key created', {
        userId,
        apiKeyId: apiKey.id,
        name: apiKey.name,
        scopes,
        expiresAt,
      });

      // 8. Emit event (optional)
      // await this.eventBus.emit(
      //   new ApiKeyCreatedEvent({
      //     userId,
      //     apiKeyId: apiKey.id,
      //     name: apiKey.name,
      //     scopes,
      //     createdAt: new Date(),
      //   })
      // );

      // 9. Queue notification email
      this.queueManager
        .getEmailQueue()
        .sendEmailJob({
          to: { email: 'user@example.com' }, // TODO: Get actual user email
          subject: '🔑 New API Key Created',
          template: 'api-key-created',
          data: {
            userId,
            apiKeyName: apiKey.name,
            apiKeyPrefix: keyPrefix,
            scopes: scopes.join(', '),
            expiresAt: expiresAt?.toLocaleDateString(),
            createdAt: new Date().toLocaleString(),
          },
          correlationId: apiKey.id,
        })
        .catch((error: Error) => {
          this.logger.error('Failed to queue API key creation email', {
            apiKeyId: apiKey.id,
            error: error.message,
          });
        });

      // 10. Return the API key and plain key
      return ResponseBuilder.ok(
        {
          apiKey,
          plainKey: `${keyPrefix}.${plainKey}`, // Format: prefix.fullkey
        },
        'API key created successfully. Store the key securely as it will not be shown again.',
      );
    } catch (error) {
      this.logger.error('Failed to create API key', {
        userId,
        name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return new ValidationError({
        apiKey: ['Failed to create API key. Please try again.'],
      });
    }
  }

  async listApiKeys(userId: string, includeRevoked: boolean = false): AsyncResult<ApiKey[]> {
    try {
      // 1. Validate user ID
      if (!validators.isValidUUID(userId)) {
        return new ValidationError({ userId: ['Invalid user ID format'] });
      }

      // 2. Get API keys from repository
      const result = await this.tokenRepo.findApiKeysByUserId(userId, includeRevoked);

      if (!isSuccessResponse(result)) {
        return result;
      }

      const apiKeys = result.body().data;

      // 3. Enhance the response with additional computed fields
      const enhancedApiKeys = apiKeys.map((key) => ({
        ...key,
        // Mask the key hash for security (never expose the full hash)
        keyHash: '***masked***',

        // Add human-readable status
        status: this.getApiKeyStatus(key),

        // Add formatted dates
        formattedDates: {
          createdAt: key.createdAt.toLocaleDateString(),
          lastUsedAt: key.lastUsedAt?.toLocaleDateString() || 'Never',
          expiresAt: key.expiresAt?.toLocaleDateString() || 'Never',
          revokedAt: key.revokedAt?.toLocaleDateString() || null,
        },

        // Add usage percentage if rate limited
        usagePercentage: key.rateLimitPerHour
          ? Math.round((key.usageCount / key.rateLimitPerHour) * 100)
          : null,

        // Add days until expiration
        daysUntilExpiration: key.expiresAt
          ? Math.max(0, Math.ceil((key.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
          : null,
      }));

      // 4. Sort by creation date (newest first) and then by name
      enhancedApiKeys.sort((a, b) => {
        // First sort by creation date (newest first)
        const dateCompare = b.createdAt.getTime() - a.createdAt.getTime();
        if (dateCompare !== 0) return dateCompare;

        // Then sort by name alphabetically
        return a.name.localeCompare(b.name);
      });

      // 5. Log the action
      this.logger.info('API keys listed', {
        userId,
        count: enhancedApiKeys.length,
        includeRevoked,
      });

      return ResponseBuilder.ok(enhancedApiKeys);
    } catch (error) {
      this.logger.error('Failed to list API keys', {
        userId,
        includeRevoked,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return new ValidationError({
        apiKeys: ['Failed to retrieve API keys. Please try again.'],
      });
    }
  }

  async revokeApiKey(userId: string, apiKeyId: string, reason?: string): AsyncResult<boolean> {
    try {
      // 1. Validate inputs
      if (!validators.isValidUUID(userId)) {
        return new ValidationError({ userId: ['Invalid user ID format'] });
      }

      if (!validators.isValidUUID(apiKeyId)) {
        return new ValidationError({ apiKeyId: ['Invalid API key ID format'] });
      }

      if (reason && reason.trim().length === 0) {
        return new ValidationError({ reason: ['Reason cannot be empty'] });
      }

      // 2. Verify API key exists and belongs to user
      const apiKeyResult = await this.tokenRepo.findApiKeysByUserId(userId, true);

      if (!isSuccessResponse(apiKeyResult)) {
        return apiKeyResult;
      }

      const userApiKeys = apiKeyResult.body().data;
      const apiKey = userApiKeys.find((key) => key.id === apiKeyId);

      if (!apiKey) {
        return new NotFoundError('API key not found or does not belong to this user');
      }

      // 3. Check if already revoked
      if (apiKey.revokedAt) {
        return new ValidationError({
          apiKey: [`API key was already revoked on ${apiKey.revokedAt.toLocaleDateString()}`],
        });
      }

      // 4. Revoke the API key
      const revokeResult = await this.tokenRepo.revokeApiKey(
        apiKeyId,
        userId,
        reason || 'User initiated revocation',
      );

      if (!isSuccessResponse(revokeResult)) {
        return revokeResult;
      }

      const success = revokeResult.body().data;

      if (!success) {
        return new ValidationError({
          apiKey: ['Failed to revoke API key. Please try again.'],
        });
      }

      // 5. Log the revocation
      this.logger.info('API key revoked', {
        userId,
        apiKeyId,
        apiKeyName: apiKey.name,
        reason: reason || 'User initiated',
        revokedAt: new Date(),
      });

      // 6. Emit event (optional)
      // await this.eventBus.emit(
      //   new ApiKeyRevokedEvent({
      //     userId,
      //     apiKeyId,
      //     apiKeyName: apiKey.name,
      //     reason: reason || 'User initiated',
      //     revokedAt: new Date(),
      //   })
      // );

      // 7. Queue notification email
      this.queueManager
        .getEmailQueue()
        .sendEmailJob({
          to: { email: 'user@example.com' }, // TODO: Get actual user email
          subject: '🔑 API Key Revoked',
          template: 'api-key-revoked',
          data: {
            userId,
            apiKeyName: apiKey.name,
            apiKeyPrefix: apiKey.keyPrefix,
            reason: reason || 'User initiated revocation',
            revokedAt: new Date().toLocaleString(),
            // Include security reminder
            securityTip:
              'If you did not initiate this action, please secure your account immediately.',
          },
          correlationId: apiKeyId,
        })
        .catch((error: Error) => {
          this.logger.error('Failed to queue API key revocation email', {
            apiKeyId,
            error: error.message,
          });
        });

      // 8. Check if this was the last active API key (optional warning)
      const remainingKeysResult = await this.tokenRepo.findApiKeysByUserId(userId, false);
      if (isSuccessResponse(remainingKeysResult)) {
        const activeKeys = remainingKeysResult.body().data;

        if (activeKeys.length === 0) {
          this.logger.warn('User has no remaining active API keys', { userId });
        }
      }

      return ResponseBuilder.ok(true, `API key "${apiKey.name}" has been revoked successfully.`);
    } catch (error) {
      this.logger.error('Failed to revoke API key', {
        userId,
        apiKeyId,
        reason,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return new ValidationError({
        apiKey: ['Failed to revoke API key. Please try again.'],
      });
    }
  }

  async validateApiKeyRequest(
    key: string,
    requiredScopes?: string[],
    ipAddress?: string,
  ): AsyncResult<{ user: User; apiKey: ApiKey }> {
    try {
      // 1. Validate API key format
      if (!key || key.length < 32) {
        return new UnauthorizedError('Invalid API key format');
      }

      // Extract the prefix if the key is in format "prefix.key"
      let actualKey = key;
      let prefix = '';

      if (key.includes('.')) {
        const parts = key.split('.');
        if (parts.length !== 2) {
          return new UnauthorizedError('Invalid API key format');
        }
        prefix = parts[0];
        actualKey = parts[1];
      }

      // 2. Validate the API key and get user
      const validationResult = await this.authRepo.validateApiKey(actualKey, requiredScopes);

      if (!isSuccessResponse(validationResult)) {
        // Log failed attempts for security monitoring
        this.logger.warn('API key validation failed', {
          prefix,
          ipAddress,
          requiredScopes,
          // Get error message based on response type
          error: validationResult.message || 'Unknown validation error',
          statusCode: validationResult.statusCode,
        });
        return validationResult;
      }

      const { user, apiKey } = validationResult.body().data;

      // 3. Additional IP validation if the key has IP restrictions
      if (apiKey.allowedIps && apiKey.allowedIps.length > 0 && ipAddress) {
        const isIpAllowed = this.isIpAllowed(ipAddress, apiKey.allowedIps);

        if (!isIpAllowed) {
          this.logger.warn('API key used from unauthorized IP', {
            apiKeyId: apiKey.id,
            userId: user.id,
            ipAddress,
            allowedIps: apiKey.allowedIps,
          });

          // Queue security alert
          this.queueSecurityAlert(user.id, apiKey, ipAddress, 'unauthorized_ip');

          return new ForbiddenError('API key not authorized from this IP address');
        }
      }

      // 4. Check if approaching rate limit and add warning
      let rateLimitWarning: string | undefined;
      if (apiKey.rateLimitPerHour) {
        const usagePercentage = (apiKey.usageCount / apiKey.rateLimitPerHour) * 100;

        if (usagePercentage >= 90) {
          rateLimitWarning = `API rate limit warning: ${apiKey.usageCount}/${apiKey.rateLimitPerHour} requests used`;
        }
      }

      // 5. Check if key is expiring soon
      let expirationWarning: string | undefined;
      if (apiKey.expiresAt) {
        const daysUntilExpiration = Math.ceil(
          (apiKey.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        );

        if (daysUntilExpiration <= 7) {
          expirationWarning = `API key expires in ${daysUntilExpiration} days`;
        }
      }

      // 6. Log successful validation (but not too verbose for performance)
      if (Math.random() < 0.1) {
        // Log 10% of successful validations
        this.logger.info('API key validated', {
          userId: user.id,
          apiKeyId: apiKey.id,
          prefix: apiKey.keyPrefix,
          ipAddress,
          scopes: apiKey.scopes,
        });
      }

      // 7. Update last used information asynchronously
      this.tokenRepo.updateApiKeyLastUsed(apiKey.keyHash, ipAddress).catch((error) => {
        this.logger.error('Failed to update API key last used', {
          apiKeyId: apiKey.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });

      // 8. Return the validated result with any warnings
      const response = ResponseBuilder.ok({ user, apiKey }, undefined, {
        warnings: [rateLimitWarning, expirationWarning].filter(Boolean),
      });

      return response;
    } catch (error) {
      this.logger.error('Failed to validate API key', {
        ipAddress,
        requiredScopes,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return new UnauthorizedError('Invalid API key');
    }
  }

  async getSecurityStatus(userId: string): AsyncResult<{
    twoFactorEnabled: boolean;
    passwordLastChanged: Date | null;
    accountLocked: boolean;
    lockedUntil: Date | null;
    failedLoginAttempts: number;
    activeSessions: number;
    activeApiKeys: number;
    linkedProviders: string[];
  }> {
    try {
      // 1. Validate user ID
      if (!validators.isValidUUID(userId)) {
        return new ValidationError({ userId: ['Invalid user ID format'] });
      }

      // Initialize result object with defaults
      const securityStatus = {
        twoFactorEnabled: false,
        passwordLastChanged: null as Date | null,
        accountLocked: false,
        lockedUntil: null as Date | null,
        failedLoginAttempts: 0,
        activeSessions: 0,
        activeApiKeys: 0,
        linkedProviders: [] as string[],
      };

      // 2. Get two-factor status
      const twoFactorResult = await this.authRepo.isTwoFactorEnabled(userId);
      if (isSuccessResponse(twoFactorResult)) {
        securityStatus.twoFactorEnabled = twoFactorResult.body().data;
      }

      // 3. Get active sessions count
      const sessionsResult = await this.sessionRepo.findActiveSessionsByUserId(userId);
      if (isSuccessResponse(sessionsResult)) {
        securityStatus.activeSessions = sessionsResult.body().data.length;
      }

      // 4. Get active API keys count
      const apiKeysResult = await this.tokenRepo.findApiKeysByUserId(userId, false);
      if (isSuccessResponse(apiKeysResult)) {
        securityStatus.activeApiKeys = apiKeysResult.body().data.length;
      }

      // 5. Get linked auth providers
      const providersResult = await this.authRepo.getUserAuthProviders(userId);
      if (isSuccessResponse(providersResult)) {
        const providers = providersResult.body().data;
        securityStatus.linkedProviders = providers.map((p) => p.provider);
      }

      // 6. Get account lock status and password info
      // This requires accessing the user_security table directly
      // You might need to add a method to your repository for this
      // For now, we'll get this info through the auth activity
      const activityResult = await this.authRepo.getUserAuthActivity(userId, 1);
      if (isSuccessResponse(activityResult)) {
        const activity = activityResult.body().data;
        securityStatus.failedLoginAttempts = activity.failedAttempts;
      }

      // 7. Calculate security score (optional enhancement)
      const securityScore = this.calculateSecurityScore(securityStatus);

      // 8. Add security recommendations
      const recommendations = this.getSecurityRecommendations(securityStatus);

      // 9. Log security status check
      this.logger.info('Security status retrieved', {
        userId,
        twoFactorEnabled: securityStatus.twoFactorEnabled,
        activeSessions: securityStatus.activeSessions,
        activeApiKeys: securityStatus.activeApiKeys,
        linkedProviders: securityStatus.linkedProviders.length,
        securityScore,
      });

      // Return with additional metadata
      return ResponseBuilder.ok(securityStatus, undefined, {
        securityScore,
        recommendations,
        lastChecked: new Date(),
      });
    } catch (error) {
      this.logger.error('Failed to get security status', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return new ValidationError({
        security: ['Failed to retrieve security status. Please try again.'],
      });
    }
  }

  async getAuthActivity(
    userId: string,
    options?: {
      limit?: number;
      includeFailedAttempts?: boolean;
      dateRange?: { from: Date; to: Date };
    },
  ): AsyncResult<{
    recentLogins: Array<{
      timestamp: Date;
      ip: string;
      device: string;
      location?: string;
      success: boolean;
    }>;
    activeSessions: Session[];
    suspiciousActivity: Array<{
      type: string;
      timestamp: Date;
      details: string;
    }>;
  }> {
    try {
      // 1. Validate inputs
      if (!validators.isValidUUID(userId)) {
        return new ValidationError({ userId: ['Invalid user ID format'] });
      }

      const limit = options?.limit || 20;
      if (limit < 1 || limit > 100) {
        return new ValidationError({ limit: ['Limit must be between 1 and 100'] });
      }

      if (options?.dateRange) {
        if (options.dateRange.from >= options.dateRange.to) {
          return new ValidationError({
            dateRange: ['From date must be before to date'],
          });
        }
      }

      // 2. Get auth activity from repository
      const activityResult = await this.authRepo.getUserAuthActivity(userId, limit);

      if (!isSuccessResponse(activityResult)) {
        return activityResult;
      }

      const authData = activityResult.body().data;

      // 3. Get active sessions with details
      const sessionsResult = await this.sessionRepo.findActiveSessionsByUserId(userId);
      let activeSessions: Session[] = [];

      if (isSuccessResponse(sessionsResult)) {
        activeSessions = sessionsResult.body().data;
      }

      // 4. Process recent logins and add location info
      const recentLogins = authData.recentLogins.map((login) => ({
        ...login,
        success: true, // These are from sessions table, so they're successful
        location: this.getLocationFromIp(login.ip), // Mock location for now
      }));

      // 5. Detect suspicious activity
      const suspiciousActivity = this.detectSuspiciousActivity(
        recentLogins,
        activeSessions,
        authData.failedAttempts,
      );

      // 6. If includeFailedAttempts is true, we need to get failed login data
      // This would require adding a method to track failed logins separately
      // For now, we'll add failed attempts as a suspicious activity if > 0
      if (authData.failedAttempts > 0) {
        suspiciousActivity.push({
          type: 'failed_login_attempts',
          timestamp: new Date(),
          details: `${authData.failedAttempts} failed login attempts detected`,
        });
      }

      // 7. Apply date range filter if provided
      let filteredLogins = recentLogins;
      if (options?.dateRange) {
        filteredLogins = recentLogins.filter(
          (login) =>
            login.timestamp >= options.dateRange!.from && login.timestamp <= options.dateRange!.to,
        );
      }

      // 8. Sort activities by timestamp (newest first)
      filteredLogins.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // 9. Log the activity check
      this.logger.info('Auth activity retrieved', {
        userId,
        loginCount: filteredLogins.length,
        activeSessionCount: activeSessions.length,
        suspiciousActivityCount: suspiciousActivity.length,
      });

      return ResponseBuilder.ok(
        {
          recentLogins: filteredLogins,
          activeSessions,
          suspiciousActivity,
        },
        undefined,
        {
          totalLogins: recentLogins.length,
          dateRange: options?.dateRange,
          hasMore: recentLogins.length === limit,
        },
      );
    } catch (error) {
      this.logger.error('Failed to get auth activity', {
        userId,
        options,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return new ValidationError({
        activity: ['Failed to retrieve authentication activity. Please try again.'],
      });
    }
  }

  async lockAccount(
    adminId: string,
    userId: string,
    reason: string,
    options?: {
      duration?: number; // minutes
      notifyUser?: boolean;
    },
  ): AsyncResult<boolean> {
    try {
      // 1. Validate inputs
      if (!validators.isValidUUID(adminId)) {
        return new ValidationError({ adminId: ['Invalid admin ID format'] });
      }

      if (!validators.isValidUUID(userId)) {
        return new ValidationError({ userId: ['Invalid user ID format'] });
      }

      if (!reason || reason.trim().length < 5) {
        return new ValidationError({ reason: ['Reason must be at least 5 characters'] });
      }

      if (options?.duration && (options.duration < 1 || options.duration > 525600)) {
        // Max 1 year
        return new ValidationError({
          duration: ['Duration must be between 1 minute and 1 year (525600 minutes)'],
        });
      }

      // 2. Verify admin has permission (optional - depends on your permission system)
      // This would typically check if adminId has 'user:lock' permission
      // For now, we'll just check they're not locking themselves
      if (adminId === userId) {
        return new ValidationError({
          userId: ['Administrators cannot lock their own account'],
        });
      }

      // 3. Calculate lock until date
      const lockDuration = options?.duration || 30; // Default 30 minutes
      const lockUntil = new Date(Date.now() + lockDuration * 60 * 1000);

      // 4. Lock the account
      const lockResult = await this.authRepo.lockAccount(userId, reason.trim(), lockUntil, adminId);

      if (!isSuccessResponse(lockResult)) {
        return lockResult;
      }

      const isLocked = lockResult.body().data;

      if (!isLocked) {
        return new ValidationError({
          account: ['Failed to lock account. Account may not exist.'],
        });
      }

      // 5. Revoke all active sessions
      const revokeResult = await this.sessionRepo.revokeAllUserSessions(
        userId,
        undefined, // Revoke all sessions, no exceptions
      );

      let revokedSessions = 0;
      if (isSuccessResponse(revokeResult)) {
        revokedSessions = revokeResult.body().data;
      }

      // 6. Log the action
      this.logger.warn('Account locked by admin', {
        adminId,
        userId,
        reason,
        lockUntil,
        duration: lockDuration,
        revokedSessions,
      });

      // 7. Emit event for audit trail
      // await this.eventBus.emit(
      //   new AccountLockedEvent({
      //     adminId,
      //     userId,
      //     reason,
      //     lockUntil,
      //     lockedAt: new Date(),
      //   })
      // );

      // 8. Send notification if requested
      if (options?.notifyUser !== false) {
        // Default to true
        this.queueManager
          .getEmailQueue()
          .sendEmailJob({
            to: { email: 'user@example.com' }, // TODO: Get actual user email
            subject: '🔒 Account Security Notice',
            template: 'account-locked',
            data: {
              userId,
              reason,
              lockDuration: this.formatDuration(lockDuration),
              lockUntil: lockUntil.toLocaleString(),
              adminAction: true,
              supportEmail: 'support@example.com',
              // Include appeal instructions
              appealInstructions:
                'If you believe this action was taken in error, please contact support.',
            },
            correlationId: `lock-${userId}-${Date.now()}`,
          })
          .catch((error: Error) => {
            this.logger.error('Failed to queue account lock notification', {
              userId,
              error: error.message,
            });
          });
      }

      // 9. Create security alert for the admin dashboard
      this.createAdminSecurityAlert(adminId, userId, 'account_locked', {
        reason,
        duration: lockDuration,
        revokedSessions,
      });

      return ResponseBuilder.ok(
        true,
        `Account locked successfully until ${lockUntil.toLocaleString()}. ${revokedSessions} active sessions were revoked.`,
      );
    } catch (error) {
      this.logger.error('Failed to lock account', {
        adminId,
        userId,
        reason,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return new ValidationError({
        account: ['Failed to lock account. Please try again.'],
      });
    }
  }

  async unlockAccount(adminId: string, userId: string, reason?: string): AsyncResult<boolean> {
    try {
      // 1. Validate inputs
      if (!validators.isValidUUID(adminId)) {
        return new ValidationError({ adminId: ['Invalid admin ID format'] });
      }

      if (!validators.isValidUUID(userId)) {
        return new ValidationError({ userId: ['Invalid user ID format'] });
      }

      if (reason && reason.trim().length < 5) {
        return new ValidationError({
          reason: ['Reason must be at least 5 characters if provided'],
        });
      }

      // 2. Check if account is actually locked
      const lockStatusResult = await this.authRepo.isAccountLocked(userId);

      if (!isSuccessResponse(lockStatusResult)) {
        return lockStatusResult;
      }

      const lockStatus = lockStatusResult.body().data;

      if (!lockStatus.locked) {
        return new ValidationError({
          account: ['Account is not currently locked'],
        });
      }

      // 3. Get user details for logging/notification
      // You might want to inject UserRepository or add a method to get user email
      // For now, we'll proceed with the unlock

      // 4. Unlock the account
      const unlockResult = await this.authRepo.unlockAccount(userId, adminId);

      if (!isSuccessResponse(unlockResult)) {
        return unlockResult;
      }

      const isUnlocked = unlockResult.body().data;

      if (!isUnlocked) {
        return new ValidationError({
          account: ['Failed to unlock account'],
        });
      }

      // 5. Log the action
      this.logger.info('Account unlocked by admin', {
        adminId,
        userId,
        reason: reason || 'No reason provided',
        wasLockedUntil: lockStatus.until,
        unlockedAt: new Date(),
      });

      // 6. Emit event for audit trail
      // await this.eventBus.emit(
      //   new AccountUnlockedEvent({
      //     adminId,
      //     userId,
      //     reason: reason || 'No reason provided',
      //     wasLockedUntil: lockStatus.until,
      //     unlockedAt: new Date(),
      //   })
      // );

      // 7. Send notification to user
      this.queueManager
        .getEmailQueue()
        .sendEmailJob({
          to: { email: 'user@example.com' }, // TODO: Get actual user email
          subject: '🔓 Account Unlocked',
          template: 'account-unlocked',
          data: {
            userId,
            reason: reason || 'Your account has been reviewed and unlocked',
            unlockedAt: new Date().toLocaleString(),
            adminAction: true,
            // Security recommendations
            recommendations: [
              'Review your recent account activity',
              'Change your password if you suspect unauthorized access',
              'Enable two-factor authentication for added security',
            ],
            loginUrl: 'https://example.com/login', // TODO: Get actual login URL
          },
          correlationId: `unlock-${userId}-${Date.now()}`,
        })
        .catch((error: Error) => {
          this.logger.error('Failed to queue account unlock notification', {
            userId,
            error: error.message,
          });
        });

      // 8. Create security alert for admin dashboard
      this.createAdminSecurityAlert(adminId, userId, 'account_unlocked', {
        reason: reason || 'No reason provided',
        wasLockedUntil: lockStatus.until,
        earlyUnlock: lockStatus.until ? lockStatus.until > new Date() : false,
      });

      // 9. Calculate how early the unlock was (if applicable)
      let earlyUnlockInfo = '';
      if (lockStatus.until && lockStatus.until > new Date()) {
        const remainingTime = lockStatus.until.getTime() - Date.now();
        const remainingMinutes = Math.floor(remainingTime / (1000 * 60));
        earlyUnlockInfo = ` (${this.formatDuration(remainingMinutes)} early)`;
      }

      return ResponseBuilder.ok(
        true,
        `Account unlocked successfully${earlyUnlockInfo}. The user has been notified.`,
      );
    } catch (error) {
      this.logger.error('Failed to unlock account', {
        adminId,
        userId,
        reason,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return new ValidationError({
        account: ['Failed to unlock account. Please try again.'],
      });
    }
  }

  async unlockAccountWithContext(
    adminId: string,
    userId: string,
    context: {
      reason: string;
      ticketId?: string;
      appealId?: string;
      notes?: string;
    },
  ): AsyncResult<{
    success: boolean;
    previousLockInfo: {
      lockedAt?: Date;
      lockedUntil?: Date;
      lockReason?: string;
      lockedBy?: string;
    };
  }> {
    try {
      // Get lock history before unlocking
      const lockHistory = await this.getLockHistory(userId);

      // Proceed with unlock
      const unlockResult = await this.unlockAccount(adminId, userId, context.reason);

      if (!isSuccessResponse(unlockResult)) {
        return unlockResult as any;
      }

      // Store unlock context for audit
      if (context.ticketId || context.appealId) {
        this.logger.info('Account unlock context', {
          userId,
          adminId,
          ticketId: context.ticketId,
          appealId: context.appealId,
          notes: context.notes,
        });
      }

      return ResponseBuilder.ok({
        success: true,
        previousLockInfo: lockHistory,
      });
    } catch (error) {
      this.logger.error('Failed to unlock account with context', {
        adminId,
        userId,
        context,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return new ValidationError({
        account: ['Failed to unlock account. Please try again.'],
      });
    }
  }

  async checkAccountStatus(email: string): AsyncResult<{
    exists: boolean;
    locked: boolean;
    lockedUntil?: Date;
    status: string;
  }> {
    try {
      // 1. Validate email
      if (!email || !validators.isValidEmail(email)) {
        return new ValidationError({ email: ['Invalid email format'] });
      }

      const sanitizedEmail = email.toLowerCase().trim();

      // 2. Check if account is locked
      const lockResult = await this.authRepo.isAccountLocked(sanitizedEmail);

      if (!isSuccessResponse(lockResult)) {
        // If error occurs, return safe default to prevent information leakage
        return ResponseBuilder.ok({
          exists: true, // Always return true to prevent email enumeration
          locked: false,
          status: 'unknown',
        });
      }

      const lockStatus = lockResult.body().data;

      // 3. Prepare response
      // SECURITY: Be careful not to leak information about account existence
      // Always return consistent responses regardless of whether account exists

      const response = {
        exists: true, // Always true to prevent email enumeration
        locked: lockStatus.locked,
        lockedUntil: lockStatus.until,
        status: this.getAccountStatusDescription(lockStatus.locked, lockStatus.until),
      };

      // 4. Log check for rate limiting/security monitoring
      // Only log basic info, not the full email
      this.logger.info('Account status checked', {
        emailDomain: sanitizedEmail.split('@')[1], // Only log domain
        locked: response.locked,
        hasLockExpiry: !!response.lockedUntil,
      });

      // 5. Rate limiting check (optional)
      // You might want to implement rate limiting to prevent abuse
      const rateLimitKey = `account-status:${sanitizedEmail}`;
      const isRateLimited = await this.checkRateLimit(rateLimitKey, 5, 300); // 5 checks per 5 minutes

      if (isRateLimited) {
        return new ValidationError({
          rateLimit: ['Too many status checks. Please try again later.'],
        });
      }

      return ResponseBuilder.ok(response);
    } catch (error) {
      this.logger.error('Failed to check account status', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Return safe default on error
      return ResponseBuilder.ok({
        exists: true,
        locked: false,
        status: 'unknown',
      });
    }
  }

  async checkAccountStatusSecure(
    email: string,
    captchaToken?: string,
  ): AsyncResult<{
    message: string;
    canLogin: boolean;
    requiresAction?: string;
  }> {
    try {
      // 1. Validate CAPTCHA if provided (for public endpoints)
      if (captchaToken) {
        const captchaValid = await this.validateCaptcha(captchaToken);
        if (!captchaValid) {
          return new ValidationError({
            captcha: ['Invalid CAPTCHA. Please try again.'],
          });
        }
      }

      // 2. Get account status
      const statusResult = await this.checkAccountStatus(email);

      if (!isSuccessResponse(statusResult)) {
        return statusResult as any;
      }

      const status = statusResult.body().data;

      // 3. Return user-friendly message without revealing too much
      let message: string;
      let canLogin = true;
      let requiresAction: string | undefined;

      if (status.locked && status.lockedUntil) {
        const now = new Date();
        const lockExpired = status.lockedUntil <= now;

        if (lockExpired) {
          message = 'Your account is ready for login.';
          canLogin = true;
        } else {
          message = 'Your account is temporarily unavailable.';
          canLogin = false;
          requiresAction =
            'Please try again later or contact support if you need immediate assistance.';
        }
      } else if (status.locked) {
        message = 'Your account requires attention.';
        canLogin = false;
        requiresAction = 'Please contact support for assistance.';
      } else {
        message = 'Your account is ready for login.';
        canLogin = true;
      }

      return ResponseBuilder.ok({
        message,
        canLogin,
        requiresAction,
      });
    } catch (error) {
      this.logger.error('Failed to check account status (secure)', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Return generic message on error
      return ResponseBuilder.ok({
        message: 'Please proceed with login.',
        canLogin: true,
      });
    }
  }

  async resendVerificationEmail(
    email: string,
    ipAddress?: string,
  ): AsyncResult<{
    sent: boolean;
    nextAllowedAt?: Date;
  }> {
    try {
      // 1. Validate email
      if (!email || !validators.isValidEmail(email)) {
        return new ValidationError({ email: ['Invalid email format'] });
      }

      const sanitizedEmail = email.toLowerCase().trim();

      // 2. Call repository method
      const resendResult = await this.authRepo.resendVerificationEmail(sanitizedEmail);

      if (!isSuccessResponse(resendResult)) {
        return resendResult as any;
      }

      // 3. Get the token from the response metadata (not body().metadata)
      const response = resendResult as any; // Type assertion needed due to response structure
      const token = response.metadata?.token;

      if (token) {
        // 4. Queue the verification email
        const verificationUrl = `${process.env.APP_URL}/verify-email?token=${token}`;

        this.queueManager
          .getEmailQueue()
          .sendEmailJob({
            to: { email: sanitizedEmail },
            subject: '🔄 Verify Your Email (Resent)',
            template: 'email-verification',
            data: {
              email: sanitizedEmail,
              verificationUrl,
              expiresIn: '24 hours',
              ipAddress,
            },
          })
          .catch((error: Error) => {
            this.logger.error('Failed to queue verification email', {
              email: sanitizedEmail,
              error: error.message,
            });
          });
      }

      // 5. Log and return
      this.logger.info('Verification email resent', {
        emailDomain: sanitizedEmail.split('@')[1],
        ipAddress,
      });

      return ResponseBuilder.ok(
        {
          sent: true,
          nextAllowedAt: new Date(Date.now() + 5 * 60 * 1000),
        },
        'If an account exists with this email, a verification link has been sent.',
      );
    } catch (error) {
      this.logger.error('Failed to resend verification email', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return ResponseBuilder.ok(
        { sent: false },
        'Unable to process request. Please try again later.',
      );
    }
  }

  // src/domain/services/auth.service.ts - Corrected sendVerificationEmail method

  async sendVerificationEmail(userId: string, correlationId?: string): AsyncResult<boolean> {
    try {
      // Call the repository method
      const result = await this.authRepo.sendVerificationEmail(userId);

      if (!isSuccessResponse(result)) {
        return result;
      }

      // Access metadata directly from the response object
      const response = result as SuccessResponse<boolean>;
      const token = response.meta?.token as string;
      const email = response.meta?.email as string;

      if (token && email) {
        // Queue the verification email
        const verificationUrl = `${process.env.APP_URL || 'http://localhost:3000'}/verify-email?token=${token}`;

        await this.queueManager.getEmailQueue().sendEmailJob({
          to: { email },
          subject: 'Verify Your Email',
          template: 'email-verification',
          data: {
            verificationUrl,
            expiresIn: '24 hours',
          },
        });

        this.logger.info('Verification email queued', {
          userId,
          email,
          correlationId,
        });
      }

      return result;
    } catch (error) {
      this.logger.error('Failed to send verification email', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId,
      });

      return new InternalServerError('Failed to send verification email', correlationId);
    }
  }

  async initiateEmailChange() {}

  async confirmEmailChange() {}

  async getEmailVerification() {}

  async revokeAllUserSessions(
    userId: string,
    options?: {
      exceptSessionId?: string;
      reason?: string;
      notifyUser?: boolean;
    },
  ): AsyncResult<{ revokedCount: number }> {
    try {
      // 1. Validate user ID
      if (!validators.isValidUUID(userId)) {
        return new ValidationError({ userId: ['Invalid user ID format'] });
      }

      // 2. Revoke all sessions (except current if specified)
      const revokeResult = await this.sessionRepo.revokeAllUserSessions(
        userId,
        options?.exceptSessionId,
      );

      if (!isSuccessResponse(revokeResult)) {
        return revokeResult;
      }

      const revokedCount = revokeResult.body().data;

      // 3. Log the action
      this.logger.warn('All user sessions revoked', {
        userId,
        revokedCount,
        exceptSessionId: options?.exceptSessionId,
        reason: options?.reason || 'User initiated',
      });

      // 4. Send notification if requested and sessions were revoked
      if (options?.notifyUser !== false && revokedCount > 0) {
        this.queueManager
          .getEmailQueue()
          .sendEmailJob({
            to: { email: 'user@example.com' }, // TODO: Get actual user email
            subject: '🔐 Security Alert: All Devices Logged Out',
            template: 'security-logout-all',
            data: {
              userId,
              revokedCount,
              reason: options?.reason || 'You have been logged out from all devices for security.',
              timestamp: new Date().toLocaleString(),
              currentDeviceExcluded: !!options?.exceptSessionId,
            },
          })
          .catch((error: Error) => {
            this.logger.error('Failed to queue logout notification', {
              userId,
              error: error.message,
            });
          });
      }

      return ResponseBuilder.ok(
        { revokedCount },
        revokedCount > 0
          ? `Successfully logged out from ${revokedCount} device(s).`
          : 'No active sessions found.',
      );
    } catch (error) {
      this.logger.error('Failed to revoke all user sessions', {
        userId,
        options,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return new InternalServerError('Failed to logout from all devices');
    }
  }

  async revokeDeviceSessions() {}

  async extendSession() {}

  async getSessionDetails() {}

  async getActiveDevices() {}

  async requirePasswordChange() {}

  async checkPasswordStrength() {}

  async getAccountRecoveryOptions() {}

  async performMaintenance(): AsyncResult<{
    expiredSessions: number;
    expiredTokens: number;
    expiredApiKeys: number;
    completedAt: Date;
  }> {
    try {
      const results = {
        expiredSessions: 0,
        expiredTokens: 0,
        expiredApiKeys: 0,
        completedAt: new Date(),
      };

      // 1. Clean up expired sessions
      const expiredSessionsResult = await this.sessionRepo.revokeExpiredSessions();
      if (isSuccessResponse(expiredSessionsResult)) {
        results.expiredSessions = expiredSessionsResult.body().data;
      }

      // 2. Clean up old revoked sessions (older than 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      await this.sessionRepo.deleteRevokedSessions(thirtyDaysAgo);

      // 3. Clean up expired password reset tokens
      const expiredPasswordTokensResult = await this.tokenRepo.deleteExpiredPasswordResetTokens();
      if (isSuccessResponse(expiredPasswordTokensResult)) {
        results.expiredTokens += expiredPasswordTokensResult.body().data;
      }

      // 4. Clean up expired email verification tokens
      const expiredEmailTokensResult = await this.tokenRepo.deleteExpiredEmailVerificationTokens();
      if (isSuccessResponse(expiredEmailTokensResult)) {
        results.expiredTokens += expiredEmailTokensResult.body().data;
      }

      // 5. Clean up expired API keys
      const expiredApiKeysResult = await this.tokenRepo.deleteExpiredApiKeys();
      if (isSuccessResponse(expiredApiKeysResult)) {
        results.expiredApiKeys = expiredApiKeysResult.body().data;
      }

      // 6. Log maintenance results
      this.logger.info('Maintenance completed', results);

      return ResponseBuilder.ok(results);
    } catch (error) {
      this.logger.error('Maintenance failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return new InternalServerError('Maintenance task failed');
    }
  }

  async exportAuthData() {}

  private isSessionExpired(session: Session): boolean {
    return session.expiresAt < new Date();
  }

  private getApiKeyStatus(apiKey: ApiKey): string {
    if (apiKey.revokedAt) {
      return 'revoked';
    }

    if (!apiKey.isActive) {
      return 'inactive';
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return 'expired';
    }

    if (apiKey.rateLimitPerHour && apiKey.usageCount >= apiKey.rateLimitPerHour) {
      return 'rate_limited';
    }

    return 'active';
  }

  private isIpAllowed(ipAddress: string, allowedIps: string[]): boolean {
    // Direct match
    if (allowedIps.includes(ipAddress)) {
      return true;
    }

    // Check CIDR ranges
    for (const allowedIp of allowedIps) {
      if (allowedIp.includes('/')) {
        // Simple CIDR check (you might want to use a library like 'ip-range-check' for production)
        const [network, maskBits] = allowedIp.split('/');
        if (this.isIpInCidrRange(ipAddress, network, parseInt(maskBits))) {
          return true;
        }
      }
    }

    return false;
  }

  private isIpInCidrRange(ip: string, network: string, maskBits: number): boolean {
    // This is a simplified implementation
    // For production, use a library like 'ip-range-check' or 'ipaddr.js'
    const ipParts = ip.split('.').map(Number);
    const networkParts = network.split('.').map(Number);

    if (ipParts.length !== 4 || networkParts.length !== 4) {
      return false;
    }

    const ipNum = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];
    const networkNum =
      (networkParts[0] << 24) + (networkParts[1] << 16) + (networkParts[2] << 8) + networkParts[3];
    const mask = -1 << (32 - maskBits);

    return (ipNum & mask) === (networkNum & mask);
  }

  private async queueSecurityAlert(
    userId: string,
    apiKey: ApiKey,
    ipAddress: string,
    alertType: 'unauthorized_ip' | 'suspicious_activity',
  ): Promise<void> {
    this.queueManager
      .getEmailQueue()
      .sendEmailJob({
        to: { email: 'user@example.com' }, // TODO: Get actual user email
        subject: '⚠️ Security Alert: Suspicious API Key Usage',
        template: 'security-alert',
        data: {
          userId,
          alertType,
          apiKeyName: apiKey.name,
          apiKeyPrefix: apiKey.keyPrefix,
          ipAddress,
          timestamp: new Date().toLocaleString(),
          action:
            'Please review your API key usage and revoke the key if this activity is unauthorized.',
        },
      })
      .catch((error: Error) => {
        this.logger.error('Failed to queue security alert', {
          userId,
          apiKeyId: apiKey.id,
          error: error.message,
        });
      });
  }

  private calculateSecurityScore(status: {
    twoFactorEnabled: boolean;
    passwordLastChanged: Date | null;
    linkedProviders: string[];
    activeApiKeys: number;
    failedLoginAttempts: number;
  }): number {
    let score = 0;

    // Two-factor authentication (40 points)
    if (status.twoFactorEnabled) {
      score += 40;
    }

    // Password age (20 points)
    if (status.passwordLastChanged) {
      const daysSinceChange = Math.floor(
        (Date.now() - status.passwordLastChanged.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysSinceChange < 90) {
        score += 20;
      } else if (daysSinceChange < 180) {
        score += 10;
      }
    }

    // Linked providers (20 points)
    if (status.linkedProviders.length > 0) {
      score += Math.min(20, status.linkedProviders.length * 10);
    }

    // No recent failed attempts (10 points)
    if (status.failedLoginAttempts === 0) {
      score += 10;
    }

    // Using API keys instead of passwords (10 points)
    if (status.activeApiKeys > 0) {
      score += 10;
    }

    return Math.min(100, score);
  }

  // Helper method to get security recommendations
  private getSecurityRecommendations(status: {
    twoFactorEnabled: boolean;
    passwordLastChanged: Date | null;
    linkedProviders: string[];
    activeApiKeys: number;
    activeSessions: number;
  }): string[] {
    const recommendations: string[] = [];

    if (!status.twoFactorEnabled) {
      recommendations.push('Enable two-factor authentication for enhanced security');
    }

    if (status.passwordLastChanged) {
      const daysSinceChange = Math.floor(
        (Date.now() - status.passwordLastChanged.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysSinceChange > 90) {
        recommendations.push(
          'Consider updating your password (last changed ' + daysSinceChange + ' days ago)',
        );
      }
    } else {
      recommendations.push('Set up a password for your account');
    }

    if (status.linkedProviders.length === 0) {
      recommendations.push('Link a social account for easier login and account recovery');
    }

    if (status.activeSessions > 5) {
      recommendations.push(
        `You have ${status.activeSessions} active sessions. Review and revoke any you don't recognize`,
      );
    }

    if (status.activeApiKeys === 0 && status.linkedProviders.length === 0) {
      recommendations.push('Consider using API keys for programmatic access instead of passwords');
    }

    return recommendations;
  }
  private getLocationFromIp(ip: string): string | undefined {
    // In production, you would use a service like MaxMind GeoIP2 or IP-API
    // For now, return mock data based on IP patterns

    if (ip === 'Unknown' || !ip) {
      return undefined;
    }

    // Local IPs
    if (ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return 'Local Network';
    }

    // Mock some common IP ranges
    if (ip.startsWith('8.8.')) {
      return 'United States';
    }

    if (ip.startsWith('1.1.')) {
      return 'Australia';
    }

    // Default mock location
    return 'Unknown Location';
  }

  // Helper method to detect suspicious activity
  private detectSuspiciousActivity(
    recentLogins: Array<{ timestamp: Date; ip: string; location?: string }>,
    activeSessions: Session[],
    failedAttempts: number,
  ): Array<{ type: string; timestamp: Date; details: string }> {
    const suspicious: Array<{ type: string; timestamp: Date; details: string }> = [];

    // 1. Check for rapid location changes
    if (recentLogins.length >= 2) {
      for (let i = 0; i < recentLogins.length - 1; i++) {
        const current = recentLogins[i];
        const previous = recentLogins[i + 1];

        const timeDiff = current.timestamp.getTime() - previous.timestamp.getTime();
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        // If locations are different and time is less than 1 hour
        if (
          current.location !== previous.location &&
          hoursDiff < 1 &&
          current.location &&
          previous.location
        ) {
          suspicious.push({
            type: 'impossible_travel',
            timestamp: current.timestamp,
            details: `Login from ${current.location} shortly after ${previous.location} (${Math.round(hoursDiff * 60)} minutes apart)`,
          });
        }
      }
    }

    // 2. Check for multiple IPs in short time
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentIps = new Set(
      recentLogins.filter((login) => login.timestamp > last24Hours).map((login) => login.ip),
    );

    if (recentIps.size > 5) {
      suspicious.push({
        type: 'multiple_ips',
        timestamp: new Date(),
        details: `Logins from ${recentIps.size} different IP addresses in the last 24 hours`,
      });
    }

    // 3. Check for unusual login times
    const nightLogins = recentLogins.filter((login) => {
      const hour = login.timestamp.getHours();
      return hour >= 2 && hour <= 5; // 2 AM - 5 AM
    });

    if (nightLogins.length > 0) {
      suspicious.push({
        type: 'unusual_time',
        timestamp: nightLogins[0].timestamp,
        details: `${nightLogins.length} login(s) during unusual hours (2 AM - 5 AM)`,
      });
    }

    // 4. Check for expired but active sessions
    const now = new Date();
    const expiredButActive = activeSessions.filter(
      (session) => session.expiresAt < now && session.isActive,
    );

    if (expiredButActive.length > 0) {
      suspicious.push({
        type: 'expired_active_sessions',
        timestamp: now,
        details: `${expiredButActive.length} session(s) are expired but still marked as active`,
      });
    }

    // 5. High number of active sessions
    if (activeSessions.length > 10) {
      suspicious.push({
        type: 'excessive_sessions',
        timestamp: now,
        details: `Unusually high number of active sessions (${activeSessions.length})`,
      });
    }

    return suspicious;
  }

  private formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} minutes`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours < 24) {
      return remainingMinutes > 0
        ? `${hours} hours and ${remainingMinutes} minutes`
        : `${hours} hours`;
    }

    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    if (remainingHours > 0) {
      return `${days} days and ${remainingHours} hours`;
    }

    return `${days} days`;
  }

  // Helper method to create admin security alerts
  private async createAdminSecurityAlert(
    adminId: string,
    targetUserId: string,
    action: string,
    details: Record<string, any>,
  ): Promise<void> {
    // This would typically:
    // 1. Create an audit log entry
    // 2. Notify other admins
    // 3. Update admin dashboard

    this.logger.info('Admin security action', {
      adminId,
      targetUserId,
      action,
      details,
      timestamp: new Date(),
    });

    // Optionally notify other admins
    this.queueManager
      .getEmailQueue()
      .sendEmailJob({
        to: { email: 'admin-team@example.com' },
        subject: `⚠️ Admin Action: ${action}`,
        template: 'admin-action-notification',
        data: {
          adminId,
          targetUserId,
          action,
          details,
          timestamp: new Date().toLocaleString(),
        },
      })
      .catch((error: Error) => {
        this.logger.error('Failed to notify admin team', {
          action,
          error: error.message,
        });
      });
  }

  private async getLockHistory(userId: string): Promise<{
    lockedAt?: Date;
    lockedUntil?: Date;
    lockReason?: string;
    lockedBy?: string;
  }> {
    // This would query audit logs or lock history table
    return {
      lockedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      lockedUntil: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour from now
      lockReason: 'Previous lock reason',
      lockedBy: 'admin-previous',
    };
  }

  private getAccountStatusDescription(locked: boolean, lockedUntil?: Date): string {
    if (!locked) {
      return 'active';
    }

    if (lockedUntil) {
      const now = new Date();
      if (lockedUntil <= now) {
        return 'active'; // Lock has expired
      }

      const hoursRemaining = Math.ceil((lockedUntil.getTime() - now.getTime()) / (1000 * 60 * 60));

      if (hoursRemaining < 1) {
        return 'temporarily_locked';
      } else if (hoursRemaining < 24) {
        return 'locked_hours';
      } else {
        return 'locked_extended';
      }
    }

    return 'locked';
  }

  // Helper method for rate limiting (simplified)
  private async checkRateLimit(
    key: string,
    maxAttempts: number,
    windowSeconds: number,
  ): Promise<boolean> {
    // In production, use Redis or similar for distributed rate limiting
    // This is a simplified in-memory version

    // For now, return false (not rate limited)
    return false;
  }

  // Helper method for CAPTCHA validation (stub)
  private async validateCaptcha(token: string): Promise<boolean> {
    // In production, validate with reCAPTCHA, hCaptcha, etc.
    // This is a stub implementation

    if (!token || token.length < 10) {
      return false;
    }

    // Add actual CAPTCHA validation here
    return true;
  }
}
