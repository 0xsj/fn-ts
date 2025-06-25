// import { Router, Request, Response } from 'express';
// import { UserController } from '../controller/user.controller';
// import { DIContainer } from '../../../core/di/container';
// import { CacheService } from '../../../infrastructure/cache/cache.service';
// import { TOKENS } from '../../../core/di/tokens';
// import { CacheManager } from '../../../infrastructure/cache/cache.manager';

// export function createUserRoutes(): Router {
//   const router = Router();
//   const userController = new UserController();

//   router.get('/health', (_req: Request, res: Response) => {
//     res.json({ message: 'User routes are working!' });
//   });

//   router.get('/cache-status/:id', async (req: Request, res: Response) => {
//     const cacheService = DIContainer.resolve<CacheService>(TOKENS.CacheService);
//     const key = `UserService:findUserById:${req.params.id}`;
//     const exists = await cacheService.get(key);
//     res.json({
//       cached: exists !== null,
//       key,
//       data: exists,
//     });
//   });

//   // src/api/v1/routes/user.routes.ts
//   router.delete('/cache/flush', async (_req: Request, res: Response) => {
//     const cacheService = DIContainer.resolve<CacheService>(TOKENS.CacheService);
//     const cacheManager = DIContainer.resolve<CacheManager>(TOKENS.CacheManager);

//     await cacheManager.flush();

//     res.json({
//       message: 'Cache flushed successfully',
//       timestamp: new Date().toISOString(),
//     });
//   });

//   router.post('/', userController.createUser.bind(userController));
//   router.get('/', userController.getUsers.bind(userController));
//   router.get('/:id', userController.getUserById.bind(userController));
//   router.put('/:id', userController.updateUser.bind(userController));
//   router.delete('/:id', userController.deleteUser.bind(userController));

//   return router;
// }


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

  router.get('/health', (_req: Request, res: Response) => {
    res.json({ message: 'User routes are working!' });
  });

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

  // Apply rate limiting to routes with fixed window for testing
  router.post('/', rateLimitMiddleware({
    max: 5, // Low limit for testing
    windowMs: 60 * 1000, // 1 minute
    strategy: 'fixed-window', // Use simpler strategy for now
  }), userController.createUser.bind(userController));
  
  router.get('/', rateLimitMiddleware({
    max: 100,
    windowMs: 15 * 60 * 1000,
    strategy: 'fixed-window',
  }), userController.getUsers.bind(userController));
  
  router.get('/:id', rateLimitMiddleware({
    max: 100,
    windowMs: 15 * 60 * 1000,
    strategy: 'fixed-window',
  }), userController.getUserById.bind(userController));
  
  router.put('/:id', rateLimitMiddleware({
    max: 20,
    windowMs: 15 * 60 * 1000,
    strategy: 'fixed-window',
  }), userController.updateUser.bind(userController));
  
  router.delete('/:id', rateLimitMiddleware({
    max: 10,
    windowMs: 15 * 60 * 1000,
    strategy: 'fixed-window',
  }), userController.deleteUser.bind(userController));

  return router;
}