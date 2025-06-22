// src/core/config/queue.config.ts
import { z } from 'zod';

const QueueConfigSchema = z.object({
  // Queue definitions
  queues: z.object({
    notification: z.object({
      name: z.string().default('notifications'),
      concurrency: z.coerce.number().default(5),
      maxRetriesPerRequest: z.coerce.number().default(3),
    }),
    email: z.object({
      name: z.string().default('emails'),
      concurrency: z.coerce.number().default(10),
      rateLimit: z.object({
        max: z.coerce.number().default(100),
        duration: z.coerce.number().default(60000), // per minute
      }).optional(),
    }),
    sms: z.object({
      name: z.string().default('sms'),
      concurrency: z.coerce.number().default(5),
      rateLimit: z.object({
        max: z.coerce.number().default(50),
        duration: z.coerce.number().default(60000),
      }).optional(),
    }),
    analytics: z.object({
      name: z.string().default('analytics'),
      concurrency: z.coerce.number().default(2),
    }),
  }),
  
  // Default job options
  defaultJobOptions: z.object({
    removeOnComplete: z.boolean().default(true),
    removeOnFail: z.boolean().default(false),
    attempts: z.coerce.number().default(3),
    backoff: z.object({
      type: z.enum(['exponential', 'fixed']).default('exponential'),
      delay: z.coerce.number().default(5000),
    }),
  }),
});

type QueueConfig = z.infer<typeof QueueConfigSchema>;

export const queueConfig: QueueConfig = QueueConfigSchema.parse({
  queues: {
    notification: {
      name: process.env.QUEUE_NOTIFICATION_NAME,
      concurrency: process.env.QUEUE_NOTIFICATION_CONCURRENCY,
      maxRetriesPerRequest: process.env.QUEUE_NOTIFICATION_MAX_RETRIES,
    },
    email: {
      name: process.env.QUEUE_EMAIL_NAME,
      concurrency: process.env.QUEUE_EMAIL_CONCURRENCY,
      rateLimit: process.env.QUEUE_EMAIL_RATE_LIMIT_MAX ? {
        max: process.env.QUEUE_EMAIL_RATE_LIMIT_MAX,
        duration: process.env.QUEUE_EMAIL_RATE_LIMIT_DURATION,
      } : undefined,
    },
    sms: {
      name: process.env.QUEUE_SMS_NAME,
      concurrency: process.env.QUEUE_SMS_CONCURRENCY,
      rateLimit: process.env.QUEUE_SMS_RATE_LIMIT_MAX ? {
        max: process.env.QUEUE_SMS_RATE_LIMIT_MAX,
        duration: process.env.QUEUE_SMS_RATE_LIMIT_DURATION,
      } : undefined,
    },
    analytics: {
      name: process.env.QUEUE_ANALYTICS_NAME,
      concurrency: process.env.QUEUE_ANALYTICS_CONCURRENCY,
    },
  },
  
  defaultJobOptions: {
    removeOnComplete: process.env.QUEUE_REMOVE_ON_COMPLETE !== 'false',
    removeOnFail: process.env.QUEUE_REMOVE_ON_FAIL === 'true',
    attempts: process.env.QUEUE_DEFAULT_ATTEMPTS,
    backoff: {
      type: process.env.QUEUE_BACKOFF_TYPE as any,
      delay: process.env.QUEUE_BACKOFF_DELAY,
    },
  },
});