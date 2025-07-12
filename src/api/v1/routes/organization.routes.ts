// src/api/v1/routes/organization.routes.ts
import { Router } from 'express';
import { container } from 'tsyringe';
import { OrganizationController } from '../controller/organization.controller';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { rateLimitMiddleware } from '../../../infrastructure/rate-limit/rate-limit.middleware';

export function createOrganizationRoutes(): Router {
  const router = Router();

  // Resolve controller from DI container
  const controller = container.resolve(OrganizationController);

  router.post('/', authMiddleware, controller.createOrganization.bind(controller));
  router.get('/:id', authMiddleware, controller.getOrganizationById.bind(controller));
  router.get('/by-slug/:slug', authMiddleware, controller.getOrganizationBySlug.bind(controller));
  router.put(
    '/:id',
    authMiddleware,
    rateLimitMiddleware({
      max: 20,
      windowMs: 15 * 60 * 1000, // 15 minutes
      strategy: 'fixed-window',
    }),
    controller.updateOrganization.bind(controller),
  );
  return router;
}
