// src/server.ts
import 'reflect-metadata';
import * as dotenv from 'dotenv';

// Load environment variables before anything else
dotenv.config();

// Verify environment variables are loaded
console.log('Environment check after dotenv:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('EMAIL_PROVIDER:', process.env.EMAIL_PROVIDER);
console.log('SMTP_HOST:', process.env.SMTP_HOST);
console.log('SMTP_PORT:', process.env.SMTP_PORT);

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
