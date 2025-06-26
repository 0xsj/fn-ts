// import pino from 'pino';

// export const logger = pino({
//   level: process.env.LOG_LEVEL || 'info',
//   transport:
//     process.env.NODE_ENV != 'production'
//       ? {
//           target: 'pino-pretty',
//           options: {
//             colorize: true,
//             options: {
//               ignore: 'pid,hostname',
//               translateTime: 'SYS:standard',
//             },
//           },
//         }
//       : undefined,
// });

// src/shared/utils/logger.ts
import { loggerFactory } from '../../infrastructure/monitoring/logging/logger.factory';

// Export the default logger
export const logger = loggerFactory.getLogger();

// Export factory for creating module-specific loggers
export { loggerFactory };

// Helper to create module loggers
export function createLogger(module: string) {
  return loggerFactory.getLogger(module);
}

// Re-export useful types
export type { ILogger } from '../../infrastructure/monitoring/logging/logger.factory';
export type { Logger } from 'pino';

// Graceful shutdown helper
export async function shutdownLogger(): Promise<void> {
  await loggerFactory.flush();
}

// Process handlers for graceful shutdown
if (process.env.NODE_ENV !== 'test') {
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully');
    await shutdownLogger();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully');
    await shutdownLogger();
    process.exit(0);
  });

  process.on('uncaughtException', async (error) => {
    logger.fatal(error, 'Uncaught exception');
    await shutdownLogger();
    process.exit(1);
  });

  process.on('unhandledRejection', async (reason, promise) => {
    logger.fatal(`Unhandled rejection at: ${promise}, reason: ${reason}`, { reason, promise });
    await shutdownLogger();
    process.exit(1);
  });
}
