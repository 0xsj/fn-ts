import { ApiJsonResponse } from './base-response';

export interface ErrorResponseBody {
  success: false;
  kind: string;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    correlationId?: string;
    timestamp: string;
    path?: string;
    method?: string;
    [key: string]: unknown;
  };
}

export abstract class ErrorResponse extends ApiJsonResponse<ErrorResponseBody> {
  public readonly success = false as const;
  public abstract readonly kind: string;
  public abstract readonly statusCode: number;
  public abstract readonly code: string;
  public abstract readonly message: string;
  public readonly timestamp: string;

  constructor(
    public readonly correlationId?: string,
    public readonly details?: unknown,
    protected readonly meta?: Record<string, unknown>,
  ) {
    super();
    this.timestamp = new Date().toISOString();
  }

  public body(): ErrorResponseBody {
    return {
      success: false,
      kind: this.kind,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
      meta: {
        correlationId: this.correlationId,
        timestamp: this.timestamp,
        ...this.meta,
      },
    };
  }
}
