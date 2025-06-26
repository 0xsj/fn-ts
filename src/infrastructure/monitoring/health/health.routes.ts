// src/infrastructure/monitoring/health/health.routes.ts
import { Router } from 'express';
import { HealthController } from './health.controller';

export function createHealthRoutes(): Router {
  const router = Router();
  const healthController = new HealthController();

  // Full health check with all indicators
  router.get('/health', healthController.getHealth.bind(healthController));

  // Kubernetes-style endpoints
  router.get('/health/live', healthController.getLiveness.bind(healthController));
  router.get('/health/ready', healthController.getReadiness.bind(healthController));

  return router;
}
