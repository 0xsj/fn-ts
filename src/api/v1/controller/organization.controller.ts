// src/api/v1/controllers/organization.controller.ts
import { injectable } from 'tsyringe';
import type { Request, Response, NextFunction } from 'express';
import { OrganizationService } from '../../../domain/services/organization.service';
import { DIContainer } from '../../../core/di/container';
import { TOKENS } from '../../../core/di/tokens';
import { CreateOrganizationSchema, UpdateOrganizationSchema } from '../../../domain/entities';
import { UnauthorizedError, ValidationError } from '../../../shared/response';
import { sendError, sendOk, sendCreated } from '../../../shared/utils/response-helper';
import { isSuccessResponse } from '../../../shared/response';

@injectable()
export class OrganizationController {
  private organizationService: OrganizationService;

  constructor() {
    this.organizationService = DIContainer.resolve<OrganizationService>(TOKENS.OrganizationService);
  }

  /**
   * Create a new organization
   */
  async createOrganization(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validation = CreateOrganizationSchema.safeParse(req.body);

      if (!validation.success) {
        const error = ValidationError.fromZodError(validation.error, req.context.correlationId);
        return sendError(req, res, error);
      }

      // Get the authenticated user ID from the request (set by auth middleware)
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
        sendCreated(req, res, result.body().data);
      } else {
        sendError(req, res, result);
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get organization by ID
   */
  async getOrganizationById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      // TODO: Check if user has permission to view this organization
      // const userId = req.user?.id;
      // const hasAccess = await this.organizationService.checkUserAccess(id, userId);

      const result = await this.organizationService.getOrganizationById(
        id,
        req.context.correlationId,
      );

      if (isSuccessResponse(result)) {
        sendOk(req, res, result.body().data);
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
        sendOk(req, res, result.body().data);
      } else {
        sendError(req, res, result);
      }
    } catch (error) {
      next(error);
    }
  }
}
