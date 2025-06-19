// src/shared/middleware/error-handler.middleware.ts
import type { Request, Response, NextFunction } from 'express';
import { InternalServerError } from '../response/http-error';
import { logger } from '../utils/logger';
import { errorToLogContext } from '../utils/error-serializer';

export function errorHandlerMiddleware(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const correlationId = req.context?.correlationId;

  logger.error(
    errorToLogContext(error, correlationId, {
      path: req.path,
      method: req.method,
    }),
    'Unhandled error',
  );

  const response = new InternalServerError(correlationId, {
    message: error instanceof Error ? error.message : 'Unknown error',
    ...(process.env.NODE_ENV === 'development' && {
      stack: error instanceof Error ? error.stack : undefined,
    }),
  });

  req.context?.setResponse(response);
  response.send(res);
}
