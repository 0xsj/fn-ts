// src/core/config/database.config.ts
import { z } from 'zod';

const DatabaseConfigSchema = z.object({
  host: z.string(),
  port: z.coerce.number().default(3306),
  database: z.string(),
  username: z.string(),
  password: z.string(),

  // Connection pool
  pool: z.object({
    min: z.coerce.number().default(2),
    max: z.coerce.number().default(10),
    acquireTimeout: z.coerce.number().default(30000),
    idleTimeout: z.coerce.number().default(10000),
  }),

  // Read replica (optional)
  readReplica: z
    .object({
      host: z.string(),
      port: z.coerce.number().default(3306),
      database: z.string(),
      username: z.string(),
      password: z.string(),
    })
    .optional(),

  // Options
  options: z.object({
    logging: z.boolean().default(false),
    timezone: z.string().default('+00:00'),
    charset: z.string().default('utf8mb4'),
    collation: z.string().default('utf8mb4_unicode_ci'),
  }),
});

type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;

export const databaseConfig: DatabaseConfig = DatabaseConfigSchema.parse({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT,
  database: process.env.DB_NAME || 'fn_db',
  username: process.env.DB_USER || 'fn_user',
  password: process.env.DB_PASSWORD || 'fn_password',

  pool: {
    min: process.env.DB_POOL_MIN,
    max: process.env.DB_POOL_MAX,
    acquireTimeout: process.env.DB_POOL_ACQUIRE_TIMEOUT,
    idleTimeout: process.env.DB_POOL_IDLE_TIMEOUT,
  },

  readReplica: process.env.DB_READ_HOST
    ? {
        host: process.env.DB_READ_HOST,
        port: process.env.DB_READ_PORT,
        database: process.env.DB_READ_DATABASE || process.env.DB_NAME || 'fn_db',
        username: process.env.DB_READ_USER || process.env.DB_USER || 'fn_user',
        password: process.env.DB_READ_PASSWORD || process.env.DB_PASSWORD || 'fn_password',
      }
    : undefined,

  options: {
    logging: process.env.DB_LOGGING === 'true',
    timezone: process.env.DB_TIMEZONE,
    charset: process.env.DB_CHARSET,
    collation: process.env.DB_COLLATION,
  },
});
