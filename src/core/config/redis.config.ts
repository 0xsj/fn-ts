// src/core/config/redis.config.ts
import { z } from 'zod';
import { DurationSchema, parseDuration } from './config.schema';

const RedisConfigSchema = z.object({
  host: z.string().default('localhost'),
  port: z.coerce.number().default(6379),
  password: z.string().optional(),
  db: z.coerce.number().default(0),
  
  // Connection options
  connection: z.object({
    enableReadyCheck: z.boolean().default(true),
    maxRetriesPerRequest: z.coerce.number().default(3),
    retryStrategy: z.boolean().default(true),
    reconnectOnError: z.boolean().default(true),
  }),
  
  // Cache settings
  cache: z.object({
    ttl: DurationSchema.default('1h').transform(parseDuration),
    keyPrefix: z.string().default('fn:cache:'),
    
    // Specific TTLs
    ttls: z.object({
      user: DurationSchema.default('1h').transform(parseDuration),
      incident: DurationSchema.default('30m').transform(parseDuration),
      search: DurationSchema.default('5m').transform(parseDuration),
      session: DurationSchema.default('24h').transform(parseDuration),
    }),
  }),
  
  // Bull Queue settings
  queue: z.object({
    prefix: z.string().default('fn:queue:'),
    stalledInterval: z.coerce.number().default(30000),
    maxStalledCount: z.coerce.number().default(1),
  }),
  
  // Pub/Sub settings
  pubsub: z.object({
    prefix: z.string().default('fn:pubsub:'),
  }),
});

type RedisConfig = z.infer<typeof RedisConfigSchema>;

export const redisConfig: RedisConfig = RedisConfigSchema.parse({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  db: process.env.REDIS_DB,
  
  connection: {
    enableReadyCheck: process.env.REDIS_ENABLE_READY_CHECK !== 'false',
    maxRetriesPerRequest: process.env.REDIS_MAX_RETRIES,
    retryStrategy: process.env.REDIS_RETRY_STRATEGY !== 'false',
    reconnectOnError: process.env.REDIS_RECONNECT_ON_ERROR !== 'false',
  },
  
  cache: {
    ttl: process.env.CACHE_TTL,
    keyPrefix: process.env.CACHE_KEY_PREFIX,
    ttls: {
      user: process.env.CACHE_TTL_USER,
      incident: process.env.CACHE_TTL_INCIDENT,
      search: process.env.CACHE_TTL_SEARCH,
      session: process.env.CACHE_TTL_SESSION,
    },
  },
  
  queue: {
    prefix: process.env.QUEUE_PREFIX,
    stalledInterval: process.env.QUEUE_STALLED_INTERVAL,
    maxStalledCount: process.env.QUEUE_MAX_STALLED_COUNT,
  },
  
  pubsub: {
    prefix: process.env.PUBSUB_PREFIX,
  },
});