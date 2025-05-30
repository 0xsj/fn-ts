import { BaseError } from './base.error';

export class UnauthorizedError extends BaseError {
  public readonly code = -32401;
  public readonly httpStatusCode = 401;

  public readonly reason: string;

  public readonly authMethod: string;

  public readonly authContext?: Record<string, unknown>;

  constructor(
    reason: string,
    authMethod: string = 'jwt',
    authContext?: Record<string, unknown>,
    correlationId?: string,
  ) {
    super(correlationId);
    this.reason = reason;
    this.authMethod = authMethod;
    this.authContext = authContext;
  }

  public get message(): string {
    return `Unauthorized: ${this.reason}`;
  }

  public toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      reason: this.reason,
      authMethod: this.authMethod,
      authContext: this.authContext,
    };
  }
}
