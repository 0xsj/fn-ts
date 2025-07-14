// src/infrastructure/websocket/types/socket-events.types.ts

/**
 * Core WebSocket Event Types
 * Fundamental events that support any domain/industry
 */

// ============================================
// Authentication Events
// ============================================
export interface AuthEvents {
  // Client -> Server
  'auth:login': (data: { token: string }) => void;
  'auth:logout': () => void;
  'auth:refresh': (data: { refreshToken: string }) => void;

  // Server -> Client
  'auth:success': (data: { user: { id: string; email: string; role: string } }) => void;
  'auth:error': (data: { message: string; code: string }) => void;
  'auth:expired': () => void;
}

// ============================================
// Presence Events
// ============================================
export interface PresenceEvents {
  // Client -> Server
  'presence:join': (data: { userId: string }) => void;
  'presence:leave': () => void;
  'presence:status': (data: { status: 'online' | 'away' | 'busy' | 'offline' }) => void;

  // Server -> Client
  'presence:user-online': (data: { userId: string; status: string }) => void;
  'presence:user-offline': (data: { userId: string }) => void;
  'presence:user-list': (data: { users: Array<{ userId: string; status: string }> }) => void;
}

// ============================================
// Real-time Data Events (Generic)
// ============================================
export interface DataEvents {
  // Client -> Server
  'data:subscribe': (data: { channel: string; filters?: Record<string, unknown> }) => void;
  'data:unsubscribe': (data: { channel: string }) => void;
  'data:request': (data: { type: string; id: string }) => void;

  // Server -> Client
  'data:update': (data: {
    channel: string;
    type: string;
    id: string;
    action: 'created' | 'updated' | 'deleted';
    data: Record<string, unknown>;
  }) => void;
  'data:response': (data: {
    requestId: string;
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
  }) => void;
}

// ============================================
// Notification Events
// ============================================
export interface NotificationEvents {
  // Client -> Server
  'notification:subscribe': () => void;
  'notification:unsubscribe': () => void;
  'notification:mark-read': (data: { notificationId: string }) => void;
  'notification:mark-all-read': () => void;

  // Server -> Client
  'notification:new': (data: { notification: Record<string, unknown> }) => void;
  'notification:updated': (data: {
    notificationId: string;
    changes: Record<string, unknown>;
  }) => void;
  'notification:deleted': (data: { notificationId: string }) => void;
  'notification:count': (data: { unreadCount: number }) => void;
}

// ============================================
// System Events
// ============================================
export interface SystemEvents {
  // Client -> Server
  'system:ping': () => void;
  'system:subscribe-health': () => void;

  // Server -> Client
  'system:pong': () => void;
  'system:error': (data: { message: string; code: string }) => void;
  'system:maintenance': (data: { message: string; scheduledAt?: string }) => void;
  'system:health': (data: { status: 'healthy' | 'degraded' | 'unhealthy' }) => void;
}

// ============================================
// Combined Socket Events Map
// ============================================
export interface SocketEvents
  extends AuthEvents,
    PresenceEvents,
    DataEvents,
    NotificationEvents,
    SystemEvents {}

// ============================================
// Event Categories for Organization
// ============================================
export type EventCategory = 'auth' | 'presence' | 'data' | 'notification' | 'system';

export type EventName = keyof SocketEvents;

// ============================================
// Helper Types
// ============================================
export type SocketEventHandler<T extends EventName> = SocketEvents[T];

export interface SocketEventPayload {
  timestamp: string;
  correlationId?: string;
  userId?: string;
}
