import { Request, Response, NextFunction } from 'express';
import { DIContainer } from '../../../core/di/container';
import { PermissionService, PermissionCheck } from '../permissions/permission.service';
import { ForbiddenError, UnauthorizedError } from '../../../shared/response';

/**
 * require specific permission to access endpoint
 */

export function RequirePermission() {}
