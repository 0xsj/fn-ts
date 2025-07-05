// src/api/v1/routes/auth.routes.ts
import { Router } from 'express';
import { container } from 'tsyringe';
import { AuthController } from '../controller/auth.controller';
import { rateLimitMiddleware } from '../../../infrastructure/rate-limit/rate-limit.middleware';
import { authMiddleware } from '../../../shared/middleware';

export function createAuthRoutes(): Router {
  const router = Router();

  // Resolve using tsyringe's container directly
  const authController = container.resolve(AuthController);

  router.post(
    '/login',
    rateLimitMiddleware({
      max: 5,
      windowMs: 15 * 60 * 1000, // 15 minutes
      strategy: 'fixed-window',
    }),
    authController.login.bind(authController),
  );

  router.post(
    '/logout',
    authMiddleware, // Requires authentication
    rateLimitMiddleware({
      max: 10,
      windowMs: 15 * 60 * 1000, // 15 minutes
      strategy: 'fixed-window',
    }),
    authController.logout.bind(authController),
  );

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
