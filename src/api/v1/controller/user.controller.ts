import { injectable } from 'tsyringe';
import type { Request, Response, NextFunction } from 'express';
import { UserService } from '../../../domain/services/user.service';
import { DIContainer } from '../../../core/di/container';
import { TOKENS } from '../../../core/di/tokens';
import { CreateUserSchema, UpdateUserSchema } from '../../../domain/entities';
import { ValidationError } from '../../../shared/response';
import { sendError, sendOk, sendCreated } from '../../../shared/utils/response-helper';
import { isSuccessResponse } from '../../../shared/response';

@injectable()
export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = DIContainer.resolve<UserService>(TOKENS.UserService);
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
        const { passwordHash, ...userWithoutPassword } = user;
        sendCreated(req, res, userWithoutPassword);
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
          const { passwordHash, ...userWithoutPassword } = user;
          sendOk(req, res, userWithoutPassword);
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
      const result = await this.userService.findAllUsers(req.context.correlationId);

      if (isSuccessResponse(result)) {
        const users = result.body().data.map(({ passwordHash, ...user }) => user);
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
        const { passwordHash, ...userWithoutPassword } = user;
        sendOk(req, res, userWithoutPassword);
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

      const result = await this.userService.deleteUser(id, req.context.correlationId);

      if (isSuccessResponse(result)) {
        sendOk(req, res, { deleted: result.body().data });
      } else {
        sendError(req, res, result);
      }
    } catch (error) {
      next(error);
    }
  }
}
