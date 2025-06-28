// src/api/v1/controllers/user.controller.ts
import { injectable } from 'tsyringe';
import type { Request, Response, NextFunction } from 'express';
import { UserService } from '../../../domain/services/user.service';
import { DIContainer } from '../../../core/di/container';
import { TOKENS } from '../../../core/di/tokens';
import { CreateUserSchema, UpdateUserSchema, User, UserPublic } from '../../../domain/entities';
import { ValidationError } from '../../../shared/response';
import { sendError, sendOk, sendCreated } from '../../../shared/utils/response-helper';
import { isSuccessResponse } from '../../../shared/response';

@injectable()
export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = DIContainer.resolve<UserService>(TOKENS.UserService);
  }

  /**
   * Convert a User entity to UserPublic by excluding sensitive fields
   */
  private toPublicUser(user: User): UserPublic {
    // Destructure to exclude sensitive fields
    const {
      // Exclude these fields
      cachedPermissions,
      permissionsUpdatedAt,
      totalLoginCount,
      deactivatedReason,
      deletedAt,
      deletedBy,
      // Include everything else
      ...publicFields
    } = user;

    return publicFields as UserPublic;
  }

  async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validation = CreateUserSchema.safeParse(req.body);

      if (!validation.success) {
        const error = ValidationError.fromZodError(validation.error, req.context.correlationId);
        return sendError(req, res, error);
      }

      const result = await this.userService.createUser(validation.data, req.context.correlationId);

      if (isSuccessResponse(result)) {
        const user = result.body().data;
        const publicUser = this.toPublicUser(user);
        sendCreated(req, res, publicUser);
      } else {
        sendError(req, res, result);
      }
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.userService.findUserById(id, req.context.correlationId);

      if (isSuccessResponse(result)) {
        const user = result.body().data;
        if (user) {
          const publicUser = this.toPublicUser(user);
          sendOk(req, res, publicUser);
        } else {
          sendOk(req, res, null);
        }
      } else {
        sendError(req, res, result);
      }
    } catch (error) {
      next(error);
    }
  }

  async getUserByUsername(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username } = req.params;
      const result = await this.userService.findUserByUsername(username, req.context.correlationId);

      if (isSuccessResponse(result)) {
        const user = result.body().data;
        if (user) {
          const publicUser = this.toPublicUser(user);
          sendOk(req, res, publicUser);
        } else {
          sendOk(req, res, null);
        }
      } else {
        sendError(req, res, result);
      }
    } catch (error) {
      next(error);
    }
  }

  async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // TODO: Add pagination params from query
      const result = await this.userService.findAllUsers(req.context.correlationId);

      if (isSuccessResponse(result)) {
        const users = result.body().data.map((user) => this.toPublicUser(user));
        sendOk(req, res, users);
      } else {
        sendError(req, res, result);
      }
    } catch (error) {
      next(error);
    }
  }

  async getUsersByOrganization(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { organizationId } = req.params;
      const result = await this.userService.findUsersByOrganization(
        organizationId,
        req.context.correlationId,
      );

      if (isSuccessResponse(result)) {
        const users = result.body().data.map((user) => this.toPublicUser(user));
        sendOk(req, res, users);
      } else {
        sendError(req, res, result);
      }
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const validation = UpdateUserSchema.safeParse(req.body);

      if (!validation.success) {
        const error = ValidationError.fromZodError(validation.error, req.context.correlationId);
        return sendError(req, res, error);
      }

      const result = await this.userService.updateUser(
        id,
        validation.data,
        req.context.correlationId,
      );

      if (isSuccessResponse(result)) {
        const user = result.body().data;
        const publicUser = this.toPublicUser(user);
        sendOk(req, res, publicUser);
      } else {
        sendError(req, res, result);
      }
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { hard } = req.query;

      // Use hard delete if explicitly requested, otherwise soft delete
      const result =
        hard === 'true'
          ? await this.userService.hardDeleteUser(id, req.context.correlationId)
          : await this.userService.deleteUser(id, req.context.correlationId);

      if (isSuccessResponse(result)) {
        sendOk(req, res, {
          deleted: result.body().data,
          type: hard === 'true' ? 'hard' : 'soft',
        });
      } else {
        sendError(req, res, result);
      }
    } catch (error) {
      next(error);
    }
  }

  // TODO: Add these controller methods later
  // async changePassword(req: Request, res: Response, next: NextFunction): Promise<void>
  // async updatePreferences(req: Request, res: Response, next: NextFunction): Promise<void>
  // async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void>
  // async searchUsers(req: Request, res: Response, next: NextFunction): Promise<void>
  // async adminUpdateUser(req: Request, res: Response, next: NextFunction): Promise<void>
}
