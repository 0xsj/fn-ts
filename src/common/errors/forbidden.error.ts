import { BaseError } from './base.error';

export class ForbiddenError extends BaseError {
  public readonly code = -32403;
  public readonly httpStatusCode = 403;

  public readonly resource: string;

  public readonly action: string;

  public readonly userId?: string;

  public readonly requiredPermission?: string;

  public readonly permissionContext?: Record<string, unknown>;

  constructor(
    resource: string,
    action: string,
    userId?: string,
    requiredPermission?: string,
    permissionContext?: Record<string, unknown>,
    correlationId?: string,
  ) {
    super(correlationId);
    this.resource = resource;
    this.action = action;
    this.userId = userId;
    this.requiredPermission = requiredPermission;
    this.permissionContext = permissionContext;
  }

  public get message(): string {
    return `Forbidden: Cannot ${this.action} ${this.resource}`;
  }

  public toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      resource: this.resource,
      action: this.action,
      userId: this.userId,
      requiredPermission: this.requiredPermission,
      permissionContext: this.permissionContext,
    };
  }
}
