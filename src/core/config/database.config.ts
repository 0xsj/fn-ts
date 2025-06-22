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
    min: z.number().default(2),
    max: z.number().default(10),
    acquireTimeout: z.number().default(30000),
    idleTimeout: z.number().default(10000),
  }),
  
  // Read replica (optional)
  readReplica: z.object({
    host: z.string(),
    port: z.coerce.number().default(3306),
    database: z.string(),
    username: z.string(),
    password: z.string(),
  }).optional(),
  
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
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  
  pool: {
    min: process.env.DB_POOL_MIN,
    max: process.env.DB_POOL_MAX,
  },
  
  readReplica: process.env.DB_READ_HOST ? {
    host: process.env.DB_READ_HOST,
    port: process.env.DB_READ_PORT,
    database: process.env.DB_NAME,
    username: process.env.DB_READ_USER || process.env.DB_USER,
    password: process.env.DB_READ_PASSWORD || process.env.DB_PASSWORD,
  } : undefined,
  
  options: {
    logging: process.env.DB_LOGGING === 'true',
  },
});