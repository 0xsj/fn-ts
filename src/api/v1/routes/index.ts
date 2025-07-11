// src/api/v1/routes/index.ts
import { Router } from 'express';
import { createUserRoutes } from './user.routes';
import { createQueueRoutes } from './queue.routes';
import { createAuthRoutes } from './auth.routes';
import { createOrganizationRoutes } from './organization.routes';
import { logger } from '../../../shared/utils/logger';
import { createOperationsRoutes } from './operations.routes';

export function createV1Routes(): Router {
  const router = Router();

  try {
    logger.info('Creating user routes...');
    router.use('/users', createUserRoutes());
    logger.info('User routes created successfully');
  } catch (error) {
    logger.error('Failed to create user routes', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }

  try {
    logger.info('Creating queue test routes...');
    router.use('/test', createQueueRoutes());
    logger.info('Queue test routes created successfully');
  } catch (error) {
    logger.error('Failed to create queue routes', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }

  try {
    logger.info('Creating auth routes...');
    router.use('/auth', createAuthRoutes());
    logger.info('Auth routes created successfully');
  } catch (error) {
    logger.error('Failed to create auth routes', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }

  try {
    logger.info('Creating organization routes...');
    router.use('/organizations', createOrganizationRoutes());
    logger.info('Organization routes created successfully');
  } catch (error) {
    logger.error('Failed to create organization routes', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }

  try {
    logger.info('Creating operations routes...');
    router.use('/operations', createOperationsRoutes());
    logger.info('Operations routes created successfully');
  } catch (error) {
    logger.error('Failed to create operations routes', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }

  logger.info('All V1 routes created successfully');
  return router;
}
