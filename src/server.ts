// src/server.ts
import 'reflect-metadata'; // Must be first
import 'dotenv/config';
import { createServer } from 'http';
import app, { initializeApp } from './app';
import { logger } from './shared/utils/logger';
import { config, validateConfigs } from './core/config';

const PORT = process.env.PORT || 3000;

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
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Start the server
start();
