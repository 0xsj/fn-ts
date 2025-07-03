// src/app.ts
import express, { type Application, type Request, type Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { logger } from './shared/utils/logger';
import { contextMiddleware } from './shared/middleware/context.middleware';
import { responseLoggerMiddleware } from './shared/middleware/response-logger.middleware';
import { errorHandlerMiddleware } from './shared/middleware/error-handler.middleware';
import { createHealthRoutes } from './infrastructure/monitoring/health/health.routes';
import { createV1Routes } from './api/v1/routes';
import { DIContainer } from './core/di/container';
import { requestLoggerMiddleware } from './shared/middleware';
import { createSwaggerRoutes } from './docs/swagger.routes';
import { createPrometheusRoutes } from './infrastructure/monitoring/metrics/prometheus.routes';
import { prometheusMiddleware } from './infrastructure/monitoring/metrics/prometheus/prometheus-middleware';
import { setupBullBoard } from './infrastructure/queue/bull-board'; // Add this import

const app: Application = express();

// Basic middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom middleware
app.use(contextMiddleware);
app.use(responseLoggerMiddleware);
app.use(requestLoggerMiddleware);
app.use(prometheusMiddleware());

export async function initializeApp(): Promise<void> {
  try {
    logger.info('Initializing DI Container...');
    await DIContainer.initialize();

    logger.info('Setting up routes...');
    
    // Health and monitoring routes
    app.use('/', createHealthRoutes());
    app.use('/', createPrometheusRoutes());
    
    // API documentation
    app.use('/api', createSwaggerRoutes());
    
    // Bull Board - Add this after DI container is initialized
    try {
      const bullBoardAdapter = setupBullBoard();
      app.use('/admin/queues', bullBoardAdapter.getRouter());
      logger.info('Bull Board available at /admin/queues');
    } catch (error) {
      logger.error('Failed to setup Bull Board', { error });
      // Don't fail app startup if Bull Board fails
    }
    
    // API routes
    app.use('/api/v1', createV1Routes());

    // 404 handler
    app.use((_req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource was not found',
      });
    });

    // Error handler (should be last)
    app.use(errorHandlerMiddleware);

    logger.info('App initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize app', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      errorType: error?.constructor?.name,
      errorDetails: error,
    });
    throw error;
  }
}

export default app;