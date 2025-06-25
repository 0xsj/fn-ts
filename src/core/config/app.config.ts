// src/core/config/app.config.ts
import { z } from 'zod';
import { EnvironmentSchema, PortSchema } from './config.schema';

const AppConfigSchema = z.object({
  env: EnvironmentSchema,
  name: z.string().default('firenotifications'),
  version: z.string().default('1.0.0'),
  port: PortSchema.default(3000),
  host: z.string().default('0.0.0.0'),

  // API Settings
  api: z.object({
    prefix: z.string().default('/api'),
    version: z.string().default('v1'),
    pagination: z.object({
      defaultLimit: z.coerce.number().default(20),
      maxLimit: z.coerce.number().default(100),
    }),
  }),

  // Security
  security: z.object({
    bcryptRounds: z.coerce.number().min(10).default(10),
    jwtSecret: z.string().min(32),
    jwtExpiresIn: z.string().default('7d'),
    refreshTokenExpiresIn: z.string().default('30d'),
    corsOrigins: z.array(z.string()).default(['http://localhost:3000']),
  }),

  // Rate Limiting
  rateLimit: z.object({
    windowMs: z.coerce.number().default(60000), // 1 minute
    max: z.coerce.number().default(100), // requests per window
    skipSuccessfulRequests: z.boolean().default(false),
  }),

  // Logging
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    pretty: z.boolean().default(true),
  }),
});

type AppConfig = z.infer<typeof AppConfigSchema>;

export const appConfig: AppConfig = AppConfigSchema.parse({
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT,
  host: process.env.HOST,

  api: {
    prefix: process.env.API_PREFIX,
    version: process.env.API_VERSION,
    pagination: {
      defaultLimit: process.env.API_DEFAULT_LIMIT,
      maxLimit: process.env.API_MAX_LIMIT,
    },
  },

  security: {
    bcryptRounds: process.env.BCRYPT_ROUNDS,
    jwtSecret: process.env.JWT_SECRET || 'change-this-secret-in-production-min-32-chars',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN,
    refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN,
    corsOrigins: process.env.CORS_ORIGINS?.split(','),
  },

  rateLimit: {
    windowMs: process.env.RATE_LIMIT_WINDOW_MS,
    max: process.env.RATE_LIMIT_MAX,
    skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESSFUL === 'true',
  },

  logging: {
    level: process.env.LOG_LEVEL as any,
    pretty: process.env.NODE_ENV !== 'production',
  },
});

// Development environment checks
if (
  appConfig.env === 'production' &&
  appConfig.security.jwtSecret === 'change-this-secret-in-production-min-32-chars'
) {
  throw new Error('JWT_SECRET must be set in production');
}
