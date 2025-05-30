import { BaseError } from './base.error';

export class ExternalServiceError extends BaseError {
  public readonly code = -32500;
  public readonly httpStatusCode = 500;

  public readonly serviceName: string;

  public readonly operation: string;

  public readonly externalStatusCode?: number;

  public readonly externalResponse?: unknown;

  public readonly serviceContext?: Record<string, unknown>;

  constructor(
    serviceName: string,
    operation: string,
    externalStatusCode?: number,
    externalResponse?: unknown,
    serviceContext?: Record<string, unknown>,
    correlationId?: string,
  ) {
    super(correlationId);
    this.serviceName = serviceName;
    this.operation = operation;
    this.externalStatusCode = externalStatusCode;
    this.externalResponse = externalResponse;
    this.serviceContext = serviceContext;
  }

  public get message(): string {
    const statusInfo = this.externalStatusCode
      ? ` (status: ${this.externalStatusCode})`
      : '';
    return `External service '${this.serviceName}' failed during ${this.operation}${statusInfo}`;
  }

  public toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      serviceName: this.serviceName,
      operation: this.operation,
      externalStatusCode: this.externalStatusCode,
      externalResponse: this.externalResponse,
      serviceContext: this.serviceContext,
    };
  }
}
