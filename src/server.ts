// src/server.ts
import 'reflect-metadata'; // Must be first
import 'dotenv/config';
import { createServer } from 'http';
import app, { initializeApp } from './app';
import { logger } from './shared/utils/logger';

const PORT = process.env.PORT || 3000;

async function start(): Promise<void> {
  try {
    await initializeApp();

    const server = createServer(app);

    server.listen(PORT, () => {
      logger.info({ port: PORT }, 'Server started successfully');
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Start the server
start();
