// src/workers/worker.bootstrap.ts
import { logger } from '../shared/utils';
import { HeartbeatWorker } from './scheduled/heart-beat.worker';

// Simple version - no DI needed
const worker = new HeartbeatWorker();

logger.info('Starting heartbeat worker...');
worker.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down...');
  worker.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down...');
  worker.stop();
  process.exit(0);
});

// Keep the process alive
process.stdin.resume();
