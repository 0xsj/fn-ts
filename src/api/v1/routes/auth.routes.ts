import { Router } from 'express';
import { AuthController } from '../controller/auth.controller';
import { rateLimitMiddleware } from '../../../infrastructure/rate-limit/rate-limit.middleware';

export function createAuthRoutes(): Router {
  const router = Router();
  const authController = new AuthController();

  router.get(
    '/sessions/:sessionId',
    rateLimitMiddleware({
      max: 100,
      windowMs: 15 * 60 * 1000, // 15 minutes
      strategy: 'fixed-window',
    }),
    authController.getSession.bind(authController),
  );

  return router;
}
