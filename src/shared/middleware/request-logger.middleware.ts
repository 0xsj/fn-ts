// src/shared/middleware/request-logger.middleware.ts
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Create request-specific logger
  const requestLogger = logger.withRequest(req.context);

  // Log incoming request
  requestLogger.info({
    msg: 'Incoming request',
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Log request body for non-GET requests (be careful with sensitive data)
  if (req.method !== 'GET' && req.body && Object.keys(req.body).length > 0) {
    requestLogger.debug({
      msg: 'Request body',
      body: req.body, // Pino will apply redaction rules
    });
  }

  // Capture response finish event
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const level = res.statusCode >= 400 ? 'error' : 'info';

    requestLogger[level]({
      msg: 'Request finished', // Changed from "Request completed"
      statusCode: res.statusCode,
      duration,
      method: req.method,
      path: req.originalUrl || req.path,
    });
  });

  next();
}
