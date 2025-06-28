// src/domain/entities/schemas/operations.schema.ts
import { z } from 'zod';
import { BaseEntitySchema, BaseEntityDBSchema } from './entity.schema';

// ============================================
// Task Schema (Background Jobs)
// ============================================
export const TaskStatusSchema = z.enum([
  'pending',
  'scheduled',
  'running',
  'completed',
  'failed',
  'cancelled',
  'retrying',
  'stalled',
]);

export const TaskPrioritySchema = z.enum(['critical', 'high', 'normal', 'low']);

export const TaskDBSchema = BaseEntityDBSchema.extend({
  // Task identification
  name: z.string(),
  type: z.string(), // 'email.send', 'report.generate', 'data.export', etc.

  // Status and priority
  status: TaskStatusSchema.default('pending'),
  priority: TaskPrioritySchema.default('normal'),

  // Payload and result
  payload: z.record(z.unknown()).default({}),
  result: z.record(z.unknown()).nullable(),

  // Error tracking
  error: z
    .object({
      message: z.string(),
      stack: z.string().nullable(),
      code: z.string().nullable(),
      details: z.record(z.unknown()).nullable(),
    })
    .nullable(),

  // Execution tracking
  attempts: z.number().int().default(0),
  max_attempts: z.number().int().default(3),

  // Timing
  scheduled_for: z.date().nullable(),
  started_at: z.date().nullable(),
  completed_at: z.date().nullable(),
  failed_at: z.date().nullable(),
  stalled_at: z.date().nullable(),
  next_retry_at: z.date().nullable(),

  // Timeouts
  timeout_ms: z.number().int().default(300000), // 5 minutes default
  stall_timeout_ms: z.number().int().default(60000), // 1 minute

  // Progress tracking
  progress: z
    .object({
      current: z.number().default(0),
      total: z.number().nullable(),
      percentage: z.number().min(0).max(100).default(0),
      message: z.string().nullable(),
    })
    .default({
      current: 0,
      total: null,
      percentage: 0,
      message: null,
    }),

  // Queue information
  queue_name: z.string().default('default'),
  worker_id: z.string().nullable(),

  // Dependencies
  depends_on: z.array(z.string().uuid()).default([]), // Task IDs that must complete first
  parent_task_id: z.string().uuid().nullable(),
  child_task_ids: z.array(z.string().uuid()).default([]),

  // Ownership
  created_by: z.string().uuid().nullable(),
  organization_id: z.string().uuid().nullable(),

  // Metadata
  tags: z.array(z.string()).default([]),
  correlation_id: z.string().uuid().nullable(),
});

export const TaskSchema = BaseEntitySchema.extend({
  name: z.string(),
  type: z.string(),

  status: TaskStatusSchema.default('pending'),
  priority: TaskPrioritySchema.default('normal'),

  payload: z.record(z.unknown()).default({}),
  result: z.record(z.unknown()).nullable(),

  error: z
    .object({
      message: z.string(),
      stack: z.string().nullable(),
      code: z.string().nullable(),
      details: z.record(z.unknown()).nullable(),
    })
    .nullable(),

  attempts: z.number().int().default(0),
  maxAttempts: z.number().int().default(3),

  scheduledFor: z.date().nullable(),
  startedAt: z.date().nullable(),
  completedAt: z.date().nullable(),
  failedAt: z.date().nullable(),
  stalledAt: z.date().nullable(),
  nextRetryAt: z.date().nullable(),

  timeoutMs: z.number().int().default(300000),
  stallTimeoutMs: z.number().int().default(60000),

  progress: z
    .object({
      current: z.number().default(0),
      total: z.number().nullable(),
      percentage: z.number().min(0).max(100).default(0),
      message: z.string().nullable(),
    })
    .default({
      current: 0,
      total: null,
      percentage: 0,
      message: null,
    }),

  queueName: z.string().default('default'),
  workerId: z.string().nullable(),

  dependsOn: z.array(z.string().uuid()).default([]),
  parentTaskId: z.string().uuid().nullable(),
  childTaskIds: z.array(z.string().uuid()).default([]),

  createdBy: z.string().uuid().nullable(),
  organizationId: z.string().uuid().nullable(),

  tags: z.array(z.string()).default([]),
  correlationId: z.string().uuid().nullable(),
});

// ============================================
// Webhook Schema
// ============================================
export const WebhookEventSchema = z.enum([
  'incident.created',
  'incident.updated',
  'incident.resolved',
  'notification.sent',
  'notification.delivered',
  'notification.failed',
  'user.created',
  'user.updated',
  'user.deleted',
  'task.completed',
  'task.failed',
  '*', // Subscribe to all events
]);

export const WebhookDBSchema = BaseEntityDBSchema.extend({
  // Webhook configuration
  name: z.string(),
  description: z.string().nullable(),
  url: z.string().url(),

  // Events to subscribe to
  events: z.array(WebhookEventSchema).min(1),

  // Authentication
  auth_type: z.enum(['none', 'basic', 'bearer', 'api_key', 'hmac']).default('none'),
  auth_credentials: z
    .object({
      username: z.string().nullable(),
      password: z.string().nullable(),
      token: z.string().nullable(),
      api_key: z.string().nullable(),
      header_name: z.string().nullable(),
    })
    .nullable(),

  // Security
  secret: z.string().nullable(), // For HMAC signature verification

  // Request configuration
  method: z.enum(['POST', 'PUT', 'PATCH']).default('POST'),
  headers: z.record(z.string()).default({}),

  // Retry configuration
  retry_enabled: z.boolean().default(true),
  max_retries: z.number().int().default(3),
  retry_delay_ms: z.number().int().default(5000),
  timeout_ms: z.number().int().default(30000),

  // Status
  is_active: z.boolean().default(true),
  is_verified: z.boolean().default(false), // Endpoint verification
  verified_at: z.date().nullable(),

  // Rate limiting
  rate_limit_per_hour: z.number().int().nullable(),

  // Failure tracking
  consecutive_failures: z.number().int().default(0),
  last_failure_at: z.date().nullable(),
  last_failure_reason: z.string().nullable(),
  disabled_at: z.date().nullable(), // Auto-disabled after too many failures

  // Success tracking
  last_success_at: z.date().nullable(),
  total_deliveries: z.number().int().default(0),
  total_failures: z.number().int().default(0),

  // Ownership
  created_by: z.string().uuid(),
  organization_id: z.string().uuid().nullable(),

  // Filters
  filters: z
    .object({
      incident_types: z.array(z.string()).nullable(),
      incident_severities: z.array(z.string()).nullable(),
      user_roles: z.array(z.string()).nullable(),
      tags: z.array(z.string()).nullable(),
    })
    .nullable(),
});

export const WebhookSchema = BaseEntitySchema.extend({
  name: z.string(),
  description: z.string().nullable(),
  url: z.string().url(),

  events: z.array(WebhookEventSchema).min(1),

  authType: z.enum(['none', 'basic', 'bearer', 'api_key', 'hmac']).default('none'),
  authCredentials: z
    .object({
      username: z.string().nullable(),
      password: z.string().nullable(),
      token: z.string().nullable(),
      apiKey: z.string().nullable(),
      headerName: z.string().nullable(),
    })
    .nullable(),

  secret: z.string().nullable(),

  method: z.enum(['POST', 'PUT', 'PATCH']).default('POST'),
  headers: z.record(z.string()).default({}),

  retryEnabled: z.boolean().default(true),
  maxRetries: z.number().int().default(3),
  retryDelayMs: z.number().int().default(5000),
  timeoutMs: z.number().int().default(30000),

  isActive: z.boolean().default(true),
  isVerified: z.boolean().default(false),
  verifiedAt: z.date().nullable(),

  rateLimitPerHour: z.number().int().nullable(),

  consecutiveFailures: z.number().int().default(0),
  lastFailureAt: z.date().nullable(),
  lastFailureReason: z.string().nullable(),
  disabledAt: z.date().nullable(),

  lastSuccessAt: z.date().nullable(),
  totalDeliveries: z.number().int().default(0),
  totalFailures: z.number().int().default(0),

  createdBy: z.string().uuid(),
  organizationId: z.string().uuid().nullable(),

  filters: z
    .object({
      incidentTypes: z.array(z.string()).nullable(),
      incidentSeverities: z.array(z.string()).nullable(),
      userRoles: z.array(z.string()).nullable(),
      tags: z.array(z.string()).nullable(),
    })
    .nullable(),
});

// ============================================
// Webhook Delivery Schema (Log)
// ============================================
export const WebhookDeliveryDBSchema = BaseEntityDBSchema.extend({
  webhook_id: z.string().uuid(),
  event_type: z.string(),
  event_id: z.string(), // ID of the entity that triggered the event

  // Request details
  request: z.object({
    url: z.string().url(),
    method: z.string(),
    headers: z.record(z.string()),
    body: z.record(z.unknown()),
  }),

  // Response details
  response: z
    .object({
      status_code: z.number().nullable(),
      headers: z.record(z.string()).nullable(),
      body: z.unknown().nullable(),
      error: z.string().nullable(),
    })
    .nullable(),

  // Execution details
  attempt_number: z.number().int(),
  duration_ms: z.number().int().nullable(),

  // Status
  status: z.enum(['pending', 'success', 'failed', 'timeout']),
  delivered_at: z.date().nullable(),
  failed_at: z.date().nullable(),

  // Retry information
  will_retry: z.boolean().default(false),
  next_retry_at: z.date().nullable(),
});

// ============================================
// Feature Flag Schema
// ============================================
export const FeatureFlagDBSchema = BaseEntityDBSchema.extend({
  // Flag identification
  key: z.string(), // 'new-dashboard', 'incident-export', etc.
  name: z.string(),
  description: z.string().nullable(),

  // Status
  enabled: z.boolean().default(false),

  // Targeting rules
  rules: z
    .array(
      z.object({
        id: z.string().uuid(),
        type: z.enum(['user', 'group', 'percentage', 'attribute', 'custom']),

        // Rule configuration
        user_ids: z.array(z.string().uuid()).nullable(),
        group_ids: z.array(z.string().uuid()).nullable(),
        percentage: z.number().min(0).max(100).nullable(),

        // Attribute-based rules
        attribute: z.string().nullable(), // 'role', 'plan', 'created_at', etc.
        operator: z
          .enum(['equals', 'not_equals', 'contains', 'greater_than', 'less_than'])
          .nullable(),
        value: z.unknown().nullable(),

        // Custom rule
        custom_rule: z.string().nullable(), // JSON logic or expression

        enabled: z.boolean().default(true),
      }),
    )
    .default([]),

  // Variants (for A/B testing)
  variants: z
    .array(
      z.object({
        key: z.string(),
        name: z.string(),
        weight: z.number().min(0).max(100), // Percentage
        payload: z.record(z.unknown()).nullable(),
      }),
    )
    .nullable(),

  // Default variant
  default_variant: z.string().nullable(),

  // Scheduling
  enabled_at: z.date().nullable(),
  disabled_at: z.date().nullable(),
  schedule: z
    .object({
      start_date: z.date().nullable(),
      end_date: z.date().nullable(),
      timezone: z.string().default('UTC'),
    })
    .nullable(),

  // Metadata
  tags: z.array(z.string()).default([]),
  category: z.string().nullable(),

  // Ownership
  created_by: z.string().uuid(),
  organization_id: z.string().uuid().nullable(),

  // Usage tracking
  evaluation_count: z.number().int().default(0),
  last_evaluated_at: z.date().nullable(),
});

export const FeatureFlagSchema = BaseEntitySchema.extend({
  key: z.string(),
  name: z.string(),
  description: z.string().nullable(),

  enabled: z.boolean().default(false),

  rules: z
    .array(
      z.object({
        id: z.string().uuid(),
        type: z.enum(['user', 'group', 'percentage', 'attribute', 'custom']),

        userIds: z.array(z.string().uuid()).nullable(),
        groupIds: z.array(z.string().uuid()).nullable(),
        percentage: z.number().min(0).max(100).nullable(),

        attribute: z.string().nullable(),
        operator: z
          .enum(['equals', 'not_equals', 'contains', 'greater_than', 'less_than'])
          .nullable(),
        value: z.unknown().nullable(),

        customRule: z.string().nullable(),

        enabled: z.boolean().default(true),
      }),
    )
    .default([]),

  variants: z
    .array(
      z.object({
        key: z.string(),
        name: z.string(),
        weight: z.number().min(0).max(100),
        payload: z.record(z.unknown()).nullable(),
      }),
    )
    .nullable(),

  defaultVariant: z.string().nullable(),

  enabledAt: z.date().nullable(),
  disabledAt: z.date().nullable(),
  schedule: z
    .object({
      startDate: z.date().nullable(),
      endDate: z.date().nullable(),
      timezone: z.string().default('UTC'),
    })
    .nullable(),

  tags: z.array(z.string()).default([]),
  category: z.string().nullable(),

  createdBy: z.string().uuid(),
  organizationId: z.string().uuid().nullable(),

  evaluationCount: z.number().int().default(0),
  lastEvaluatedAt: z.date().nullable(),
});

// ============================================
// Input Schemas
// ============================================
export const CreateTaskSchema = z.object({
  name: z.string(),
  type: z.string(),
  payload: z.record(z.unknown()),
  priority: TaskPrioritySchema.optional(),
  scheduledFor: z.date().optional(),
  dependsOn: z.array(z.string().uuid()).optional(),
  tags: z.array(z.string()).optional(),
});

export const UpdateTaskProgressSchema = z.object({
  current: z.number(),
  total: z.number().optional(),
  message: z.string().optional(),
});

export const CreateWebhookSchema = z.object({
  name: z.string(),
  url: z.string().url(),
  events: z.array(WebhookEventSchema).min(1),
  authType: z.enum(['none', 'basic', 'bearer', 'api_key', 'hmac']).optional(),
  authCredentials: z
    .object({
      username: z.string().optional(),
      password: z.string().optional(),
      token: z.string().optional(),
      apiKey: z.string().optional(),
      headerName: z.string().optional(),
    })
    .optional(),
  headers: z.record(z.string()).optional(),
  filters: z
    .object({
      incidentTypes: z.array(z.string()).optional(),
      incidentSeverities: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
    })
    .optional(),
});

export const CreateFeatureFlagSchema = z.object({
  key: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  rules: z
    .array(
      z.object({
        type: z.enum(['user', 'group', 'percentage', 'attribute']),
        userIds: z.array(z.string().uuid()).optional(),
        groupIds: z.array(z.string().uuid()).optional(),
        percentage: z.number().min(0).max(100).optional(),
        attribute: z.string().optional(),
        operator: z
          .enum(['equals', 'not_equals', 'contains', 'greater_than', 'less_than'])
          .optional(),
        value: z.unknown().optional(),
      }),
    )
    .optional(),
  variants: z
    .array(
      z.object({
        key: z.string(),
        name: z.string(),
        weight: z.number().min(0).max(100),
        payload: z.record(z.unknown()).optional(),
      }),
    )
    .optional(),
});

export const EvaluateFeatureFlagSchema = z.object({
  userId: z.string().uuid(),
  attributes: z.record(z.unknown()).optional(),
});

// ============================================
// Type Exports
// ============================================
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;
export type Task = z.infer<typeof TaskSchema>;
export type TaskDB = z.infer<typeof TaskDBSchema>;
export type WebhookEvent = z.infer<typeof WebhookEventSchema>;
export type Webhook = z.infer<typeof WebhookSchema>;
export type WebhookDB = z.infer<typeof WebhookDBSchema>;
export type WebhookDeliveryDB = z.infer<typeof WebhookDeliveryDBSchema>;
export type FeatureFlag = z.infer<typeof FeatureFlagSchema>;
export type FeatureFlagDB = z.infer<typeof FeatureFlagDBSchema>;
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskProgressInput = z.infer<typeof UpdateTaskProgressSchema>;
export type CreateWebhookInput = z.infer<typeof CreateWebhookSchema>;
export type CreateFeatureFlagInput = z.infer<typeof CreateFeatureFlagSchema>;
export type EvaluateFeatureFlagInput = z.infer<typeof EvaluateFeatureFlagSchema>;
