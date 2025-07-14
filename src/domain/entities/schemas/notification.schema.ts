// src/domain/entities/schemas/notification.schema.ts
import { z } from 'zod';
import { BaseEntitySchema, BaseEntityDBSchema } from './entity.schema';

// ============================================
// Notification Channel & Priority Enums
// ============================================
export const NotificationChannelSchema = z.enum(['email', 'sms', 'push', 'in_app', 'webhook']);
export const NotificationPrioritySchema = z.enum(['critical', 'high', 'normal', 'low']);
export const NotificationStatusSchema = z.enum([
  'pending',
  'queued',
  'sending',
  'sent',
  'delivered',
  'failed',
  'bounced',
  'cancelled',
]);

// ============================================
// Notification Schema
// ============================================
export const NotificationDBSchema = BaseEntityDBSchema.extend({
  // Recipient information
  recipient_id: z.string().uuid(),
  recipient_type: z.enum(['user', 'group', 'role', 'external']).default('user'),
  recipient_email: z.string().email().nullable(), // For external recipients
  recipient_phone: z.string().nullable(), // For external recipients

  // Notification details
  channel: NotificationChannelSchema,
  priority: NotificationPrioritySchema.default('normal'),
  status: NotificationStatusSchema.default('pending'),

  // Related entities
  thread_id: z.string().uuid().nullable(),
  organization_id: z.string().uuid().nullable(),

  // Content
  subject: z.string().nullable(), // For email
  content: z.string(),
  content_html: z.string().nullable(), // For email HTML

  // Template information
  template_id: z.string().uuid().nullable(),
  template_version: z.number().nullable(),
  template_data: z.record(z.unknown()).default({}), // Variables for template

  // Localization
  locale: z.string().default('en'),

  // Scheduling
  scheduled_for: z.date().nullable(),
  expires_at: z.date().nullable(),

  // Delivery information
  queued_at: z.date().nullable(),
  sent_at: z.date().nullable(),
  delivered_at: z.date().nullable(),
  failed_at: z.date().nullable(),
  cancelled_at: z.date().nullable(),

  // Failure tracking
  failure_reason: z.string().nullable(),
  retry_count: z.number().int().default(0),
  max_retries: z.number().int().default(3),
  next_retry_at: z.date().nullable(),

  // Provider information
  provider: z.string().nullable(), // 'sendgrid', 'twilio', 'fcm', etc.
  provider_message_id: z.string().nullable(),
  provider_response: z.record(z.unknown()).nullable(),
  provider_cost: z.number().nullable(), // Cost in cents

  // Tracking
  opened_at: z.date().nullable(),
  clicked_at: z.date().nullable(),
  unsubscribed_at: z.date().nullable(),
  marked_as_spam_at: z.date().nullable(),

  // Channel-specific data
  channel_data: z
    .object({
      // Email specific
      from_email: z.string().email().nullable(),
      from_name: z.string().nullable(),
      reply_to: z.string().email().nullable(),
      cc: z.array(z.string().email()).nullable(),
      bcc: z.array(z.string().email()).nullable(),
      headers: z.record(z.string()).nullable(),
      attachments: z
        .array(
          z.object({
            filename: z.string(),
            content: z.string(), // Base64 or URL
            type: z.string(),
            disposition: z.enum(['attachment', 'inline']).default('attachment'),
          }),
        )
        .nullable(),

      // SMS specific
      from_number: z.string().nullable(),
      segments: z.number().nullable(), // Number of SMS segments

      // Push specific
      title: z.string().nullable(),
      icon: z.string().nullable(),
      image: z.string().nullable(),
      badge: z.number().nullable(),
      sound: z.string().nullable(),
      data: z.record(z.unknown()).nullable(), // Custom data payload

      // Webhook specific
      url: z.string().url().nullable(),
      method: z.enum(['GET', 'POST', 'PUT', 'PATCH']).nullable(),
      auth_type: z.enum(['none', 'basic', 'bearer', 'api_key']).nullable(),
    })
    .default({
      from_email: null,
      from_name: null,
      reply_to: null,
      cc: null,
      bcc: null,
      headers: null,
      attachments: null,
      from_number: null,
      segments: null,
      title: null,
      icon: null,
      image: null,
      badge: null,
      sound: null,
      data: null,
      url: null,
      method: null,
      auth_type: null,
    }),

  // Grouping/batching
  batch_id: z.string().uuid().nullable(),
  group_key: z.string().nullable(), // For grouping similar notifications

  // Tags for filtering/analytics
  tags: z.array(z.string()).default([]),

  // Compliance
  requires_consent: z.boolean().default(false),
  consent_given: z.boolean().nullable(),
  consent_given_at: z.date().nullable(),
});

export const NotificationSchema = BaseEntitySchema.extend({
  recipientId: z.string().uuid(),
  recipientType: z.enum(['user', 'group', 'role', 'external']).default('user'),
  recipientEmail: z.string().email().nullable(),
  recipientPhone: z.string().nullable(),

  channel: NotificationChannelSchema,
  priority: NotificationPrioritySchema.default('normal'),
  status: NotificationStatusSchema.default('pending'),

  incidentId: z.string().uuid().nullable(),
  threadId: z.string().uuid().nullable(),
  organizationId: z.string().uuid().nullable(),

  subject: z.string().nullable(),
  content: z.string(),
  contentHtml: z.string().nullable(),

  templateId: z.string().uuid().nullable(),
  templateVersion: z.number().nullable(),
  templateData: z.record(z.unknown()).default({}),

  locale: z.string().default('en'),

  scheduledFor: z.date().nullable(),
  expiresAt: z.date().nullable(),

  queuedAt: z.date().nullable(),
  sentAt: z.date().nullable(),
  deliveredAt: z.date().nullable(),
  failedAt: z.date().nullable(),
  cancelledAt: z.date().nullable(),

  failureReason: z.string().nullable(),
  retryCount: z.number().int().default(0),
  maxRetries: z.number().int().default(3),
  nextRetryAt: z.date().nullable(),

  provider: z.string().nullable(),
  providerMessageId: z.string().nullable(),
  providerResponse: z.record(z.unknown()).nullable(),
  providerCost: z.number().nullable(),

  openedAt: z.date().nullable(),
  clickedAt: z.date().nullable(),
  unsubscribedAt: z.date().nullable(),
  markedAsSpamAt: z.date().nullable(),

  channelData: z
    .object({
      fromEmail: z.string().email().nullable(),
      fromName: z.string().nullable(),
      replyTo: z.string().email().nullable(),
      cc: z.array(z.string().email()).nullable(),
      bcc: z.array(z.string().email()).nullable(),
      headers: z.record(z.string()).nullable(),
      attachments: z
        .array(
          z.object({
            filename: z.string(),
            content: z.string(),
            type: z.string(),
            disposition: z.enum(['attachment', 'inline']).default('attachment'),
          }),
        )
        .nullable(),

      fromNumber: z.string().nullable(),
      segments: z.number().nullable(),

      title: z.string().nullable(),
      icon: z.string().nullable(),
      image: z.string().nullable(),
      badge: z.number().nullable(),
      sound: z.string().nullable(),
      data: z.record(z.unknown()).nullable(),

      url: z.string().url().nullable(),
      method: z.enum(['GET', 'POST', 'PUT', 'PATCH']).nullable(),
      authType: z.enum(['none', 'basic', 'bearer', 'api_key']).nullable(),
    })
    .default({
      fromEmail: null,
      fromName: null,
      replyTo: null,
      cc: null,
      bcc: null,
      headers: null,
      attachments: null,
      fromNumber: null,
      segments: null,
      title: null,
      icon: null,
      image: null,
      badge: null,
      sound: null,
      data: null,
      url: null,
      method: null,
      authType: null,
    }),

  batchId: z.string().uuid().nullable(),
  groupKey: z.string().nullable(),

  tags: z.array(z.string()).default([]),

  requiresConsent: z.boolean().default(false),
  consentGiven: z.boolean().nullable(),
  consentGivenAt: z.date().nullable(),
});

// ============================================
// Template Schema
// ============================================
export const TemplateDBSchema = BaseEntityDBSchema.extend({
  name: z.string(),
  slug: z.string(), // Unique identifier
  description: z.string().nullable(),

  channel: NotificationChannelSchema,
  category: z.enum(['transactional', 'marketing', 'alert', 'system']).default('transactional'),

  // Content templates
  subject_template: z.string().nullable(), // For email/push
  content_template: z.string(),
  content_html_template: z.string().nullable(), // For email

  // Template engine
  engine: z.enum(['handlebars', 'liquid', 'mustache', 'plain']).default('handlebars'),

  // Variables schema
  variables: z
    .array(
      z.object({
        name: z.string(),
        type: z.enum(['string', 'number', 'boolean', 'date', 'object', 'array']),
        required: z.boolean().default(true),
        default_value: z.unknown().nullable(),
        description: z.string().nullable(),
        example: z.unknown().nullable(),
      }),
    )
    .default([]),

  // Localization
  locale: z.string().default('en'),
  parent_template_id: z.string().uuid().nullable(), // For locale variants

  // Channel defaults
  channel_defaults: z
    .object({
      from_email: z.string().email().nullable(),
      from_name: z.string().nullable(),
      reply_to: z.string().email().nullable(),
      from_number: z.string().nullable(),
    })
    .default({
      from_email: null,
      from_name: null,
      reply_to: null,
      from_number: null,
    }),

  // Version control
  version: z.number().int().default(1),
  is_active: z.boolean().default(true),
  published_at: z.date().nullable(),
  archived_at: z.date().nullable(),

  // Usage tracking
  usage_count: z.number().int().default(0),
  last_used_at: z.date().nullable(),

  // Ownership
  created_by: z.string().uuid(),
  organization_id: z.string().uuid().nullable(),
});

export const TemplateSchema = BaseEntitySchema.extend({
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),

  channel: NotificationChannelSchema,
  category: z.enum(['transactional', 'marketing', 'alert', 'system']).default('transactional'),

  subjectTemplate: z.string().nullable(),
  contentTemplate: z.string(),
  contentHtmlTemplate: z.string().nullable(),

  engine: z.enum(['handlebars', 'liquid', 'mustache', 'plain']).default('handlebars'),

  variables: z
    .array(
      z.object({
        name: z.string(),
        type: z.enum(['string', 'number', 'boolean', 'date', 'object', 'array']),
        required: z.boolean().default(true),
        defaultValue: z.unknown().nullable(),
        description: z.string().nullable(),
        example: z.unknown().nullable(),
      }),
    )
    .default([]),

  locale: z.string().default('en'),
  parentTemplateId: z.string().uuid().nullable(),

  channelDefaults: z
    .object({
      fromEmail: z.string().email().nullable(),
      fromName: z.string().nullable(),
      replyTo: z.string().email().nullable(),
      fromNumber: z.string().nullable(),
    })
    .default({
      fromEmail: null,
      fromName: null,
      replyTo: null,
      fromNumber: null,
    }),

  version: z.number().int().default(1),
  isActive: z.boolean().default(true),
  publishedAt: z.date().nullable(),
  archivedAt: z.date().nullable(),

  usageCount: z.number().int().default(0),
  lastUsedAt: z.date().nullable(),

  createdBy: z.string().uuid(),
  organizationId: z.string().uuid().nullable(),
});

// ============================================
// Subscription Schema (User Preferences)
// ============================================
export const SubscriptionDBSchema = BaseEntityDBSchema.extend({
  user_id: z.string().uuid(),

  // Channel preferences
  channels: z
    .object({
      email: z.boolean().default(true),
      sms: z.boolean().default(true),
      push: z.boolean().default(true),
      in_app: z.boolean().default(true),
    })
    .default({
      email: true,
      sms: true,
      push: true,
      in_app: true,
    }),

  // Category preferences
  categories: z
    .object({
      marketing: z.boolean().default(false),
      transactional: z.boolean().default(true),
      alert: z.boolean().default(true),
      system: z.boolean().default(true),
    })
    .default({
      marketing: false,
      transactional: true,
      alert: true,
      system: true,
    }),

  // Notification types
  notification_types: z
    .object({
      incident_created: z.boolean().default(true),
      incident_updated: z.boolean().default(true),
      incident_resolved: z.boolean().default(true),
      chat_message: z.boolean().default(true),
      chat_mention: z.boolean().default(true),
      system_maintenance: z.boolean().default(true),
      account_activity: z.boolean().default(true),
    })
    .default({
      incident_created: true,
      incident_updated: true,
      incident_resolved: true,
      chat_message: true,
      chat_mention: true,
      system_maintenance: true,
      account_activity: true,
    }),

  // Quiet hours
  quiet_hours_enabled: z.boolean().default(false),
  quiet_hours_start: z.string().nullable(), // HH:MM format
  quiet_hours_end: z.string().nullable(),
  quiet_hours_timezone: z.string().default('UTC'),
  quiet_hours_override_critical: z.boolean().default(true), // Critical alerts bypass quiet hours

  // Frequency limits
  frequency_limits: z
    .object({
      max_per_hour: z.number().nullable(),
      max_per_day: z.number().nullable(),
      batch_window_minutes: z.number().default(5), // Batch notifications within this window
    })
    .default({
      max_per_hour: null,
      max_per_day: null,
      batch_window_minutes: 5,
    }),

  // Delivery preferences
  delivery_preferences: z
    .object({
      email_format: z.enum(['html', 'text', 'both']).default('html'),
      language: z.string().default('en'),
      timezone: z.string().default('UTC'),
    })
    .default({
      email_format: 'html',
      language: 'en',
      timezone: 'UTC',
    }),

  // Unsubscribe
  unsubscribed_all: z.boolean().default(false),
  unsubscribed_at: z.date().nullable(),
  unsubscribe_token: z.string().nullable(),
});

export const SubscriptionSchema = BaseEntitySchema.extend({
  userId: z.string().uuid(),

  channels: z
    .object({
      email: z.boolean().default(true),
      sms: z.boolean().default(true),
      push: z.boolean().default(true),
      inApp: z.boolean().default(true),
    })
    .default({
      email: true,
      sms: true,
      push: true,
      inApp: true,
    }),

  categories: z
    .object({
      marketing: z.boolean().default(false),
      transactional: z.boolean().default(true),
      alert: z.boolean().default(true),
      system: z.boolean().default(true),
    })
    .default({
      marketing: false,
      transactional: true,
      alert: true,
      system: true,
    }),

  notificationTypes: z
    .object({
      incidentCreated: z.boolean().default(true),
      incidentUpdated: z.boolean().default(true),
      incidentResolved: z.boolean().default(true),
      chatMessage: z.boolean().default(true),
      chatMention: z.boolean().default(true),
      systemMaintenance: z.boolean().default(true),
      accountActivity: z.boolean().default(true),
    })
    .default({
      incidentCreated: true,
      incidentUpdated: true,
      incidentResolved: true,
      chatMessage: true,
      chatMention: true,
      systemMaintenance: true,
      accountActivity: true,
    }),

  quietHoursEnabled: z.boolean().default(false),
  quietHoursStart: z.string().nullable(),
  quietHoursEnd: z.string().nullable(),
  quietHoursTimezone: z.string().default('UTC'),
  quietHoursOverrideCritical: z.boolean().default(true),

  frequencyLimits: z
    .object({
      maxPerHour: z.number().nullable(),
      maxPerDay: z.number().nullable(),
      batchWindowMinutes: z.number().default(5),
    })
    .default({
      maxPerHour: null,
      maxPerDay: null,
      batchWindowMinutes: 5,
    }),

  deliveryPreferences: z
    .object({
      emailFormat: z.enum(['html', 'text', 'both']).default('html'),
      language: z.string().default('en'),
      timezone: z.string().default('UTC'),
    })
    .default({
      emailFormat: 'html',
      language: 'en',
      timezone: 'UTC',
    }),

  unsubscribedAll: z.boolean().default(false),
  unsubscribedAt: z.date().nullable(),
  unsubscribeToken: z.string().nullable(),
});

// ============================================
// Input Schemas
// ============================================
export const SendNotificationSchema = z
  .object({
    recipientId: z.string().uuid(),
    channel: NotificationChannelSchema,
    priority: NotificationPrioritySchema.optional(),

    // Direct content or template
    subject: z.string().optional(),
    content: z.string().optional(),
    templateId: z.string().uuid().optional(),
    templateData: z.record(z.unknown()).optional(),

    // Scheduling
    scheduledFor: z.date().optional(),
    expiresAt: z.date().optional(),

    // Related entities
    incidentId: z.string().uuid().optional(),
    threadId: z.string().uuid().optional(),

    // Tags
    tags: z.array(z.string()).optional(),
  })
  .refine((data) => data.content || data.templateId, {
    message: 'Either content or templateId must be provided',
  });

export const BatchNotificationSchema = z.object({
  recipientIds: z.array(z.string().uuid()).min(1),
  channel: NotificationChannelSchema,
  priority: NotificationPrioritySchema.optional(),

  subject: z.string().optional(),
  content: z.string().optional(),
  templateId: z.string().uuid().optional(),
  templateData: z.record(z.unknown()).optional(),

  batchId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
});

export const UpdateSubscriptionSchema = z.object({
  channels: z
    .object({
      email: z.boolean().optional(),
      sms: z.boolean().optional(),
      push: z.boolean().optional(),
      inApp: z.boolean().optional(),
    })
    .optional(),

  categories: z
    .object({
      marketing: z.boolean().optional(),
      transactional: z.boolean().optional(),
      alert: z.boolean().optional(),
      system: z.boolean().optional(),
    })
    .optional(),

  quietHours: z
    .object({
      enabled: z.boolean().optional(),
      start: z.string().optional(),
      end: z.string().optional(),
      timezone: z.string().optional(),
    })
    .optional(),
});

// ============================================
// Type Exports
// ============================================
export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;
export type NotificationPriority = z.infer<typeof NotificationPrioritySchema>;
export type NotificationStatus = z.infer<typeof NotificationStatusSchema>;
export type Notification = z.infer<typeof NotificationSchema>;
export type NotificationDB = z.infer<typeof NotificationDBSchema>;
export type Template = z.infer<typeof TemplateSchema>;
export type TemplateDB = z.infer<typeof TemplateDBSchema>;
export type Subscription = z.infer<typeof SubscriptionSchema>;
export type SubscriptionDB = z.infer<typeof SubscriptionDBSchema>;
export type SendNotificationInput = z.infer<typeof SendNotificationSchema>;
export type BatchNotificationInput = z.infer<typeof BatchNotificationSchema>;
export type UpdateSubscriptionInput = z.infer<typeof UpdateSubscriptionSchema>;
