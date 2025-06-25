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
import { requestLoggerMiddleware } from './shared/middleware';

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

export async function initializeApp(): Promise<void> {
  try {
    await DIContainer.initialize();

    app.use('/api/v1', createV1Routes());

    app.use((_req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource was not found',
      });
    });

    app.use(errorHandlerMiddleware);

    logger.info('App initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize app', error);
    throw error;
  }
}

app.use(errorHandlerMiddleware);

export default app;
