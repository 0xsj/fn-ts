// src/api/v1/routes/auth.routes.ts
import { Router } from 'express';
import { container } from 'tsyringe';
import { AuthController } from '../controller/auth.controller';
import { rateLimitMiddleware } from '../../../infrastructure/rate-limit/rate-limit.middleware';
import { authMiddleware } from '../../../shared/middleware';

export function createAuthRoutes(): Router {
  const router = Router();
  const authController = container.resolve(AuthController);

  router.get('/current-user', authMiddleware, authController.getCurrentUser.bind(authController));

  // Public routes (no auth required)
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
    '/refresh-token',
    rateLimitMiddleware({
      max: 10,
      windowMs: 15 * 60 * 1000, // 15 minutes
      strategy: 'fixed-window',
    }),
    authController.refreshToken.bind(authController),
  );

  router.post(
    '/forgot-password',
    rateLimitMiddleware({
      max: 3,
      windowMs: 60 * 60 * 1000, // 1 hour
      strategy: 'fixed-window',
    }),
    authController.forgotPassword.bind(authController),
  );

  router.post(
    '/reset-password',
    rateLimitMiddleware({
      max: 5,
      windowMs: 60 * 60 * 1000, // 1 hour
      strategy: 'fixed-window',
    }),
    authController.resetPassword.bind(authController),
  );

  router.get(
    '/verify-email',
    rateLimitMiddleware({
      max: 10,
      windowMs: 60 * 60 * 1000, // 1 hour
      strategy: 'fixed-window',
    }),
    authController.verifyEmail.bind(authController),
  );

  router.post(
    '/resend-verification',
    rateLimitMiddleware({
      max: 3,
      windowMs: 60 * 60 * 1000, // 1 hour
      strategy: 'fixed-window',
    }),
    authController.resendVerificationEmail.bind(authController),
  );

  // Protected routes (auth required)
  router.post(
    '/logout',
    authMiddleware,
    rateLimitMiddleware({
      max: 10,
      windowMs: 15 * 60 * 1000, // 15 minutes
      strategy: 'fixed-window',
    }),
    authController.logout.bind(authController),
  );

  router.post(
    '/logout-all',
    authMiddleware,
    rateLimitMiddleware({
      max: 5,
      windowMs: 60 * 60 * 1000, // 1 hour
      strategy: 'fixed-window',
    }),
    authController.logoutAllDevices.bind(authController),
  );

  router.post(
    '/change-password',
    authMiddleware,
    rateLimitMiddleware({
      max: 5,
      windowMs: 60 * 60 * 1000, // 1 hour
      strategy: 'fixed-window',
    }),
    authController.changePassword.bind(authController),
  );

  router.get(
    '/sessions',
    authMiddleware,
    rateLimitMiddleware({
      max: 50,
      windowMs: 15 * 60 * 1000, // 15 minutes
      strategy: 'fixed-window',
    }),
    authController.getActiveSessions.bind(authController),
  );

  router.delete(
    '/sessions/:sessionId',
    authMiddleware,
    rateLimitMiddleware({
      max: 20,
      windowMs: 15 * 60 * 1000, // 15 minutes
      strategy: 'fixed-window',
    }),
    authController.revokeSession.bind(authController),
  );

  router.get(
    '/security-status',
    authMiddleware,
    rateLimitMiddleware({
      max: 50,
      windowMs: 15 * 60 * 1000, // 15 minutes
      strategy: 'fixed-window',
    }),
    authController.getSecurityStatus.bind(authController),
  );

  // Session lookup (kept from original)
  router.get(
    '/sessions/:sessionId',
    rateLimitMiddleware({
      max: 100,
      windowMs: 15 * 60 * 1000, // 15 minutes
      strategy: 'fixed-window',
    }),
    authController.getSession.bind(authController),
  );

  router.post(
    '/register',
    // rateLimitMiddleware({
    //   max: 3, // Strict limit for registration
    //   windowMs: 60 * 60 * 1000, // 1 hour
    //   strategy: 'fixed-window',
    // }),
    authController.register.bind(authController),
  );

  return router;
}
