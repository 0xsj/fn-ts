import { ApiJsonResponse } from './base-response';

export interface SuccessResponseBody<T = unknown> {
  success: true;
  kind: 'success';
  data: T;
  meta?: {
    correlationId?: string;
    timestamp: string;
    [key: string]: unknown;
  };
}

export class SuccessResponse<T = unknown> extends ApiJsonResponse<SuccessResponseBody<T>> {
  public readonly success = true as const;
  public readonly kind = 'success' as const;
  public readonly statusCode: number;
  public readonly timestamp: string;

  constructor(
    private readonly data: T,
    statusCode: number = 200,
    public readonly correlationId?: string,
    public readonly meta?: Record<string, unknown>,
  ) {
    super();
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
  }

  public body(): SuccessResponseBody<T> {
    return {
      success: true,
      kind: 'success',
      data: this.data,
      meta: {
        correlationId: this.correlationId,
        timestamp: this.timestamp,
        ...this.meta,
      },
    };
  }
}

// factory methods
export class ResponseBuilder {
  static ok<T>(
    data: T,
    correlationId?: string,
    meta?: Record<string, unknown>,
  ): SuccessResponse<T> {
    return new SuccessResponse(data, 200, correlationId, meta);
  }

  static created<T>(
    data: T,
    correlationId?: string,
    meta?: Record<string, unknown>,
  ): SuccessResponse<T> {
    return new SuccessResponse(data, 201, correlationId, meta);
  }

  static accepted<T>(
    data: T,
    correlationId?: string,
    meta?: Record<string, unknown>,
  ): SuccessResponse<T> {
    return new SuccessResponse(data, 202, correlationId, meta);
  }

  static noContent(correlationId?: string): SuccessResponse<null> {
    return new SuccessResponse(null, 204, correlationId);
  }
}
