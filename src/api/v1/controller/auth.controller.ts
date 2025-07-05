import { injectable } from 'tsyringe';
import type { Response, Request, NextFunction } from 'express';
import { AuthService } from '../../../domain/services';
import { DIContainer } from '../../../core/di/container';
import { TOKENS } from '../../../core/di/tokens';
import { sendError, sendOk } from '../../../shared/utils/response-helper';
import { isSuccessResponse, ValidationError } from '../../../shared/response';
import { z } from 'zod';
import { AuditContext } from '../../../domain/services/analytics.service';
import { Injectable } from '../../../core/di/decorators/injectable.decorator';
import { InjectAuthService, InjectLogger } from '../../../core/di/decorators/inject.decorator';
import { ILogger } from '../../../shared/utils';

@Injectable()
export class AuthController {
  constructor(
    @InjectAuthService() private authService: AuthService,
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
}
