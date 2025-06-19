import { ErrorResponse } from './error-response';
import type { z } from 'zod';

export class ValidationError extends ErrorResponse {
  public readonly kind = 'validation-error' as const;
  public readonly statusCode = 400;
  public readonly code = 'VALIDATION_ERROR';
  public readonly message = 'Validation failed';

  constructor(
    public readonly errors: z.ZodIssue[] | Record<string, string[]>,
    correlationId?: string,
  ) {
    super(correlationId, errors);
  }

  static fromZodError(error: z.ZodError, correlationId?: string): ValidationError {
    return new ValidationError(error.issues, correlationId);
  }
}

export class RateLimitError extends ErrorResponse {
  public readonly kind = 'rate-limit' as const;
  public readonly statusCode = 429;
  public readonly code = 'RATE_LIMIT_EXCEEDED';
  public readonly message = 'Rate limit exceeded';

  constructor(
    public readonly retryAfter: number,
    correlationId?: string,
    limit?: number,
  ) {
    super(correlationId, { retryAfter, limit });
  }
}

export class DatabaseError extends ErrorResponse {
  public readonly kind = 'database-error' as const;
  public readonly statusCode = 500;
  public readonly code = 'DATABASE_ERROR';
  public readonly message = 'Database operation failed';

  constructor(
    public readonly operation: string,
    originalError?: unknown,
    correlationId?: string,
  ) {
    super(correlationId, { operation, originalError });
  }
}

export class ExternalServiceError extends ErrorResponse {
  public readonly kind = 'external-service-error' as const;
  public readonly statusCode = 502;
  public readonly code = 'EXTERNAL_SERVICE_ERROR';
  public readonly message = 'External service error';

  constructor(
    public readonly service: string,
    originalError?: unknown,
    correlationId?: string,
  ) {
    super(correlationId, { service, originalError });
  }
}
