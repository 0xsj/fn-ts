// src/shared/middleware/response-logger.middleware.ts
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { isErrorResponse } from '../response/types';
import type { ErrorResponseType } from '../response/types';

export function responseLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json;
  const startTime = Date.now();

  // Create a request-specific logger
  const requestLogger = logger.withRequest(req.context);

  res.json = function (body: any): Response {
    const context = req.context;
    const duration = Date.now() - startTime;

    if (context) {
      const response = context.getResponse();

      if (response) {
        if (isErrorResponse(response)) {
          const errorResponse = response as ErrorResponseType;
          // Use Pino's error logging properly
          requestLogger.error({
            msg: `Error response: ${errorResponse.kind}`,
            statusCode: errorResponse.statusCode,
            errorCode: errorResponse.code,
            errorKind: errorResponse.kind,
            errorMessage: errorResponse.message,
            duration,
            details: errorResponse.details,
          });
        } else {
          requestLogger.info({
            msg: 'Request completed successfully',
            statusCode: response.statusCode,
            duration,
          });
        }
      } else {
        requestLogger.warn({
          msg: 'Response sent without context',
          statusCode: res.statusCode,
          duration,
        });
      }
    }

    return originalJson.call(this, body);
  };

  next();
}