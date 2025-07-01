// src/domain/entities/schemas/analytics.schema.ts
import { z } from 'zod';
import { BaseEntitySchema, BaseEntityDBSchema } from './entity.schema';

// ============================================
// Audit Log Schema
// ============================================
export const AuditLogDBSchema = BaseEntityDBSchema.extend({
  entity_type: z.string(), // "user", "incident", "notification"
  entity_id: z.string(),
  action: z.enum([
    // CRUD operations
    'create',
    'read',
    'update',
    'delete',
    // Auth operations
    'login',
    'logout',
    'password_change',
    'password_reset',
    'email_verify',
    'two_factor_enable',
    'two_factor_disable',
    // Access operations
    'invite',
    'accept_invite',
    'remove_access',
    'change_role',
    // Status operations
    'approve',
    'reject',
    'publish',
    'archive',
    'restore',
    'activate',
    'deactivate',
    'suspend',
    // Data operations
    'export',
    'import',
    'download',
    'upload',
    // Other
    'view',
    'search',
    'filter',
  ]),

  // Actor information
  user_id: z.string().uuid().nullable(), // Null for system actions
  user_email: z.string().email().nullable(),
  user_role: z.string().nullable(),

  organization_id: z.string().uuid().nullable(),

  // Request context
  ip_address: z.string().nullable(),
  user_agent: z.string().nullable(),
  correlation_id: z.string().uuid().nullable(),

  // Change tracking
  changes: z
    .object({
      before: z.record(z.unknown()).nullable(),
      after: z.record(z.unknown()).nullable(),
      fields_changed: z.array(z.string()).optional(),
    })
    .nullable(),

  // Additional context
  status: z.enum(['success', 'failure']),
  error_message: z.string().nullable(),
  duration_ms: z.number().nullable(),

  severity: z.enum(['low', 'medium', 'high', 'critical']).default('low'),

  // Flexible metadata for additional context
  metadata: z.record(z.unknown()).nullable(),
});

export const AuditLogSchema = BaseEntitySchema.extend({
  entityType: z.string(),
  entityId: z.string(),
  action: z.enum([
    // CRUD operations
    'create',
    'read',
    'update',
    'delete',
    // Auth operations
    'login',
    'logout',
    'password_change',
    'password_reset',
    'email_verify',
    'two_factor_enable',
    'two_factor_disable',
    // Access operations
    'invite',
    'accept_invite',
    'remove_access',
    'change_role',
    // Status operations
    'approve',
    'reject',
    'publish',
    'archive',
    'restore',
    'activate',
    'deactivate',
    'suspend',
    // Data operations
    'export',
    'import',
    'download',
    'upload',
    // Other
    'view',
    'search',
    'filter',
  ]),

  // Actor information
  userId: z.string().uuid().nullable(),
  userEmail: z.string().email().nullable(),
  userRole: z.string().nullable(),

  organizationId: z.string().uuid().nullable(),

  // Request context
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  correlationId: z.string().uuid().nullable(),

  // Change tracking
  changes: z
    .object({
      before: z.record(z.unknown()).nullable(),
      after: z.record(z.unknown()).nullable(),
      fieldsChanged: z.array(z.string()).optional(),
    })
    .nullable(),

  // Additional context
  status: z.enum(['success', 'failure']),
  errorMessage: z.string().nullable(),
  durationMs: z.number().nullable(),

  severity: z.enum(['low', 'medium', 'high', 'critical']).default('low'),

  // Flexible metadata
  metadata: z.record(z.unknown()).nullable(),
});

// ============================================
// Event Schema (for event sourcing/tracking)
// ============================================
export const EventDBSchema = BaseEntityDBSchema.extend({
  event_type: z.string(), // "user.created", "incident.resolved", "notification.sent"
  event_version: z.number().int().default(1),

  // Aggregate information
  aggregate_id: z.string(),
  aggregate_type: z.string(),
  sequence_number: z.number().int(),

  // Event data
  payload: z.record(z.unknown()),

  // Event metadata
  correlation_id: z.string().uuid().nullable(),
  causation_id: z.string().uuid().nullable(), // What caused this event
  user_id: z.string().uuid().nullable(),

  // Processing status
  processed_at: z.date().nullable(),
  failed_at: z.date().nullable(),
  retry_count: z.number().int().default(0),
});

export const EventSchema = BaseEntitySchema.extend({
  eventType: z.string(),
  eventVersion: z.number().int().default(1),

  // Aggregate information
  aggregateId: z.string(),
  aggregateType: z.string(),
  sequenceNumber: z.number().int(),

  // Event data
  payload: z.record(z.unknown()),

  // Event metadata
  correlationId: z.string().uuid().nullable(),
  causationId: z.string().uuid().nullable(),
  userId: z.string().uuid().nullable(),

  // Processing status
  processedAt: z.date().nullable(),
  failedAt: z.date().nullable(),
  retryCount: z.number().int().default(0),
});

// ============================================
// Metric Schema
// ============================================
export const MetricDBSchema = BaseEntityDBSchema.extend({
  name: z.string(), // "api.response_time", "incident.resolution_time"
  value: z.number(),
  unit: z.string().nullable(), // "ms", "count", "bytes", "percentage"
  type: z.enum(['counter', 'gauge', 'histogram', 'summary']),

  // Dimensions/Tags for filtering
  tags: z.record(z.string()), // { service: "api", endpoint: "/users", status: "200" }

  // Time window (for aggregated metrics)
  timestamp: z.date(),
  period_start: z.date().nullable(),
  period_end: z.date().nullable(),

  // Statistical data (for histograms/summaries)
  count: z.number().nullable(),
  sum: z.number().nullable(),
  min: z.number().nullable(),
  max: z.number().nullable(),
  avg: z.number().nullable(),
  p50: z.number().nullable(),
  p95: z.number().nullable(),
  p99: z.number().nullable(),
});

export const MetricSchema = BaseEntitySchema.extend({
  name: z.string(),
  value: z.number(),
  unit: z.string().nullable(),
  type: z.enum(['counter', 'gauge', 'histogram', 'summary']),

  tags: z.record(z.string()),

  timestamp: z.date(),
  periodStart: z.date().nullable(),
  periodEnd: z.date().nullable(),

  count: z.number().nullable(),
  sum: z.number().nullable(),
  min: z.number().nullable(),
  max: z.number().nullable(),
  avg: z.number().nullable(),
  p50: z.number().nullable(),
  p95: z.number().nullable(),
  p99: z.number().nullable(),
});

// ============================================
// Activity Log Schema (user/system activities)
// ============================================
export const ActivityLogDBSchema = BaseEntityDBSchema.extend({
  actor_type: z.enum(['user', 'system', 'api']),
  actor_id: z.string().nullable(),

  activity_type: z.string(), // "incident.viewed", "notification.clicked", "file.downloaded"
  activity_category: z.enum(['view', 'action', 'navigation', 'system']),

  // Context
  resource_type: z.string().nullable(),
  resource_id: z.string().nullable(),

  // Additional data
  details: z.record(z.unknown()).nullable(),
  session_id: z.string().uuid().nullable(),

  // Performance
  duration_ms: z.number().nullable(),
});

export const ActivityLogSchema = BaseEntitySchema.extend({
  actorType: z.enum(['user', 'system', 'api']),
  actorId: z.string().nullable(),

  activityType: z.string(),
  activityCategory: z.enum(['view', 'action', 'navigation', 'system']),

  resourceType: z.string().nullable(),
  resourceId: z.string().nullable(),

  details: z.record(z.unknown()).nullable(),
  sessionId: z.string().uuid().nullable(),

  durationMs: z.number().nullable(),
});

// ============================================
// Analytics Query Schemas
// ============================================
export const MetricQuerySchema = z.object({
  name: z.string().optional(),
  tags: z.record(z.string()).optional(),
  startTime: z.date(),
  endTime: z.date(),
  aggregation: z.enum(['sum', 'avg', 'min', 'max', 'count']).optional(),
  groupBy: z.array(z.string()).optional(), // Tag keys to group by
  interval: z.enum(['minute', 'hour', 'day', 'week', 'month']).optional(),
});

export const AuditQuerySchema = z.object({
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  startDate: z.date(),
  endDate: z.date(),
  status: z.enum(['success', 'failure']).optional(),
  limit: z.number().int().positive().default(100),
  offset: z.number().int().nonnegative().default(0),
});

// ============================================
// Analytics Report Schemas
// ============================================
export const IncidentAnalyticsSchema = z.object({
  totalIncidents: z.number(),
  resolvedIncidents: z.number(),
  averageResolutionTime: z.number(), // in minutes
  incidentsByType: z.record(z.number()),
  incidentsBySeverity: z.record(z.number()),
  topResponders: z.array(
    z.object({
      userId: z.string().uuid(),
      name: z.string(),
      incidentsHandled: z.number(),
    }),
  ),
  peakHours: z.array(
    z.object({
      hour: z.number(),
      count: z.number(),
    }),
  ),
});

export const NotificationAnalyticsSchema = z.object({
  totalSent: z.number(),
  totalDelivered: z.number(),
  totalFailed: z.number(),
  deliveryRate: z.number(), // percentage

  byChannel: z.object({
    email: z.object({
      sent: z.number(),
      delivered: z.number(),
      opened: z.number(),
      clicked: z.number(),
    }),
    sms: z.object({
      sent: z.number(),
      delivered: z.number(),
      failed: z.number(),
    }),
    push: z.object({
      sent: z.number(),
      delivered: z.number(),
      opened: z.number(),
    }),
  }),

  averageDeliveryTime: z.number(), // in seconds
});

// ============================================
// Common Metric Names (for reference)
// ============================================
export const MetricNames = {
  // API Metrics
  API_REQUEST_COUNT: 'api.request.count',
  API_REQUEST_DURATION: 'api.request.duration',
  API_ERROR_COUNT: 'api.error.count',

  // Incident Metrics
  INCIDENT_CREATED: 'incident.created.count',
  INCIDENT_RESOLVED: 'incident.resolved.count',
  INCIDENT_RESOLUTION_TIME: 'incident.resolution.time',

  // Notification Metrics
  NOTIFICATION_SENT: 'notification.sent.count',
  NOTIFICATION_DELIVERED: 'notification.delivered.count',
  NOTIFICATION_FAILED: 'notification.failed.count',

  // System Metrics
  QUEUE_SIZE: 'queue.size',
  CACHE_HIT_RATE: 'cache.hit.rate',
  DB_CONNECTION_COUNT: 'db.connection.count',
} as const;

// ============================================
// Type Exports
// ============================================
export type AuditLog = z.infer<typeof AuditLogSchema>;
export type AuditLogDB = z.infer<typeof AuditLogDBSchema>;
export type Event = z.infer<typeof EventSchema>;
export type EventDB = z.infer<typeof EventDBSchema>;
export type Metric = z.infer<typeof MetricSchema>;
export type MetricDB = z.infer<typeof MetricDBSchema>;
export type ActivityLog = z.infer<typeof ActivityLogSchema>;
export type ActivityLogDB = z.infer<typeof ActivityLogDBSchema>;
export type MetricQuery = z.infer<typeof MetricQuerySchema>;
export type AuditQuery = z.infer<typeof AuditQuerySchema>;
export type IncidentAnalytics = z.infer<typeof IncidentAnalyticsSchema>;
export type NotificationAnalytics = z.infer<typeof NotificationAnalyticsSchema>;
export const ActionSeverityMap: Record<AuditLog['action'], AuditLog['severity']> = {
  // Low severity
  read: 'low',
  view: 'low',
  search: 'low',
  filter: 'low',
  download: 'low',

  // Medium severity
  create: 'medium',
  update: 'medium',
  upload: 'medium',
  login: 'medium',
  logout: 'medium',

  // High severity
  delete: 'high',
  password_change: 'high',
  password_reset: 'high',
  email_verify: 'high',
  change_role: 'high',
  export: 'high',
  import: 'high',

  // Critical severity
  two_factor_enable: 'critical',
  two_factor_disable: 'critical',
  invite: 'critical',
  accept_invite: 'critical',
  remove_access: 'critical',
  approve: 'critical',
  reject: 'critical',
  publish: 'critical',
  archive: 'critical',
  restore: 'critical',
  activate: 'critical',
  deactivate: 'critical',
  suspend: 'critical',
};
