export abstract class BaseError {
  public abstract readonly code: number;

  public abstract readonly message: string;

  public abstract readonly httpStatusCode: number;

  public readonly timestamp: Date;

  public readonly correlationId: string;

  constructor(correlationId?: string) {
    this.timestamp = new Date();
    this.correlationId = correlationId;
  }

  public toJSON(): Record<string, unknown> {
    return {
      code: this.code,
      message: this.message,
      httpStatusCode: this.httpStatusCode,
      timestamp: this.timestamp,
      correlationId: this.correlationId,
      type: this.constructor.name,
    };
  }

  public toString(): string {
    return `${this.constructor.name}: [${this.code}] ${this.message}`;
  }
}
