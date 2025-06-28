// src/domain/repositories/access-control.repository.interface.ts
import { AsyncResult } from '../../shared/response';
import {
  Permission,
  Role,
  RolePermission,
  UserRole,
  CreateRoleInput,
  UpdateRoleInput,
  CreatePermissionInput,
  PermissionCheck,
  PermissionGrant,
  AssignRoleInput,
} from '../entities';

export interface IAccessControl {
  // ============================================
  // PERMISSIONS
  // ============================================
  createPermission(input: CreatePermissionInput): AsyncResult<Permission>;
  findPermissionById(id: string): AsyncResult<Permission | null>;
  findPermissionByResourceAction(resource: string, action: string): AsyncResult<Permission | null>;
  findAllPermissions(): AsyncResult<Permission[]>;
  updatePermission(
    id: string,
    updates: Partial<CreatePermissionInput>,
  ): AsyncResult<Permission | null>;
  deletePermission(id: string): AsyncResult<boolean>;

  // ============================================
  // ROLES
  // ============================================
  createRole(input: CreateRoleInput): AsyncResult<Role>;
  findRoleById(id: string): AsyncResult<Role | null>;
  findRoleBySlug(slug: string): AsyncResult<Role | null>;
  findAllRoles(includeInactive?: boolean): AsyncResult<Role[]>;
  findSystemRoles(): AsyncResult<Role[]>;
  updateRole(id: string, updates: UpdateRoleInput): AsyncResult<Role | null>;
  deleteRole(id: string): AsyncResult<boolean>;

  // ============================================
  // ROLE-PERMISSION RELATIONSHIPS
  // ============================================
  assignPermissionToRole(
    roleId: string,
    permissionId: string,
    grantedBy?: string,
  ): AsyncResult<boolean>;
  removePermissionFromRole(roleId: string, permissionId: string): AsyncResult<boolean>;
  findRolePermissions(roleId: string): AsyncResult<Permission[]>;
  findRolesWithPermission(permissionId: string): AsyncResult<Role[]>;
  syncRolePermissions(
    roleId: string,
    permissionIds: string[],
    grantedBy?: string,
  ): AsyncResult<boolean>;

  // ============================================
  // USER-ROLE RELATIONSHIPS
  // ============================================
  assignRoleToUser(input: AssignRoleInput): AsyncResult<boolean>;
  removeRoleFromUser(userId: string, roleId: string): AsyncResult<boolean>;
  findUserRoles(userId: string, includeExpired?: boolean): AsyncResult<UserRole[]>;
  findUsersWithRole(roleId: string): AsyncResult<UserRole[]>;
  syncUserRoles(userId: string, roleIds: string[], assignedBy?: string): AsyncResult<boolean>;
  removeExpiredUserRoles(): AsyncResult<number>; // returns count of removed

  // ============================================
  // PERMISSION CHECKING
  // ============================================
  checkPermission(check: PermissionCheck): AsyncResult<PermissionGrant>;
  getUserPermissions(userId: string): AsyncResult<Permission[]>;
  getUserEffectivePermissions(userId: string): AsyncResult<{
    direct: Permission[];
    fromRoles: { role: Role; permissions: Permission[] }[];
    all: Permission[];
  }>;
  hasPermission(
    userId: string,
    resource: string,
    action: string,
    scope?: string,
  ): AsyncResult<boolean>;
  hasAnyPermission(
    userId: string,
    permissions: Array<{ resource: string; action: string }>,
  ): AsyncResult<boolean>;
  hasAllPermissions(
    userId: string,
    permissions: Array<{ resource: string; action: string }>,
  ): AsyncResult<boolean>;

  // ============================================
  // ROLE HIERARCHY
  // ============================================
  getRoleHierarchy(): AsyncResult<Role[]>; // ordered by priority
  canRoleGrantRole(grantingRoleId: string, targetRoleId: string): AsyncResult<boolean>;
  getInheritedRoles(roleId: string): AsyncResult<Role[]>;

  // ============================================
  // BULK OPERATIONS
  // ============================================
  createDefaultRolesAndPermissions(): AsyncResult<{
    roles: Role[];
    permissions: Permission[];
  }>;
  findUsersByPermission(
    resource: string,
    action: string,
  ): AsyncResult<
    Array<{
      userId: string;
      roles: Role[];
    }>
  >;

  // ============================================
  // ORGANIZATION-SCOPED (if needed)
  // ============================================
  findOrganizationRoles(organizationId: string): AsyncResult<Role[]>;
  createOrganizationRole(organizationId: string, input: CreateRoleInput): AsyncResult<Role>;
  checkOrganizationPermission(
    userId: string,
    organizationId: string,
    resource: string,
    action: string,
  ): AsyncResult<PermissionGrant>;
}
