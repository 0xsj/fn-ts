// src/shared/middleware/error-handler.middleware.ts
import type { Request, Response, NextFunction } from 'express';
import { InternalServerError } from '../response/http-error';
import { logger } from '../utils/logger';

export function errorHandlerMiddleware(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const correlationId = req.context?.correlationId;
  const requestLogger = req.context ? logger.withRequest(req.context) : logger;

  // Log the error with proper Pino error serialization
  requestLogger.error({
    err: error instanceof Error ? error : new Error(String(error)),
    msg: 'Unhandled error in request',
    path: req.path,
    method: req.method,
  });

  const response = new InternalServerError(correlationId, {
    message: error instanceof Error ? error.message : 'Unknown error',
    ...(process.env.NODE_ENV === 'development' && {
      stack: error instanceof Error ? error.stack : undefined,
    }),
  });

  req.context?.setResponse(response);
  response.send(res);
}
