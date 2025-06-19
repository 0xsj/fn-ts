import { ErrorResponse } from './error-response';

export class BadRequestError extends ErrorResponse {
  public readonly kind = 'bad-request' as const;
  public readonly statusCode = 400;
  public readonly code = 'BAD_REQUEST';

  constructor(
    public readonly message: string = 'Bad Request',
    correlationId?: string,
    details?: unknown,
  ) {
    super(correlationId, details);
  }
}

export class UnauthorizedError extends ErrorResponse {
  public readonly kind = 'unathorized' as const;
  public readonly statusCode = 401;
  public readonly code = 'UNAUTHORIZED';
  public readonly message = 'Unauthorized';

  constructor(correlationId?: string, details?: unknown) {
    super(correlationId, details);
  }
}

export class ForbiddenError extends ErrorResponse {
  public readonly kind = 'forbidden' as const;
  public readonly statusCode: number = 403;
  public readonly code = 'FORBIDDEN';
  public readonly message = 'Forbidden';

  constructor(correlationId?: string, details?: unknown) {
    super(correlationId, details);
  }
}

export class NotFoundError extends ErrorResponse {
  public readonly kind = 'not-found' as const;
  public readonly statusCode: number = 404;
  public readonly code = 'NOT_FOUND';

  constructor(
    public readonly message: string = 'Resource not found',
    correlationId?: string,
    details?: unknown,
  ) {
    super(correlationId, details);
  }
}

export class ConflictError extends ErrorResponse {
  public readonly kind = 'conflict' as const;
  public readonly statusCode: number = 409;
  public readonly code = 'CONFLICT';

  constructor(
    public readonly message: string = 'Resource conflict',
    correlationId?: string,
    details?: unknown,
  ) {
    super(correlationId, details);
  }
}

export class InternalServerError extends ErrorResponse {
  public readonly kind = 'internal-server-error' as const;
  public readonly statusCode: number = 500;
  public readonly code = 'INTERNAL_SERVER_ERROR';
  public readonly message = 'Internal server error';

  constructor(correlationId?: string, details?: unknown) {
    super(correlationId, details);
  }
}

export class ServiceUnavailableError extends ErrorResponse {
  public readonly kind = 'service-unavailable' as const;
  public readonly statusCode: number = 503;
  public readonly code = 'SERVICE_UNAVAILABLE';
  public readonly message = 'Service temporarily unavailable';

  constructor(correlationId?: string, retryAfter?: number) {
    super(correlationId, { retryAfter });
  }
}
