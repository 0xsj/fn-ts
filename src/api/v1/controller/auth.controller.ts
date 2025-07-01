import { injectable } from 'tsyringe';
import type { Response, Request, NextFunction } from 'express';
import { AuthService } from '../../../domain/services';
import { DIContainer } from '../../../core/di/container';
import { TOKENS } from '../../../core/di/tokens';
import { sendError, sendOk } from '../../../shared/utils/response-helper';
import { isSuccessResponse, ValidationError } from '../../../shared/response';
import { z } from 'zod';

@injectable()
export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = DIContainer.resolve<AuthService>(TOKENS.AuthService);
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

      const result = await this.authService.login(req.body, ipAddress, userAgent);

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
}
