import { Router } from 'express';
import { createUserRoutes } from './user.routes';
import { createQueueRoutes } from './queue.routes';

export function createV1Routes(): Router {
  const router = Router();
  router.use('/users', createUserRoutes());
  router.use('/test', createQueueRoutes());

  return router;
}
