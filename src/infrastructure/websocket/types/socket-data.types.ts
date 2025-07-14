// src/infrastructure/websocket/types/socket-data.types.ts
import { z } from 'zod';

/**
 * WebSocket Data Schemas
 * Zod schemas for validating socket event payloads
 */

// ============================================
// Base Schemas
// ============================================
export const SocketEventMetaSchema = z.object({
  timestamp: z.string().datetime(),
  correlationId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  socketId: z.string().optional(),
});

export const SocketErrorSchema = z.object({
  message: z.string(),
  code: z.string(),
  correlationId: z.string().uuid().optional(),
  details: z.record(z.unknown()).optional(),
});

// ============================================
// Authentication Schemas
// ============================================
export const AuthLoginSchema = z.object({
  token: z.string().min(1),
  correlationId: z.string().uuid().optional(),
});

export const AuthRefreshSchema = z.object({
  refreshToken: z.string().min(1),
  correlationId: z.string().uuid().optional(),
});

export const AuthSuccessSchema = z.object({
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    role: z.string(),
    organizationId: z.string().uuid().optional(),
  }),
  sessionId: z.string().uuid(),
  expiresAt: z.number().int().positive(),
});

// ============================================
// Presence Schemas
// ============================================
export const PresenceStatusSchema = z.enum(['online', 'away', 'busy', 'offline']);

export const PresenceJoinSchema = z.object({
  userId: z.string().uuid(),
});

export const PresenceStatusUpdateSchema = z.object({
  status: PresenceStatusSchema,
});

export const PresenceUserSchema = z.object({
  userId: z.string().uuid(),
  status: PresenceStatusSchema,
  lastSeen: z.string().datetime().optional(),
});

export const PresenceUserListSchema = z.object({
  users: z.array(PresenceUserSchema),
});

// ============================================
// Data Event Schemas
// ============================================
export const DataSubscribeSchema = z.object({
  channel: z.string().min(1),
  filters: z.record(z.unknown()).optional(),
});

export const DataUnsubscribeSchema = z.object({
  channel: z.string().min(1),
});

export const DataRequestSchema = z.object({
  type: z.string().min(1),
  id: z.string().uuid(),
  requestId: z.string().uuid().optional(),
});

export const DataUpdateSchema = z.object({
  channel: z.string().min(1),
  type: z.string().min(1),
  id: z.string().uuid(),
  action: z.enum(['created', 'updated', 'deleted']),
  data: z.record(z.unknown()),
  timestamp: z.string().datetime().optional(),
});

export const DataResponseSchema = z.object({
  requestId: z.string().uuid(),
  success: z.boolean(),
  data: z.record(z.unknown()).optional(),
  error: z.string().optional(),
});

// ============================================
// Notification Schemas
// ============================================
export const NotificationMarkReadSchema = z.object({
  notificationId: z.string().uuid(),
});

export const NotificationNewSchema = z.object({
  notification: z.record(z.unknown()), // Will be typed based on your notification schema
});

export const NotificationUpdatedSchema = z.object({
  notificationId: z.string().uuid(),
  changes: z.record(z.unknown()),
});

export const NotificationDeletedSchema = z.object({
  notificationId: z.string().uuid(),
});

export const NotificationCountSchema = z.object({
  unreadCount: z.number().int().min(0),
});

// ============================================
// System Schemas
// ============================================
export const SystemHealthSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.string().datetime().optional(),
  details: z.record(z.unknown()).optional(),
});

export const SystemMaintenanceSchema = z.object({
  message: z.string(),
  scheduledAt: z.string().datetime().optional(),
  duration: z.number().int().positive().optional(),
});

// ============================================
// Socket Event Payload Union
// ============================================
export const SocketEventPayloadSchema = z.union([
  AuthLoginSchema,
  AuthRefreshSchema,
  AuthSuccessSchema,
  PresenceJoinSchema,
  PresenceStatusUpdateSchema,
  DataSubscribeSchema,
  DataUnsubscribeSchema,
  DataRequestSchema,
  DataUpdateSchema,
  DataResponseSchema,
  NotificationMarkReadSchema,
  NotificationNewSchema,
  NotificationUpdatedSchema,
  NotificationDeletedSchema,
  NotificationCountSchema,
  SystemHealthSchema,
  SystemMaintenanceSchema,
]);

// ============================================
// Type Exports
// ============================================
export type SocketEventMeta = z.infer<typeof SocketEventMetaSchema>;
export type SocketError = z.infer<typeof SocketErrorSchema>;

export type AuthLogin = z.infer<typeof AuthLoginSchema>;
export type AuthRefresh = z.infer<typeof AuthRefreshSchema>;
export type AuthSuccess = z.infer<typeof AuthSuccessSchema>;

export type PresenceStatus = z.infer<typeof PresenceStatusSchema>;
export type PresenceJoin = z.infer<typeof PresenceJoinSchema>;
export type PresenceStatusUpdate = z.infer<typeof PresenceStatusUpdateSchema>;
export type PresenceUser = z.infer<typeof PresenceUserSchema>;
export type PresenceUserList = z.infer<typeof PresenceUserListSchema>;

export type DataSubscribe = z.infer<typeof DataSubscribeSchema>;
export type DataUnsubscribe = z.infer<typeof DataUnsubscribeSchema>;
export type DataRequest = z.infer<typeof DataRequestSchema>;
export type DataUpdate = z.infer<typeof DataUpdateSchema>;
export type DataResponse = z.infer<typeof DataResponseSchema>;

export type NotificationMarkRead = z.infer<typeof NotificationMarkReadSchema>;
export type NotificationNew = z.infer<typeof NotificationNewSchema>;
export type NotificationUpdated = z.infer<typeof NotificationUpdatedSchema>;
export type NotificationDeleted = z.infer<typeof NotificationDeletedSchema>;
export type NotificationCount = z.infer<typeof NotificationCountSchema>;

export type SystemHealth = z.infer<typeof SystemHealthSchema>;
export type SystemMaintenance = z.infer<typeof SystemMaintenanceSchema>;

export type SocketEventPayload = z.infer<typeof SocketEventPayloadSchema>;
