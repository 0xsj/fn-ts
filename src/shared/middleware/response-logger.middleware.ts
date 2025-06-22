// src/shared/middleware/response-logger.middleware.ts
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { isErrorResponse } from '../response/types';
import type { ErrorResponseType } from '../response/types';

export function responseLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json;

  res.json = function (body: any): Response {
    const context = req.context;

    if (context) {
      const response = context.getResponse();

      if (response) {
        if (isErrorResponse(response)) {
          const errorResponse = response as ErrorResponseType;
          logger.error(
            {
              ...context.toLogContext(),
              statusCode: errorResponse.statusCode,
              errorCode: errorResponse.code,
              errorKind: errorResponse.kind,
              errorMessage: errorResponse.message,
            },
            `Error response: ${errorResponse.kind}`,
          );
        } else {
          logger.info(
            {
              ...context.toLogContext(),
              statusCode: response.statusCode,
            },
            'Success response sent',
          );
        }
      } else {
        logger.warn(
          {
            ...context.toLogContext(),
            statusCode: res.statusCode,
          },
          'Response sent without context',
        );
      }
    }

    return originalJson.call(this, body);
  };

  next();
}
