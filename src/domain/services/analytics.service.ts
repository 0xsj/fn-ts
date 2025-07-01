// src/domain/services/audit.service.ts
import { injectable, inject } from 'tsyringe';
import { TOKENS } from '../../core/di/tokens';
import type { IAnalytics } from '../interface/analytics.interface';
import type { AuditLog, AuditQuery } from '../entities';
import type { AsyncResult } from '../../shared/response';
import { ResponseBuilder, isSuccessResponse } from '../../shared/response';
import { ActionSeverityMap } from '../entities/schemas/analytics.schema';

export interface AuditContext {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  organizationId?: string;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}

@injectable()
export class AnalyticsService {
  constructor(@inject(TOKENS.AnalyticsRepository) private analyticsRepo: IAnalytics) {}

  /**
   * Create an audit log entry
   */
  async log(
    entityType: string,
    entityId: string,
    action: AuditLog['action'],
    context: AuditContext,
    options?: {
      changes?: AuditLog['changes'];
      status?: 'success' | 'failure';
      errorMessage?: string;
      metadata?: Record<string, unknown>;
      durationMs?: number;
    },
  ): AsyncResult<boolean> {
    try {
      // Determine severity based on action
      const severity = ActionSeverityMap[action] || 'low';

      const auditLog: Omit<AuditLog, 'id' | 'createdAt' | 'updatedAt'> = {
        // Entity info
        entityType,
        entityId,
        action,

        // Actor info from context
        userId: context.userId || null,
        userEmail: context.userEmail || null,
        userRole: context.userRole || null,

        // Organization context
        organizationId: context.organizationId || null,

        // Request context
        ipAddress: context.ipAddress || null,
        userAgent: context.userAgent || null,
        correlationId: context.correlationId || null,

        // Change tracking
        changes: options?.changes || null,

        // Status and performance
        status: options?.status || 'success',
        errorMessage: options?.errorMessage || null,
        durationMs: options?.durationMs || null,

        // Risk/Security
        severity,

        // Additional metadata
        metadata: options?.metadata || null,
      };

      return await this.analyticsRepo.createAuditLog(auditLog);
    } catch (error) {
      // Log the error but don't fail the operation
      console.error('Failed to create audit log:', error);
      return ResponseBuilder.ok(false);
    }
  }

  /**
   * Log a successful action
   */
  async logSuccess(
    entityType: string,
    entityId: string,
    action: AuditLog['action'],
    context: AuditContext,
    changes?: AuditLog['changes'],
    metadata?: Record<string, unknown>,
  ): AsyncResult<boolean> {
    return this.log(entityType, entityId, action, context, {
      status: 'success',
      changes,
      metadata,
    });
  }

  /**
   * Log a failed action
   */
  async logFailure(
    entityType: string,
    entityId: string,
    action: AuditLog['action'],
    context: AuditContext,
    error: string | Error,
    metadata?: Record<string, unknown>,
  ): AsyncResult<boolean> {
    return this.log(entityType, entityId, action, context, {
      status: 'failure',
      errorMessage: error instanceof Error ? error.message : error,
      metadata,
    });
  }

  /**
   * Query audit logs
   */
  async queryAuditLogs(query: AuditQuery): AsyncResult<{
    logs: AuditLog[];
    total: number;
    hasMore: boolean;
  }> {
    return this.analyticsRepo.findAuditLogs(query);
  }

  /**
   * Get audit history for a specific entity
   */
  async getEntityHistory(
    entityType: string,
    entityId: string,
    limit?: number,
  ): AsyncResult<AuditLog[]> {
    return this.analyticsRepo.findAuditLogsByEntity(entityType, entityId, limit);
  }

  /**
   * Get user activity
   */
  async getUserActivity(userId: string, limit?: number): AsyncResult<AuditLog[]> {
    return this.analyticsRepo.findAuditLogsByUser(userId, limit);
  }

  /**
   * Helper to extract changes between two objects
   */
  extractChanges<T extends Record<string, any>>(
    before: T | null,
    after: T,
    fieldsToTrack?: (keyof T)[],
  ): AuditLog['changes'] | null {
    if (!before) return null;

    const fields = fieldsToTrack || (Object.keys(after) as (keyof T)[]);
    const changedFields: string[] = [];
    const beforeValues: Record<string, unknown> = {};
    const afterValues: Record<string, unknown> = {};

    for (const field of fields) {
      if (before[field] !== after[field]) {
        changedFields.push(String(field));
        beforeValues[String(field)] = before[field];
        afterValues[String(field)] = after[field];
      }
    }

    if (changedFields.length === 0) {
      return null;
    }

    return {
      before: beforeValues,
      after: afterValues,
      fieldsChanged: changedFields,
    };
  }

  /**
   * Build context from Express request
   */
  buildContextFromRequest(req: any): AuditContext {
    return {
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      organizationId: req.user?.organizationId,
      ipAddress: req.ip || req.socket?.remoteAddress,
      userAgent: req.headers?.['user-agent'],
      correlationId: req.context?.correlationId,
    };
  }
}
