import 'dotenv/config';
import { createServer } from 'http';

import app from './app';
import { logger } from './shared/utils/logger';

const PORT = process.env.PORT || 3000;

const server = createServer(app);

server.listen(PORT, () => {
  logger.info({ port: PORT }, 'Server started successfully');
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});
