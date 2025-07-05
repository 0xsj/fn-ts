// src/api/v1/routes/organization.routes.ts
import { Router } from 'express';
import { container } from 'tsyringe';
import { OrganizationController } from '../controller/organization.controller';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';

export function createOrganizationRoutes(): Router {
  const router = Router();

  // Resolve controller from DI container
  const controller = container.resolve(OrganizationController);

  router.post('/', authMiddleware, controller.createOrganization.bind(controller));
  router.get('/:id', authMiddleware, controller.getOrganizationById.bind(controller));
  router.get('/by-slug/:slug', authMiddleware, controller.getOrganizationBySlug.bind(controller));

  return router;
}
