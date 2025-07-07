import type { Response, Request, NextFunction } from 'express';
import { AuthService, UserService } from '../../../domain/services';
import { sendCreated, sendError, sendOk } from '../../../shared/utils/response-helper';
import {
  isSuccessResponse,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../../shared/response';
import { AuditContext } from '../../../domain/services/analytics.service';
import { Injectable } from '../../../core/di/decorators/injectable.decorator';
import { Inject, InjectLogger } from '../../../core/di/decorators';
import { ILogger } from '../../../shared/utils';
import { RegisterUserSchema } from '../../../domain/entities';

@Injectable()
export class AuthController {
  constructor(
    @Inject() private authService: AuthService,
    @Inject() private userService: UserService,
    @InjectLogger() private logger: ILogger,
  ) {
    this.logger.info('AuthController Initialized');
  }

  async getSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;
      const result = await this.authService.getSession(sessionId);

      if (isSuccessResponse(result)) {
        const session = result.body().data;
        sendOk(req, res, session);
      } else {
        sendError(req, res, result);
      }
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      // Build audit context from request
      const context: AuditContext = {
        userId: undefined, // Not known yet during login
        userEmail: req.body.email, // From login request
        userRole: undefined,
        organizationId: undefined,
        ipAddress,
        userAgent,
        correlationId: req.context.correlationId,
      };

      const result = await this.authService.login(req.body, context);

      if (isSuccessResponse(result)) {
        const loginResponse = result.body().data;

        // Set refresh token as httpOnly cookie
        res.cookie('refreshToken', loginResponse.tokens.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: loginResponse.tokens.refreshExpiresIn * 1000,
        });

        // Remove refresh token from response body
        const { refreshToken, refreshExpiresIn, ...tokens } = loginResponse.tokens;

        sendOk(req, res, {
          user: loginResponse.user,
          tokens,
          session: loginResponse.session,
        });
      } else {
        sendError(req, res, result);
      }
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Get session ID from authenticated user (set by auth middleware)
      const sessionId = req.user?.sessionId;

      if (!sessionId || !req.user) {
        sendError(req, res, new ValidationError({ session: ['No active session found'] }));
        return;
      }

      // Check if user wants to logout from all devices
      const logoutAll = req.body.logoutAll === true;

      // Build audit context from request
      const context: AuditContext = {
        userId: req.user.id,
        userEmail: req.user.email,
        userRole: undefined, // Not available in req.user
        organizationId: undefined, // Not available in req.user
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        correlationId: req.context.correlationId,
      };

      const result = await this.authService.logout(sessionId, logoutAll, context);

      if (isSuccessResponse(result)) {
        // Clear refresh token cookie
        res.clearCookie('refreshToken');

        sendOk(req, res, {
          message: logoutAll ? 'Logged out from all devices' : 'Logged out successfully',
        });
      } else {
        sendError(req, res, result);
      }
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Get refresh token from cookie or body
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

      if (!refreshToken) {
        sendError(
          req,
          res,
          new ValidationError({
            refreshToken: ['Refresh token is required'],
          }),
        );
        return;
      }

      const result = await this.authService.refreshToken(refreshToken);

      if (isSuccessResponse(result)) {
        const tokens = result.body().data;

        // Set new refresh token as httpOnly cookie
        res.cookie('refreshToken', tokens.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: tokens.refreshExpiresIn * 1000,
        });

        // Return only access token in body
        sendOk(req, res, {
          accessToken: tokens.accessToken,
          tokenType: tokens.tokenType,
          expiresIn: tokens.expiresIn,
        });
      } else {
        sendError(req, res, result);
      }
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(req, res, new UnauthorizedError('Authentication required'));
        return;
      }

      const result = await this.authService.changePassword(
        req.user.id,
        req.body,
        req.user.sessionId,
      );

      if (isSuccessResponse(result)) {
        sendOk(req, res, {
          message: 'Password changed successfully',
        });
      } else {
        sendError(req, res, result);
      }
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      const ipAddress = req.ip || req.socket.remoteAddress;

      const result = await this.authService.forgotPassword(email, ipAddress);

      // Always return success to prevent email enumeration
      sendOk(req, res, {
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, newPassword, confirmPassword } = req.body;
      const ipAddress = req.ip || req.socket.remoteAddress;

      const result = await this.authService.resetPassword(
        token,
        newPassword,
        confirmPassword,
        ipAddress,
      );

      if (isSuccessResponse(result)) {
        sendOk(req, res, {
          message: 'Password reset successfully. Please login with your new password.',
        });
      } else {
        sendError(req, res, result);
      }
    } catch (error) {
      next(error);
    }
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.query as { token: string };

      if (!token) {
        sendError(
          req,
          res,
          new ValidationError({
            token: ['Verification token is required'],
          }),
        );
        return;
      }

      const result = await this.authService.verifyEmail(token);

      if (isSuccessResponse(result)) {
        sendOk(req, res, {
          message: 'Email verified successfully',
        });
      } else {
        sendError(req, res, result);
      }
    } catch (error) {
      next(error);
    }
  }

  async resendVerificationEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      const ipAddress = req.ip || req.socket.remoteAddress;

      const result = await this.authService.resendVerificationEmail(email, ipAddress);

      if (isSuccessResponse(result)) {
        const data = result.body().data;
        sendOk(req, res, {
          message: 'If an account exists with this email, a verification link has been sent.',
          nextAllowedAt: data.nextAllowedAt,
        });
      } else {
        sendError(req, res, result);
      }
    } catch (error) {
      next(error);
    }
  }

  async getActiveSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(req, res, new UnauthorizedError('Authentication required'));
        return;
      }

      const result = await this.authService.getActiveSessions(req.user.id);

      if (isSuccessResponse(result)) {
        const sessions = result.body().data;
        sendOk(req, res, sessions);
      } else {
        sendError(req, res, result);
      }
    } catch (error) {
      next(error);
    }
  }

  async revokeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(req, res, new UnauthorizedError('Authentication required'));
        return;
      }

      const { sessionId } = req.params;
      const { reason } = req.body;

      const result = await this.authService.revokeSession(sessionId, reason);

      if (isSuccessResponse(result)) {
        sendOk(req, res, {
          message: 'Session revoked successfully',
        });
      } else {
        sendError(req, res, result);
      }
    } catch (error) {
      next(error);
    }
  }

  async logoutAllDevices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(req, res, new UnauthorizedError('Authentication required'));
        return;
      }

      const result = await this.authService.revokeAllUserSessions(req.user.id, {
        exceptSessionId: req.user.sessionId,
        reason: 'User initiated logout from all devices',
        notifyUser: true,
      });

      if (isSuccessResponse(result)) {
        const { revokedCount } = result.body().data;
        sendOk(req, res, {
          message: `Logged out from ${revokedCount} other device(s)`,
          revokedCount,
        });
      } else {
        sendError(req, res, result);
      }
    } catch (error) {
      next(error);
    }
  }

  async getSecurityStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(req, res, new UnauthorizedError('Authentication required'));
        return;
      }

      const result = await this.authService.getSecurityStatus(req.user.id);

      if (isSuccessResponse(result)) {
        sendOk(req, res, result.body());
      } else {
        sendError(req, res, result);
      }
    } catch (error) {
      next(error);
    }
  }

  async getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(req, res, new UnauthorizedError('Not authenticated'));
        return;
      }

      // Get full user details using the ID from the token
      const result = await this.userService.findUserById(req.user.id);

      if (isSuccessResponse(result)) {
        const user = result.body().data;
        if (!user) {
          sendError(req, res, new NotFoundError('User not found'));
          return;
        }

        // Convert to public user (removes sensitive fields)
        const publicUser = this.userService.toPublicUser(user);
        sendOk(req, res, publicUser);
      } else {
        sendError(req, res, result);
      }
    } catch (error) {
      next(error);
    }
  }

  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validation = RegisterUserSchema.safeParse(req.body);

      if (!validation.success) {
        const error = ValidationError.fromZodError(validation.error, req.context.correlationId);
        return sendError(req, res, error);
      }

      const result = await this.userService.register(validation.data, req.context.correlationId);

      if (isSuccessResponse(result)) {
        const user = result.body().data;

        // Convert to public user
        const publicUser = this.userService.toPublicUser(user);

        sendCreated(req, res, {
          user: publicUser,
          message: 'Registration successful. Please check your email to verify your account.',
        });
      } else {
        sendError(req, res, result);
      }
    } catch (error) {
      next(error);
    }
  }
}
