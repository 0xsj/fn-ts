// src/core/config/index.ts
import { appConfig } from './app.config';
import { databaseConfig } from './database.config';
import { redisConfig } from './redis.config';
import { elasticsearchConfig } from './elasticsearch.config';
import { queueConfig } from './queue.config';
import { storageConfig } from './storage.config';
import { servicesConfig } from './service.config';

export const validateConfigs = (): void => {
  if (appConfig.env === 'production') {
    if (appConfig.security.jwtSecret === 'change-this-secret-in-production') {
      throw new Error('JWT_SECRET must be set in production');
    }
  }
};

export const config = {
  app: appConfig,
  database: databaseConfig,
  redis: redisConfig,
  elasticsearch: elasticsearchConfig,
  queue: queueConfig,
  storage: storageConfig,
  services: servicesConfig,
} as const;

export type Config = typeof config;
