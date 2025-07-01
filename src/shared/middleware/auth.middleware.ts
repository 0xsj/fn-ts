// In src/shared/middleware/auth.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { DIContainer } from '../../core/di/container';
import { TOKENS } from '../../core/di/tokens';
import { AuthService } from '../../domain/services/auth.service';
import { sendError } from '../utils/response-helper';
import { UnauthorizedError, isSuccessResponse } from '../response';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        sessionId: string;
      };
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(
        req,
        res,
        new UnauthorizedError(undefined, {
          reason: 'Missing or invalid authorization header',
        }),
      );
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Get auth service
    const authService = DIContainer.resolve<AuthService>(TOKENS.AuthService);

    // Validate token (you'll need to implement validateAccessToken in AuthService)
    const result = await authService.validateAccessToken(token);

    if (!isSuccessResponse(result)) {
      sendError(req, res, result);
      return;
    }

    const { user, session } = result.body().data;

    // Attach user info to request
    req.user = {
      id: user.id,
      email: user.email,
      sessionId: session.id,
    };

    next();
  } catch (error) {
    sendError(
      req,
      res,
      new UnauthorizedError(undefined, {
        reason: 'Authentication failed',
      }),
    );
  }
}
