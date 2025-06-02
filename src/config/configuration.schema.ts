import { z } from 'zod';

const appConfigSchema = z.object({
  name: z.string().default('NestJS App'),
  version: z.string().default('1.0.0'),
  environment: z
    .enum(['development', 'staging', 'production', 'test'])
    .default('development'),
  port: z.number().min(1).max(65535).default(3000),
  host: z.string().default('localhost'),
  apiPrefix: z.string().default('api'),
  cors: z.object({
    enabled: z.boolean().default(true),
    origins: z.array(z.string()).default(['http://localhost:3000']),
    credentials: z.boolean().default(true),
  }),
  rateLimit: z.object({
    enabled: z.boolean().default(true),
    windowMs: z.number().default(15 * 60 * 1000),
    maxRequests: z.number().default(100),
  }),
});
