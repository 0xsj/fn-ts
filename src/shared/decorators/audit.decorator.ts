import { DIContainer } from '../../core/di/container';
import { TOKENS } from '../../core/di/tokens';
import { AnalyticsService, AuditContext } from '../../domain/services/analytics.service';
import { AuditLog } from '../../domain/entities';
import { isSuccessResponse } from '../response';

export function Audit(
  action: AuditLog['action'],
  entityType: string,
  options?: {
    entityIdPath?: string; // Path to entity ID in method args (e.g., '0.id' for first arg's id property)
    entityIdArgIndex?: number; // Index of entity ID in method args
    trackChanges?: boolean; // Whether to track before/after changes
    includeResult?: boolean; // Include method result in metadata
    includeArgs?: boolean; // Include method args in metadata
    skipOnError?: boolean; // Skip audit if method throws
  },
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      
      // Lazy resolution - only when method is called
      let analyticsService: AnalyticsService;
      try {
        analyticsService = DIContainer.resolve<AnalyticsService>(TOKENS.AnalyticsService);
      } catch (error) {
        console.warn('AnalyticsService not available, skipping audit', error);
        return originalMethod.apply(this, args);
      }

      // Extract entity ID
      let entityId: string = '';
      if (options?.entityIdPath) {
        // Navigate path like '0.id' to get args[0].id
        const parts = options.entityIdPath.split('.');
        let value: any = args;
        for (const part of parts) {
          value = value?.[part];
        }
        entityId = String(value || '');
      } else if (options?.entityIdArgIndex !== undefined) {
        entityId = String(args[options.entityIdArgIndex] || '');
      } else {
        // Default to first argument
        entityId = String(args[0] || '');
      }

      // Get context from 'this' - assumes service has access to request context
      const context = (this as any).context || {};

      // For tracking changes, get "before" state if needed
      let beforeState: any = null;
      if (options?.trackChanges && action === 'update') {
        // Attempt to get current state - this assumes a findById method exists
        if (typeof (this as any).findById === 'function') {
          try {
            const result = await (this as any).findById(entityId);
            if (isSuccessResponse(result)) {
              beforeState = result.body().data;
            }
          } catch (error) {
            // Ignore errors getting before state
          }
        }
      }

      try {
        // Execute the original method
        const result = await originalMethod.apply(this, args);

        // Only log on success
        if (isSuccessResponse(result)) {
          const duration = Date.now() - startTime;

          // Build metadata
          const metadata: Record<string, any> = {
            method: `${target.constructor.name}.${propertyKey}`,
            duration,
          };

          if (options?.includeArgs) {
            metadata.args = args;
          }

          if (options?.includeResult) {
            metadata.result = result.body().data;
          }

          // Track changes if applicable
          let changes: AuditLog['changes'] = null;
          if (options?.trackChanges && beforeState && result.body().data) {
            const afterState = result.body().data as Record<string, any>; // Cast to Record<string, any>
            changes = analyticsService.extractChanges(beforeState, afterState);
          }

          // Create audit log
          await analyticsService.log(entityType, entityId, action, context, {
            changes,
            status: 'success',
            metadata,
            durationMs: duration,
          });
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        // Log failure unless skipOnError is true
        if (!options?.skipOnError) {
          await analyticsService.log(entityType, entityId, action, context, {
            status: 'failure',
            errorMessage: error instanceof Error ? error.message : String(error),
            metadata: {
              method: `${target.constructor.name}.${propertyKey}`,
              duration,
            },
            durationMs: duration,
          });
        }

        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Convenience decorators for common actions
 */
export const AuditCreate = (entityType: string, options?: any) =>
  Audit('create', entityType, options);

export const AuditUpdate = (entityType: string, options?: any) =>
  Audit('update', entityType, { trackChanges: true, ...options });

export const AuditDelete = (entityType: string, options?: any) =>
  Audit('delete', entityType, options);

export const AuditRead = (entityType: string, options?: any) =>
  Audit('read', entityType, { skipOnError: true, ...options });

export const AuditLogin = () => Audit('login', 'auth', { entityIdPath: '0.email' });

export const AuditLogout = () => Audit('logout', 'auth', { entityIdArgIndex: 0 });

/**
 * Method decorator for custom audit actions
 */
export function AuditAction(config: {
  action: AuditLog['action'];
  entityType: string;
  getEntityId: (args: any[]) => string;
  getMessage?: (args: any[], result?: any) => string;
}) {
  return Audit(config.action, config.entityType, {
    entityIdPath: undefined,
    entityIdArgIndex: undefined,
  });
}

export function AuditWithContext(
  action: AuditLog['action'],
  entityType: string,
  options?: {
    entityIdResolver?: (args: any[]) => string;
    contextResolver?: (instance: any, args: any[]) => AuditContext;
    trackChanges?: boolean;
    includeResult?: boolean;
    includeArgs?: boolean;
  },
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      
      // Lazy resolution - only when method is called
      let analyticsService: AnalyticsService;
      try {
        analyticsService = DIContainer.resolve<AnalyticsService>(TOKENS.AnalyticsService);
      } catch (error) {
        console.warn('AnalyticsService not available, skipping audit', error);
        return originalMethod.apply(this, args);
      }

      // Resolve entity ID
      const entityId = options?.entityIdResolver
        ? options.entityIdResolver(args)
        : String(args[0] || '');

      // Resolve context - default looks for correlationId in args
      const correlationId = args.find(
        (arg) =>
          typeof arg === 'string' &&
          arg.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
      );

      const context: AuditContext = options?.contextResolver
        ? options.contextResolver(this, args)
        : { correlationId };

      // For tracking changes, get "before" state if needed
      let beforeState: any = null;
      if (options?.trackChanges && action === 'update') {
        if (typeof (this as any).findById === 'function') {
          try {
            const result = await (this as any).findById(entityId, correlationId);
            if (isSuccessResponse(result)) {
              beforeState = result.body().data;
            }
          } catch (error) {
            // Ignore errors getting before state
          }
        }
      }

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;

        if (isSuccessResponse(result)) {
          // Build metadata
          const metadata: Record<string, any> = {
            method: `${target.constructor.name}.${propertyKey}`,
            duration,
          };

          if (options?.includeArgs) {
            metadata.args = args;
          }

          if (options?.includeResult) {
            metadata.result = result.body().data;
          }

          // Track changes if applicable
          let changes: AuditLog['changes'] = null;
          if (options?.trackChanges && beforeState && result.body().data) {
            const afterState = result.body().data as Record<string, any>;
            changes = analyticsService.extractChanges(beforeState, afterState);
          }

          await analyticsService.log(entityType, entityId, action, context, {
            changes,
            status: 'success',
            metadata,
            durationMs: duration,
          });
        } else {
          // Log failure from error response
          const errorResponse = result as any;
          await analyticsService.log(entityType, entityId, action, context, {
            status: 'failure',
            errorMessage: errorResponse.message || 'Operation failed',
            metadata: {
              method: `${target.constructor.name}.${propertyKey}`,
              duration,
              errorCode: errorResponse.code,
            },
            durationMs: duration,
          });
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        await analyticsService.log(entityType, entityId, action, context, {
          status: 'failure',
          errorMessage: error instanceof Error ? error.message : String(error),
          metadata: {
            method: `${target.constructor.name}.${propertyKey}`,
            duration,
            errorType: error?.constructor?.name,
          },
          durationMs: duration,
        });

        throw error;
      }
    };

    return descriptor;
  };
}

export const AuditCreateWithContext = (entityType: string, options?: any) =>
  AuditWithContext('create', entityType, { includeResult: true, ...options });

export const AuditUpdateWithContext = (entityType: string, options?: any) =>
  AuditWithContext('update', entityType, { trackChanges: true, ...options });

export const AuditDeleteWithContext = (entityType: string, options?: any) =>
  AuditWithContext('delete', entityType, options);