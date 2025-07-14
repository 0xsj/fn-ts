// src/core/config/websocket.config.ts
import { z } from 'zod';
import { EnvironmentSchema, DurationSchema, parseDuration } from './config.schema';

const WebSocketConfigSchema = z.object({
  // Basic settings
  enabled: z.boolean().default(true),
  path: z.string().default('/socket.io'),

  // CORS settings
  cors: z
    .object({
      origin: z.union([z.string(), z.array(z.string()), z.boolean()]).default('*'),
      credentials: z.boolean().default(true),
      methods: z.array(z.string()).default(['GET', 'POST']),
    })
    .default({}),

  // Connection settings
  pingTimeout: DurationSchema.default('60s').transform(parseDuration),
  pingInterval: DurationSchema.default('25s').transform(parseDuration),
  maxHttpBufferSize: z.number().default(1000000), // 1MB
  allowEIO3: z.boolean().default(false),

  // Rate limiting
  rateLimit: z
    .object({
      windowMs: DurationSchema.default('1m').transform(parseDuration),
      maxRequests: z.number().default(100),
      skipSuccessfulRequests: z.boolean().default(false),
    })
    .default({}),

  // Authentication
  auth: z
    .object({
      required: z.boolean().default(true),
      timeout: DurationSchema.default('30s').transform(parseDuration),
      allowAnonymous: z.boolean().default(false),
    })
    .default({}),

  // Redis adapter (for scaling)
  redis: z
    .object({
      enabled: z.boolean().default(false),
      host: z.string().default('localhost'),
      port: z.coerce.number().default(6379),
      password: z.string().optional(),
      db: z.coerce.number().default(2), // Different from cache/queue DBs
      keyPrefix: z.string().default('socket.io:'),
    })
    .default({}),

  // Presence tracking
  presence: z
    .object({
      enabled: z.boolean().default(true),
      heartbeatInterval: DurationSchema.default('30s').transform(parseDuration),
      offlineThreshold: DurationSchema.default('1m').transform(parseDuration),
      cleanupInterval: DurationSchema.default('5m').transform(parseDuration),
    })
    .default({}),

  // Room management
  rooms: z
    .object({
      maxSize: z.number().default(1000),
      autoCleanup: z.boolean().default(true),
      cleanupInterval: DurationSchema.default('10m').transform(parseDuration),
    })
    .default({}),

  // Logging
  logging: z
    .object({
      enabled: z.boolean().default(true),
      level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
      logConnections: z.boolean().default(true),
      logDisconnections: z.boolean().default(true),
      logErrors: z.boolean().default(true),
    })
    .default({}),

  environment: EnvironmentSchema.default('development'),
});

type WebSocketConfig = z.infer<typeof WebSocketConfigSchema>;

export const websocketConfig: WebSocketConfig = WebSocketConfigSchema.parse({
  enabled: process.env.WEBSOCKET_ENABLED !== 'false',
  path: process.env.WEBSOCKET_PATH || '/socket.io',

  cors: {
    origin:
      process.env.WEBSOCKET_CORS_ORIGINS?.split(',') || process.env.CORS_ORIGINS?.split(',') || '*',
    credentials: process.env.WEBSOCKET_CORS_CREDENTIALS !== 'false',
    methods: process.env.WEBSOCKET_CORS_METHODS?.split(',') || ['GET', 'POST'],
  },

  pingTimeout: process.env.WEBSOCKET_PING_TIMEOUT || '60s',
  pingInterval: process.env.WEBSOCKET_PING_INTERVAL || '25s',
  maxHttpBufferSize: Number(process.env.WEBSOCKET_MAX_BUFFER_SIZE) || 1000000,
  allowEIO3: process.env.WEBSOCKET_ALLOW_EIO3 === 'true',

  rateLimit: {
    windowMs: process.env.WEBSOCKET_RATE_LIMIT_WINDOW || '1m',
    maxRequests: Number(process.env.WEBSOCKET_RATE_LIMIT_MAX) || 100,
    skipSuccessfulRequests: process.env.WEBSOCKET_RATE_LIMIT_SKIP_SUCCESS === 'true',
  },

  auth: {
    required: process.env.WEBSOCKET_AUTH_REQUIRED !== 'false',
    timeout: process.env.WEBSOCKET_AUTH_TIMEOUT || '30s',
    allowAnonymous: process.env.WEBSOCKET_ALLOW_ANONYMOUS === 'true',
  },

  redis: {
    enabled: process.env.WEBSOCKET_REDIS_ENABLED === 'true',
    host: process.env.WEBSOCKET_REDIS_HOST || process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.WEBSOCKET_REDIS_PORT || process.env.REDIS_PORT) || 6379,
    password: process.env.WEBSOCKET_REDIS_PASSWORD || process.env.REDIS_PASSWORD,
    db: Number(process.env.WEBSOCKET_REDIS_DB) || 2,
    keyPrefix: process.env.WEBSOCKET_REDIS_PREFIX || 'socket.io:',
  },

  presence: {
    enabled: process.env.WEBSOCKET_PRESENCE_ENABLED !== 'false',
    heartbeatInterval: process.env.WEBSOCKET_PRESENCE_HEARTBEAT || '30s',
    offlineThreshold: process.env.WEBSOCKET_PRESENCE_OFFLINE_THRESHOLD || '1m',
    cleanupInterval: process.env.WEBSOCKET_PRESENCE_CLEANUP_INTERVAL || '5m',
  },

  rooms: {
    maxSize: Number(process.env.WEBSOCKET_ROOM_MAX_SIZE) || 1000,
    autoCleanup: process.env.WEBSOCKET_ROOM_AUTO_CLEANUP !== 'false',
    cleanupInterval: process.env.WEBSOCKET_ROOM_CLEANUP_INTERVAL || '10m',
  },

  logging: {
    enabled: process.env.WEBSOCKET_LOGGING_ENABLED !== 'false',
    level: (process.env.WEBSOCKET_LOG_LEVEL as any) || process.env.LOG_LEVEL || 'info',
    logConnections: process.env.WEBSOCKET_LOG_CONNECTIONS !== 'false',
    logDisconnections: process.env.WEBSOCKET_LOG_DISCONNECTIONS !== 'false',
    logErrors: process.env.WEBSOCKET_LOG_ERRORS !== 'false',
  },

  environment: (process.env.NODE_ENV as any) || 'development',
});
