import { Router } from 'express';
import { createUserRoutes } from './user.routes';
import { createQueueRoutes } from './queue.routes';
import { createAuthRoutes } from './auth.routes';
import { createOrganizationRoutes } from './organization.routes';

export function createV1Routes(): Router {
  const router = Router();
  router.use('/users', createUserRoutes());
  router.use('/test', createQueueRoutes());
  router.use('/auth', createAuthRoutes());
  router.use('/organizations', createOrganizationRoutes());

  return router;
}
