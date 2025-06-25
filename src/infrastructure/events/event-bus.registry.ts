// src/infrastructure/events/event-bus.registry.ts
import { EventBus } from './event-bus';
import { SendWelcomeEmailHandler } from './handlers/user/send-welcome-email.handler';
import { InvalidateUserCacheHandler } from './handlers/user/invalidate-user-cache.handler';
import { AuditLogHandler } from './handlers/audit/audit-log.handler';
import { logger } from '../../shared/utils/logger';

export function registerEventHandlers(eventBus: EventBus): void {
  logger.info('Registering event handlers');

  try {
    // Create handler instances
    const welcomeEmailHandler = new SendWelcomeEmailHandler();
    const cacheInvalidator = new InvalidateUserCacheHandler();
    const auditLogger = new AuditLogHandler();

    // Register handlers for user events
    eventBus.on('user.created', welcomeEmailHandler);
    eventBus.on('user.updated', cacheInvalidator);
    eventBus.on('user.deleted', cacheInvalidator);

    // Register audit logger for all user events
    eventBus.on('user.created', auditLogger);
    eventBus.on('user.updated', auditLogger);
    eventBus.on('user.deleted', auditLogger);

    logger.info('Event handlers registered successfully', {
      handlers: {
        'user.created': 2, // welcome email + audit
        'user.updated': 2, // cache invalidation + audit
        'user.deleted': 2, // cache invalidation + audit
      }
    });
  } catch (error) {
    logger.error('Failed to register event handlers', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}