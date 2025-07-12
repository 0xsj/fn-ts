import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../../domain/services';
import { OrganizationService } from '../../domain/services';
import { DIContainer } from '../../core/di/container';
import { TOKENS } from '../../core/di/tokens';
import { AuditLog } from '../../domain/entities';
import { isSuccessResponse } from '../response';

export function AuditController(
  entityType: string,
  action: AuditLog['action'],
  options?: { trackChanges?: boolean },
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (req: Request, res: Response, next: NextFunction) {
      const startTime = Date.now();
      const entityId = req.params.id;

      const analyticsService = DIContainer.resolve<AnalyticsService>(TOKENS.AnalyticsService);

      let changes = null;

      // Track changes if requested and this is an update action
      if (options?.trackChanges && action === 'update' && entityType === 'organization') {
        try {
          const orgService = DIContainer.resolve<OrganizationService>(TOKENS.OrganizationService);
          const beforeResult = await orgService.getOrganizationById(
            entityId,
            req.context.correlationId,
          );

          if (isSuccessResponse(beforeResult) && beforeResult.body().data && req.body) {
            const beforeOrg = beforeResult.body().data;
            const updates = req.body;

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

            if (changedFields.length > 0) {
              changes = {
                before: beforeValues,
                after: afterValues,
                fieldsChanged: changedFields,
              };
            }
          }
        } catch (error) {
          console.warn('Failed to track changes for audit:', error);
        }
      }

      try {
        const result = await originalMethod.call(this, req, res, next);

        // Audit log with changes
        await analyticsService.log(
          entityType,
          entityId,
          action,
          {
            userId: req.user?.id,
            userEmail: req.user?.email,
            organizationId: entityId,
            ipAddress: req.ip || req.socket?.remoteAddress,
            userAgent: req.headers['user-agent'],
            correlationId: req.context.correlationId,
          },
          {
            changes,
            status: 'success',
            metadata: {
              method: `${target.constructor.name}.${propertyKey}`,
              fieldsChanged: changes?.fieldsChanged || [],
            },
            durationMs: Date.now() - startTime,
          },
        );

        return result;
      } catch (error) {
        await analyticsService.log(
          entityType,
          entityId,
          action,
          {
            userId: req.user?.id,
            userEmail: req.user?.email,
            organizationId: entityId,
            ipAddress: req.ip || req.socket?.remoteAddress,
            userAgent: req.headers['user-agent'],
            correlationId: req.context.correlationId,
          },
          {
            changes,
            status: 'failure',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            metadata: { method: `${target.constructor.name}.${propertyKey}` },
            durationMs: Date.now() - startTime,
          },
        );
        throw error;
      }
    };
  };
}
