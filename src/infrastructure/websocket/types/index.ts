// src/infrastructure/websocket/types/index.ts

/**
 * WebSocket Types - Central Export
 */

// Event type definitions
export * from './socket-events.types';

// Authentication types
export * from './socket-auth.types';

// Data schemas and validation
export * from './socket-data.types';

// Re-export commonly used types with clear names
export type {
  SocketEvents,
  EventName,
  EventCategory,
  SocketEventHandler,
} from './socket-events.types';

export type {
  SocketAuthData,
  SocketContext,
  SocketSession,
  AuthState,
  TokenValidationResult,
} from './socket-auth.types';

export type {
  SocketEventMeta,
  SocketError,
  ValidatedEventName,
  EventSchemaMap,
} from './socket-data.types';
