import { BaseError } from './base.error';

export class NotFoundError extends BaseError {
  public readonly code = -32404;
  public readonly httpStatusCode = 404;

  public readonly resourceType: string;

  public readonly identifier: string | number;

  public readonly searchContext: string;

  public readonly searchMetadata?: Record<string, unknown>;

  constructor(
    resourceType: string,
    identifier: string | number,
    searchContext: string,
    searchMetadata?: Record<string, unknown>,
    correlationId?: string,
  ) {
    super(correlationId);
    this.resourceType = resourceType;
    this.identifier = identifier;
    this.searchContext = searchContext;
    this.searchMetadata = searchMetadata;
  }

  public get message(): string {
    return `${this.resourceType} not found for ${this.searchContext}: ${this.identifier}`;
  }

  public toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      resourceType: this.resourceType,
      identifier: this.identifier,
      searchContext: this.searchContext,
      searchMetadata: this.searchMetadata,
    };
  }
}
