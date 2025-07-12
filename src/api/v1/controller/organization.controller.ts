import type { Request, Response, NextFunction } from 'express';
import { OrganizationService } from '../../../domain/services/organization.service';
import {
  CreateOrganizationSchema,
  UpdateOrganizationSchema,
  Organization,
} from '../../../domain/entities';
import { AsyncResult, UnauthorizedError, ValidationError } from '../../../shared/response';
import { sendError, sendOk, sendCreated } from '../../../shared/utils/response-helper';
import { isSuccessResponse } from '../../../shared/response';
import { Injectable } from '../../../core/di/decorators/injectable.decorator';
import { Inject, InjectLogger } from '../../../core/di/decorators/inject.decorator';
import { ILogger } from '../../../shared/utils';
import { AuditUpdateWithContext } from '../../../shared/decorators/audit.decorator';
import { AnalyticsService } from '../../../domain/services';
import { AuditController } from '../../../shared/decorators/audit-controller.decorator';

@Injectable()
export class OrganizationController {
  constructor(
    @Inject() private organizationService: OrganizationService,
    @Inject() private analyticsService: AnalyticsService,
    @InjectLogger() private logger: ILogger,
  ) {
    this.logger.info('OrganizationController Initialized');
  }

  private buildAuditContext(req: Request, organizationId: string) {
    return {
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: undefined,
      organizationId,
      ipAddress: req.ip || req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
      correlationId: req.context.correlationId,
    };
  }

  private async trackChanges(id: string, updates: any, correlationId?: string) {
    const beforeResult = await this.organizationService.getOrganizationById(id, correlationId);

    if (!isSuccessResponse(beforeResult) || !beforeResult.body().data) {
      return null;
    }

    const beforeOrg = beforeResult.body().data;
    const changedFields: string[] = [];
    const beforeValues: Record<string, any> = {};
    const afterValues: Record<string, any> = {};

    Object.keys(updates).forEach((field) => {
      const beforeValue = (beforeOrg as any)[field];
      const afterValue = updates[field];

      if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
        changedFields.push(field);
        beforeValues[field] = beforeValue;
        afterValues[field] = afterValue;
      }
    });

    return changedFields.length > 0
      ? {
          before: beforeValues,
          after: afterValues,
          fieldsChanged: changedFields,
        }
      : null;
  }

  async createOrganization(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validation = CreateOrganizationSchema.safeParse(req.body);

      if (!validation.success) {
        const error = ValidationError.fromZodError(validation.error, req.context.correlationId);
        return sendError(req, res, error);
      }

      // Assuming the authenticated user is the creator
      const createdBy = req.user?.id;
      if (!createdBy) {
        return sendError(req, res, new UnauthorizedError(req.context.correlationId));
      }

      const result = await this.organizationService.createOrganization(
        validation.data,
        createdBy,
        req.context.correlationId,
      );

      if (isSuccessResponse(result)) {
        const organization = result.body().data;
        sendCreated(req, res, organization);
      } else {
        sendError(req, res, result);
      }
    } catch (error) {
      next(error);
    }
  }

  async getOrganizationById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.organizationService.getOrganizationById(
        id,
        req.context.correlationId,
      );

      if (isSuccessResponse(result)) {
        const organization = result.body().data;
        sendOk(req, res, organization);
      } else {
        sendError(req, res, result);
      }
    } catch (error) {
      next(error);
    }
  }

  async getOrganizationBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { slug } = req.params;
      const result = await this.organizationService.getOrganizationBySlug(
        slug,
        req.context.correlationId,
      );

      if (isSuccessResponse(result)) {
        const organization = result.body().data;
        sendOk(req, res, organization);
      } else {
        sendError(req, res, result);
      }
    } catch (error) {
      next(error);
    }
  }

  @AuditController('organization', 'update', { trackChanges: true })
  async updateOrganization(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { id } = req.params;
    const validation = UpdateOrganizationSchema.safeParse(req.body);

    if (!validation.success) {
      const error = ValidationError.fromZodError(validation.error, req.context.correlationId);
      return sendError(req, res, error);
    }

    const result = await this.organizationService.updateOrganization(
      id,
      validation.data,
      req.context.correlationId,
    );

    if (isSuccessResponse(result)) {
      sendOk(req, res, result.body().data);
    } else {
      sendError(req, res, result);
    }
  }

  async findById(id: string, correlationId?: string) {
    return this.organizationService.findById(id, correlationId); // Return the full AsyncResult
  }
}
