import { Router, Request, Response } from 'express';
import { UserController } from '../controller/user.controller';
import { DIContainer } from '../../../core/di/container';
import { CacheService } from '../../../infrastructure/cache/cache.service';
import { TOKENS } from '../../../core/di/tokens';

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
      data: exists 
    });
  });

  router.post('/', userController.createUser.bind(userController));
  router.get('/', userController.getUsers.bind(userController));
  router.get('/:id', userController.getUserById.bind(userController));
  router.put('/:id', userController.updateUser.bind(userController));
  router.delete('/:id', userController.deleteUser.bind(userController));

  return router;
}
