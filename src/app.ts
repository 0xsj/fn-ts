// src/app.ts
import express, { type Application, type Request, type Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { logger } from './shared/utils/logger';
import { contextMiddleware } from './shared/middleware/context.middleware';
import { responseLoggerMiddleware } from './shared/middleware/response-logger.middleware';
import { errorHandlerMiddleware } from './shared/middleware/error-handler.middleware';
import { createV1Routes } from './api/v1/routes';
import { DIContainer } from './core/di/container';

const app: Application = express();

// Basic middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom middleware
app.use(contextMiddleware);
app.use(responseLoggerMiddleware);

export async function initializeApp(): Promise<void> {
  try {
    await DIContainer.initialize();

    app.use('/api/v1', createV1Routes());

    logger.info('App initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize app', error);
    throw error;
  }
}

// Health check
app.get('/health', async (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'API is running',
    version: '1.0.0',
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
  });
});

// Error handler middleware (must be last)
app.use(errorHandlerMiddleware);

export default app;
