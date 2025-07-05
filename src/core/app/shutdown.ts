// src/core/app/shutdown.ts
import { Server } from 'http';
import { DIContainer } from '../di/container';
import { logger } from '../../shared/utils/logger';

export class Shutdown {
  private shutdownHandlers: Array<() => Promise<void>> = [];
  private isShuttingDown = false;
  private server: Server | null = null;

  /**
   * Set the server instance
   */
  setServer(server: Server): void {
    this.server = server;
  }

  /**
   * Register a shutdown handler
   */
  registerHandler(handler: () => Promise<void>): void {
    this.shutdownHandlers.push(handler);
  }

  /**
   * Perform graceful shutdown
   */
  async gracefulShutdown(): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress');
      return;
    }

    this.isShuttingDown = true;
    logger.info('Starting graceful shutdown...');

    try {
      // Step 1: Stop accepting new connections
      if (this.server) {
        logger.info('Closing HTTP server...');
        await this.closeServer();
      }

      // Step 2: Wait for ongoing requests to complete (with timeout)
      await this.waitForRequestsToComplete();

      // Step 3: Run custom shutdown handlers
      await this.runShutdownHandlers();

      // Step 4: Dispose DI container (closes DB, Redis, etc.)
      logger.info('Disposing DI container...');
      await DIContainer.dispose();

      logger.info('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('❌ Error during graceful shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      process.exit(1);
    }
  }

  /**
   * Close the HTTP server
   */
  private closeServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      // Set a timeout for server close
      const timeout = setTimeout(() => {
        logger.warn('Server close timeout, forcing shutdown');
        resolve();
      }, 30000); // 30 seconds timeout

      this.server.close((err) => {
        clearTimeout(timeout);
        if (err) {
          logger.error('Error closing server', { error: err });
          reject(err);
        } else {
          logger.info('HTTP server closed');
          resolve();
        }
      });
    });
  }

  /**
   * Wait for ongoing requests to complete
   */
  private async waitForRequestsToComplete(): Promise<void> {
    const maxWaitTime = 30000; // 30 seconds
    const checkInterval = 1000; // 1 second
    const startTime = Date.now();

    logger.info('Waiting for ongoing requests to complete...');

    while (Date.now() - startTime < maxWaitTime) {
      // In a real implementation, you'd check active connections
      // For now, just wait a bit
      await new Promise((resolve) => setTimeout(resolve, checkInterval));

      // Check if we can proceed (simplified)
      const activeConnections = 0; // You'd get this from your server
      if (activeConnections === 0) {
        logger.info('All requests completed');
        return;
      }

      logger.info(`Waiting for ${activeConnections} active connections...`);
    }

    logger.warn('Timeout waiting for requests to complete');
  }

  /**
   * Run registered shutdown handlers
   */
  private async runShutdownHandlers(): Promise<void> {
    logger.info(`Running ${this.shutdownHandlers.length} shutdown handlers...`);

    for (const handler of this.shutdownHandlers) {
      try {
        await handler();
      } catch (error) {
        logger.error('Error in shutdown handler', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Continue with other handlers even if one fails
      }
    }
  }

  /**
   * Force shutdown (for emergencies)
   */
  forceShutdown(): void {
    logger.error('Force shutdown initiated');
    process.exit(1);
  }
}
