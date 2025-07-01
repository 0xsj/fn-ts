// src/api/v1/routes/organization.routes.ts
import { Router } from 'express';
import { OrganizationController } from '../controller/organization.controller';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';

export function createOrganizationRoutes(): Router {
  const router = Router();
  const controller = new OrganizationController();

  router.post('/', authMiddleware, controller.createOrganization.bind(controller));

  router.get('/:id', authMiddleware, controller.getOrganization.bind(controller));

  return router;
}
