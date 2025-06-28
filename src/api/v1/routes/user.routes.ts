// src/api/v1/routes/user.routes.ts
import { Router, Request, Response } from 'express';
import { UserController } from '../controller/user.controller';
import { DIContainer } from '../../../core/di/container';
import { CacheService } from '../../../infrastructure/cache/cache.service';
import { TOKENS } from '../../../core/di/tokens';
import { CacheManager } from '../../../infrastructure/cache/cache.manager';
import { rateLimitMiddleware } from '../../../infrastructure/rate-limit/rate-limit.middleware';

export function createUserRoutes(): Router {
  const router = Router();
  const userController = new UserController();

  // Health check
  router.get('/health', (_req: Request, res: Response) => {
    res.json({ message: 'User routes are working!' });
  });

  // Cache debugging routes (should be protected in production)
  router.get('/cache-status/:id', async (req: Request, res: Response) => {
    const cacheService = DIContainer.resolve<CacheService>(TOKENS.CacheService);
    const key = `UserService:findUserById:${req.params.id}`;
    const exists = await cacheService.get(key);
    res.json({
      cached: exists !== null,
      key,
      data: exists,
    });
  });

  router.delete('/cache/flush', async (_req: Request, res: Response) => {
    const cacheService = DIContainer.resolve<CacheService>(TOKENS.CacheService);
    const cacheManager = DIContainer.resolve<CacheManager>(TOKENS.CacheManager);

    await cacheManager.flush();

    res.json({
      message: 'Cache flushed successfully',
      timestamp: new Date().toISOString(),
    });
  });

  // User CRUD routes with rate limiting

  // Create user
  router.post(
    '/',
    rateLimitMiddleware({
      max: 5, // Low limit for user creation
      windowMs: 60 * 1000, // 1 minute
      strategy: 'fixed-window',
    }),
    userController.createUser.bind(userController),
  );

  // Get all users
  router.get(
    '/',
    rateLimitMiddleware({
      max: 100,
      windowMs: 15 * 60 * 1000, // 15 minutes
      strategy: 'fixed-window',
    }),
    userController.getUsers.bind(userController),
  );

  // Get users by organization
  router.get(
    '/organization/:organizationId',
    rateLimitMiddleware({
      max: 100,
      windowMs: 15 * 60 * 1000,
      strategy: 'fixed-window',
    }),
    userController.getUsersByOrganization.bind(userController),
  );

  // Get user by username (before :id to avoid conflicts)
  router.get(
    '/username/:username',
    rateLimitMiddleware({
      max: 100,
      windowMs: 15 * 60 * 1000,
      strategy: 'fixed-window',
    }),
    userController.getUserByUsername.bind(userController),
  );

  // Get user by ID
  router.get(
    '/:id',
    rateLimitMiddleware({
      max: 100,
      windowMs: 15 * 60 * 1000,
      strategy: 'fixed-window',
    }),
    userController.getUserById.bind(userController),
  );

  // Update user
  router.put(
    '/:id',
    rateLimitMiddleware({
      max: 20,
      windowMs: 15 * 60 * 1000,
      strategy: 'fixed-window',
    }),
    userController.updateUser.bind(userController),
  );

  // Delete user (supports ?hard=true for hard delete)
  router.delete(
    '/:id',
    rateLimitMiddleware({
      max: 10,
      windowMs: 15 * 60 * 1000,
      strategy: 'fixed-window',
    }),
    userController.deleteUser.bind(userController),
  );

  // TODO: Add these routes later
  // router.post('/:id/change-password', userController.changePassword.bind(userController));
  // router.patch('/:id/preferences', userController.updatePreferences.bind(userController));
  // router.post('/:id/verify-email', userController.verifyEmail.bind(userController));
  // router.post('/:id/resend-verification', userController.resendVerification.bind(userController));
  // router.post('/search', userController.searchUsers.bind(userController));
  // router.patch('/:id/status', userController.updateStatus.bind(userController)); // Admin only
  // router.post('/bulk', userController.bulkCreate.bind(userController)); // Admin only
  // router.delete('/bulk', userController.bulkDelete.bind(userController)); // Admin only

  return router;
}
