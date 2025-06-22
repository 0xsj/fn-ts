// src/core/config/services.config.ts
import { z } from 'zod';
import { URLSchema } from './config.schema';

const ServicesConfigSchema = z.object({
  // Email service configuration
  email: z.object({
    provider: z.enum(['sendgrid', 'smtp', 'console']).default('console'),
    from: z.object({
      name: z.string().default('FireNotifications'),
      email: z.string().email().default('noreply@firenotifications.com'),
    }),
    
    // Provider-specific settings
    sendgrid: z.object({
      apiKey: z.string().optional(),
      webhookSecret: z.string().optional(),
    }),
    
    smtp: z.object({
      host: z.string().default('localhost'),
      port: z.coerce.number().default(587),
      secure: z.boolean().default(false),
      auth: z.object({
        user: z.string().optional(),
        pass: z.string().optional(),
      }),
    }),
  }),
  
  // SMS service configuration
  sms: z.object({
    provider: z.enum(['twilio', 'console']).default('console'),
    from: z.string().default('+1234567890'),
    
    twilio: z.object({
      accountSid: z.string().optional(),
      authToken: z.string().optional(),
      messagingServiceSid: z.string().optional(),
    }),
  }),
  
  // Push notification configuration
  push: z.object({
    provider: z.enum(['fcm', 'console']).default('console'),
    
    fcm: z.object({
      projectId: z.string().optional(),
      privateKey: z.string().optional(),
      clientEmail: z.string().optional(),
    }),
  }),
  
  // Webhook configuration
  webhook: z.object({
    timeout: z.coerce.number().default(30000), // 30 seconds
    maxRetries: z.coerce.number().default(3),
    retryDelay: z.coerce.number().default(5000), // 5 seconds
    signatureHeader: z.string().default('x-webhook-signature'),
    secret: z.string().optional(),
  }),
  
  // External APIs
  apis: z.object({
    // If you integrate with any external services
    googleMaps: z.object({
      apiKey: z.string().optional(),
      enabled: z.boolean().default(false),
    }),
    
    weather: z.object({
      apiKey: z.string().optional(),
      baseUrl: URLSchema.optional(),
      enabled: z.boolean().default(false),
    }),
  }),
});

type ServicesConfig = z.infer<typeof ServicesConfigSchema>;

export const servicesConfig: ServicesConfig = ServicesConfigSchema.parse({
  email: {
    provider: process.env.EMAIL_PROVIDER as any,
    from: {
      name: process.env.EMAIL_FROM_NAME,
      email: process.env.EMAIL_FROM_ADDRESS,
    },
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY,
      webhookSecret: process.env.SENDGRID_WEBHOOK_SECRET,
    },
    smtp: {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    },
  },
  
  sms: {
    provider: process.env.SMS_PROVIDER as any,
    from: process.env.SMS_FROM_NUMBER,
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
    },
  },
  
  push: {
    provider: process.env.PUSH_PROVIDER as any,
    fcm: {
      projectId: process.env.FCM_PROJECT_ID,
      privateKey: process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Handle newlines
      clientEmail: process.env.FCM_CLIENT_EMAIL,
    },
  },
  
  webhook: {
    timeout: process.env.WEBHOOK_TIMEOUT,
    maxRetries: process.env.WEBHOOK_MAX_RETRIES,
    retryDelay: process.env.WEBHOOK_RETRY_DELAY,
    signatureHeader: process.env.WEBHOOK_SIGNATURE_HEADER,
    secret: process.env.WEBHOOK_SECRET,
  },
  
  apis: {
    googleMaps: {
      apiKey: process.env.GOOGLE_MAPS_API_KEY,
      enabled: process.env.GOOGLE_MAPS_ENABLED === 'true',
    },
    weather: {
      apiKey: process.env.WEATHER_API_KEY,
      baseUrl: process.env.WEATHER_API_URL,
      enabled: process.env.WEATHER_ENABLED === 'true',
    },
  },
});

// Validate provider-specific requirements
if (servicesConfig.email.provider === 'sendgrid' && !servicesConfig.email.sendgrid.apiKey) {
  throw new Error('SENDGRID_API_KEY is required when using SendGrid provider');
}

if (servicesConfig.sms.provider === 'twilio' && !servicesConfig.sms.twilio.accountSid) {
  throw new Error('Twilio credentials are required when using Twilio provider');
}