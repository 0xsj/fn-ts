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
}
