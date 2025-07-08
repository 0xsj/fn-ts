import { Request, Response, NextFunction } from 'express';
import { PermissionService } from '../permissions/permission.service';
import { ForbiddenError } from '../../../shared/response';
import { Permission } from '../../../domain/entities';

export interface PermissionGuardOptions {}

export function permissionGuard(options: PermissionGuardOptions) {}

export function roleGuard(...roles: string[]) {}
