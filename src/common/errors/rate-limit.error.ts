import { BaseError } from './base.error';

export class RateLimitError extends BaseError {
  public readonly code = -32429;
  public readonly httpStatusCode = 429;

  public readonly endpoint: string;

  public readonly attemptCount: number;

  public readonly maxAttempts: number;

  public readonly resetTime: Date;

  public readonly windowSeconds: number;

  public readonly identifier?: string;

  public readonly rateLimitContext?: Record<string, unknown>;

  constructor(
    endpoint: string,
    attemptCount: number,
    maxAttempts: number,
    resetTime: Date,
    windowSeconds: number,
    identifier?: string,
    rateLimitContext?: Record<string, unknown>,
    correlationId?: string,
  ) {
    super(correlationId);
    this.endpoint = endpoint;
    this.attemptCount = attemptCount;
    this.maxAttempts = maxAttempts;
    this.resetTime = resetTime;
    this.windowSeconds = windowSeconds;
    this.identifier = identifier;
    this.rateLimitContext = rateLimitContext;
  }

  public get message(): string {
    const resetInSeconds = Math.ceil(
      (this.resetTime.getTime() - Date.now()) / 1000,
    );
    return `Rate limit exceeded for ${this.endpoint}: ${this.attemptCount}/${this.maxAttempts} attempts. Resets in ${resetInSeconds}s`;
  }

  public toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      endpoint: this.endpoint,
      attemptCount: this.attemptCount,
      maxAttempts: this.maxAttempts,
      resetTime: this.resetTime.toISOString(),
      windowSeconds: this.windowSeconds,
      identifier: this.identifier,
      rateLimitContext: this.rateLimitContext,
    };
  }
}
