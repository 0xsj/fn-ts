// src/domain/entities/schemas/access-control.schema.ts
import { z } from 'zod';
import { BaseEntitySchema, BaseEntityDBSchema } from './entity.schema';

// ============================================
// Permission Schema
// ============================================
export const PermissionDBSchema = BaseEntityDBSchema.extend({
  resource: z.string(), // "user", "incident", "notification"
  action: z.string(),   // "create", "read", "update", "delete", "list"
  scope: z.enum(['own', 'team', 'organization', 'global']).nullable().optional(),
  description: z.string().nullable().optional(),
});

export const PermissionSchema = BaseEntitySchema.extend({
  resource: z.string(),
  action: z.string(),
  scope: z.enum(['own', 'team', 'organization', 'global']).nullable().optional(),
  description: z.string().nullable().optional(),
});

// ============================================
// Role Schema
// ============================================
export const RoleDBSchema = BaseEntityDBSchema.extend({
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable().optional(),
  is_system: z.boolean().default(false), // Prevents deletion of system roles
  is_active: z.boolean().default(true),
  priority: z.number().int().default(0), // For role hierarchy
});

export const RoleSchema = BaseEntitySchema.extend({
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable().optional(),
  isSystem: z.boolean().default(false),
  isActive: z.boolean().default(true),
  priority: z.number().int().default(0),
});

// ============================================
// Role-Permission Junction
// ============================================
export const RolePermissionDBSchema = z.object({
  role_id: z.string().uuid(),
  permission_id: z.string().uuid(),
  granted_at: z.date(),
  granted_by: z.string().uuid().nullable().optional(),
});

export const RolePermissionSchema = z.object({
  roleId: z.string().uuid(),
  permissionId: z.string().uuid(),
  grantedAt: z.date(),
  grantedBy: z.string().uuid().nullable().optional(),
});

// ============================================
// User-Role Junction
// ============================================
export const UserRoleDBSchema = z.object({
  user_id: z.string().uuid(),
  role_id: z.string().uuid(),
  assigned_at: z.date(),
  assigned_by: z.string().uuid().nullable().optional(),
  expires_at: z.date().nullable().optional(), // For temporary roles
});

export const UserRoleSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
  assignedAt: z.date(),
  assignedBy: z.string().uuid().nullable().optional(),
  expiresAt: z.date().nullable().optional(),
});

// ============================================
// Permission Check Request/Response
// ============================================
export const PermissionCheckSchema = z.object({
  userId: z.string().uuid(),
  resource: z.string(),
  action: z.string(),
  scope: z.enum(['own', 'team', 'organization', 'global']).optional(),
  resourceId: z.string().uuid().optional(), // For "own" scope checks
});

export const PermissionGrantSchema = z.object({
  allowed: z.boolean(),
  reason: z.string().optional(),
  roleMatched: z.string().optional(), // Which role granted the permission
});

// ============================================
// Input Schemas (for API)
// ============================================
export const CreateRoleSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  permissions: z.array(z.string().uuid()).optional(), // Permission IDs
});

export const UpdateRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const AssignRoleSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
  expiresAt: z.date().optional(),
});

export const CreatePermissionSchema = z.object({
  resource: z.string().min(1).max(50),
  action: z.string().min(1).max(50),
  scope: z.enum(['own', 'team', 'organization', 'global']).optional(),
  description: z.string().max(500).optional(),
});

// ============================================
// Common Permission Sets (for reference)
// ============================================
export const CommonPermissions = {
  // User permissions
  USER_CREATE: { resource: 'user', action: 'create' },
  USER_READ: { resource: 'user', action: 'read' },
  USER_UPDATE: { resource: 'user', action: 'update' },
  USER_DELETE: { resource: 'user', action: 'delete' },
  USER_LIST: { resource: 'user', action: 'list' },
  
  // Incident permissions
  INCIDENT_CREATE: { resource: 'incident', action: 'create' },
  INCIDENT_READ: { resource: 'incident', action: 'read' },
  INCIDENT_UPDATE: { resource: 'incident', action: 'update' },
  INCIDENT_DELETE: { resource: 'incident', action: 'delete' },
  INCIDENT_ASSIGN: { resource: 'incident', action: 'assign' },
  
  // Notification permissions
  NOTIFICATION_SEND: { resource: 'notification', action: 'send' },
  NOTIFICATION_READ: { resource: 'notification', action: 'read' },
  NOTIFICATION_MANAGE: { resource: 'notification', action: 'manage' },
  
  // System permissions
  SYSTEM_ADMIN: { resource: 'system', action: 'admin' },
  ROLE_MANAGE: { resource: 'role', action: 'manage' },
  PERMISSION_MANAGE: { resource: 'permission', action: 'manage' },
} as const;

// ============================================
// Common Roles (for reference)
// ============================================
export const SystemRoles = {
  SUPER_ADMIN: 'super-admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  RESPONDER: 'responder',
  VIEWER: 'viewer',
  GUEST: 'guest',
} as const;

// ============================================
// Type Exports
// ============================================
export type Permission = z.infer<typeof PermissionSchema>;
export type PermissionDB = z.infer<typeof PermissionDBSchema>;
export type Role = z.infer<typeof RoleSchema>;
export type RoleDB = z.infer<typeof RoleDBSchema>;
export type RolePermission = z.infer<typeof RolePermissionSchema>;
export type RolePermissionDB = z.infer<typeof RolePermissionDBSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export type UserRoleDB = z.infer<typeof UserRoleDBSchema>;
export type PermissionCheck = z.infer<typeof PermissionCheckSchema>;
export type PermissionGrant = z.infer<typeof PermissionGrantSchema>;
export type CreateRoleInput = z.infer<typeof CreateRoleSchema>;
export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>;
export type AssignRoleInput = z.infer<typeof AssignRoleSchema>;
export type CreatePermissionInput = z.infer<typeof CreatePermissionSchema>;