import { BaseError } from './base.error';

export class ConflictError extends BaseError {
  public readonly code = -32409;
  public readonly httpStatusCode = 409;

  public readonly resourceType: string;

  public readonly conflictingIdentifier: string | number;

  public readonly conflictingField: string;

  public readonly conflictType: string;

  public readonly conflictContext?: Record<string, unknown>;

  constructor(
    resourceType: string,
    conflictingIdentifier: string | number,
    conflictingField: string,
    conflictType: string,
    conflictContext?: Record<string, unknown>,
    correlationId?: string,
  ) {
    super(correlationId);
    this.resourceType = resourceType;
    this.conflictingIdentifier = conflictingIdentifier;
    this.conflictingField = conflictingField;
    this.conflictType = conflictType;
    this.conflictContext = conflictContext;
  }

  public get message(): string {
    return `${this.resourceType} conflict: ${this.conflictingField} '${this.conflictingIdentifier}' already exists`;
  }

  public toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      resourceType: this.resourceType,
      conflictingIdentifier: this.conflictingIdentifier,
      conflictingField: this.conflictingField,
      conflictType: this.conflictType,
      conflictContext: this.conflictContext,
    };
  }
}
