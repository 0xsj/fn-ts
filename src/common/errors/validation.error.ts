import { BaseError } from './base.error';

export class ValidationError extends BaseError {
  public readonly code = -32602;
  public readonly httpStatusCode = 400;
  public readonly field: string;
  public readonly value: unknown;
  public readonly constraint: string;
  public readonly validationContext?: Record<string, unknown>;

  constructor(
    field: string,
    value: unknown,
    constraint: string,
    validationContext?: Record<string, unknown>,
    correlationId?: string,
  ) {
    super(correlationId);
    this.field = field;
    this.value = value;
    this.constraint = constraint;
    this.validationContext = validationContext;
  }

  public get message(): string {
    return `Validation failed for field '${this.field}': ${this.constraint}`;
  }

  public toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON,
      field: this.field,
      value: this.value,
      constraint: this.constraint,
      validationContext: this.validationContext,
    };
  }
}

export class MultipleValidationError extends BaseError {
  public readonly code = -32603;
  public readonly httpStatusCode = 400;

  /**
   * Array of individual validation errors
   */
  public readonly errors: ValidationError[];

  constructor(errors: ValidationError[], correlationId?: string) {
    super(correlationId);
    this.errors = errors;
  }

  public get message(): string {
    const fieldCount = this.errors.length;
    const fields = this.errors.map((e) => e.field).join(', ');
    return `Validation failed for ${fieldCount} field(s): ${fields}`;
  }

  public toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      errors: this.errors.map((e) => e.toJSON()),
      errorCount: this.errors.length,
    };
  }
}
