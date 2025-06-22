import { Router } from 'express';
import { createUserRoutes } from './user.routes';

export function createV1Routes(): Router {
  const router = Router();
  router.use('/users', createUserRoutes());

  return router;
}
