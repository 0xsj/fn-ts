// src/server.ts
import { Application } from './core/app/application';
import { config } from './core/config';
import { logger } from './shared/utils/logger';

async function main() {
  try {
    const app = new Application();

    // Register any custom shutdown handlers
    app.onShutdown(async () => {
      logger.info('Running custom cleanup...');
    });

    // Start the application
    await app.start(config.app.port, config.app.host);
  } catch (error) {
    logger.error('Failed to start application', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      errorType: error?.constructor?.name,
      errorDetails: error,
    });
    process.exit(1);
  }
}

// Start the application
main();
