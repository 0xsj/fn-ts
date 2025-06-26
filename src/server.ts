// src/server.ts
import 'reflect-metadata'; // Must be first
import 'dotenv/config';
import { createServer } from 'http';
import app, { initializeApp } from './app';
import { logger } from './shared/utils/logger';
import { config, validateConfigs } from './core/config';

async function start(): Promise<void> {
  try {
    validateConfigs();
    await initializeApp();

    const server = createServer(app);

    server.listen(config.app.port, () => {
      logger.info(
        {
          port: config.app.port,
          env: config.app.env,
        },
        'Server started successfully',
      );
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

// Start the server
start();
