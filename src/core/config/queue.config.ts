// src/core/config/queue.config.ts
import { z } from 'zod';

const QueueConfigSchema = z.object({
  // Queue definitions
  queues: z.object({
    notification: z.object({
      name: z.string().default('notifications'),
      concurrency: z.number().default(5),
      maxRetriesPerRequest: z.number().default(3),
    }),
    email: z.object({
      name: z.string().default('emails'),
      concurrency: z.number().default(10),
      rateLimit: z.object({
        max: z.number().default(100),
        duration: z.number().default(60000), // per minute
      }).optional(),
    }),
    sms: z.object({
      name: z.string().default('sms'),
      concurrency: z.number().default(5),
      rateLimit: z.object({
        max: z.number().default(50),
        duration: z.number().default(60000),
      }).optional(),
    }),
    analytics: z.object({
      name: z.string().default('analytics'),
      concurrency: z.number().default(2),
    }),
  }),
  
  // Default job options
  defaultJobOptions: z.object({
    removeOnComplete: z.boolean().default(true),
    removeOnFail: z.boolean().default(false),
    attempts: z.number().default(3),
    backoff: z.object({
      type: z.enum(['exponential', 'fixed']).default('exponential'),
      delay: z.number().default(5000),
    }),
  }),
});

type QueueConfig = z.infer<typeof QueueConfigSchema>;

export const queueConfig: QueueConfig = QueueConfigSchema.parse({
  queues: {
    notification: {
      concurrency: process.env.QUEUE_NOTIFICATION_CONCURRENCY,
    },
    email: {
      concurrency: process.env.QUEUE_EMAIL_CONCURRENCY,
    },
    sms: {
      concurrency: process.env.QUEUE_SMS_CONCURRENCY,
    },
    analytics: {
      concurrency: process.env.QUEUE_ANALYTICS_CONCURRENCY,
    },
  },
});