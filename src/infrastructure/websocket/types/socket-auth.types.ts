// src/infrastructure/websocket/types/socket-auth.types.ts

/**
 * WebSocket Authentication Types
 * Types for socket authentication and authorization
 */

// ============================================
// Socket Authentication Data
// ============================================
export interface SocketAuthData {
  userId: string;
  email: string;
  role: string;
  organizationId?: string;
  permissions: string[];
  sessionId: string;
  issuedAt: number;
  expiresAt: number;
}

// ============================================
// Socket Authentication Request
// ============================================
export interface SocketAuthRequest {
  token: string;
  correlationId?: string;
}

// ============================================
// Socket Authentication Response
// ============================================
export interface SocketAuthSuccess {
  user: {
    id: string;
    email: string;
    role: string;
    organizationId?: string;
  };
  sessionId: string;
  expiresAt: number;
}

export interface SocketAuthError {
  message: string;
  code: 'INVALID_TOKEN' | 'EXPIRED_TOKEN' | 'UNAUTHORIZED' | 'FORBIDDEN';
  correlationId?: string;
}

// ============================================
// Socket Connection Context
// ============================================
export interface SocketContext {
  socketId: string;
  userId?: string;
  sessionId?: string;
  organizationId?: string;
  role?: string;
  permissions: string[];
  connectedAt: Date;
  lastActivity: Date;
  ipAddress?: string;
  userAgent?: string;
}

// ============================================
// Socket Authorization
// ============================================
export interface SocketPermissionCheck {
  resource: string;
  action: string;
  scope?: 'own' | 'team' | 'organization' | 'global';
}

export interface SocketRoomAccess {
  roomName: string;
  userId: string;
  requiredPermissions?: SocketPermissionCheck[];
  customCheck?: (context: SocketContext) => boolean;
}

// ============================================
// Socket Session Management
// ============================================
export interface SocketSession {
  sessionId: string;
  userId: string;
  socketId: string;
  organizationId?: string;
  connectedAt: Date;
  lastActivity: Date;
  metadata: Record<string, unknown>;
}

// ============================================
// Token Validation Result
// ============================================
export interface TokenValidationResult {
  valid: boolean;
  authData?: SocketAuthData;
  error?: {
    code: string;
    message: string;
  };
}

// ============================================
// Authentication State
// ============================================
export type AuthState = 'pending' | 'authenticated' | 'unauthenticated' | 'expired';

export interface SocketAuthState {
  state: AuthState;
  authData?: SocketAuthData;
  connectedAt: Date;
  authenticatedAt?: Date;
  lastActivity: Date;
}
