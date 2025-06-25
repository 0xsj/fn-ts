import { injectable, inject } from 'tsyringe';
import { TOKENS } from '../../core/di/tokens';
import type { IUserRepository } from '../repositories/user.repository.interface';
import type { CreateUserInput, UpdateUserInput, User } from '../entities';
import type { AsyncResult } from '../../shared/response';
import {
  ConflictError,
  NotFoundError,
  ResponseBuilder,
  InternalServerError,
} from '../../shared/response';
import { isSuccessResponse } from '../../shared/response';
import { hashPassword, verifyPassword } from '../../shared/utils/crypto';
import { Cacheable, CacheInvalidate, CacheUpdate } from '../../infrastructure/cache/decorators';
import { getCacheService } from '../../infrastructure/cache/decorators/cache-helper';

@injectable()
export class UserService {
  constructor(@inject(TOKENS.UserRepository) private userRepo: IUserRepository) {}

  async createUser(input: CreateUserInput, correlationId?: string): AsyncResult<User> {
    const existingUser = await this.userRepo.findByEmail(input.email, correlationId);

    if (isSuccessResponse(existingUser) && existingUser.body().data) {
      return new ConflictError('Email already exists', correlationId);
    }

    const passwordHash = await hashPassword(input.password);

    const result = await this.userRepo.create(
      {
        ...input,
        passwordHash,
      },
      correlationId,
    );

    // Invalidate user list cache when new user is created
    if (isSuccessResponse(result)) {
      await this.invalidateUserCaches();
    }

    return result;
  }

  @Cacheable({ ttl: 3600, tags: ['user'] })
  async findUserById(id: string, correlationId?: string): AsyncResult<User | null> {
    return this.userRepo.findById(id, correlationId);
  }

  @Cacheable({ ttl: 3600, tags: ['user'] })
  async findUserByEmail(email: string, correlationId?: string): AsyncResult<User | null> {
    return this.userRepo.findByEmail(email, correlationId);
  }

  @Cacheable({ ttl: 300, tags: ['users', 'user-list'] })
  async findAllUsers(correlationId?: string): AsyncResult<User[]> {
    return this.userRepo.findAll(correlationId);
  }

  @CacheInvalidate({
    patterns: (id: string) => [`UserService:findUserById:${id}`],
    tags: ['users', 'user-list'],
  })
  @CacheUpdate({
    key: (id: string) => `UserService:findUserById:${id}`,
    ttl: 3600,
  })
  async updateUser(
    id: string,
    updates: UpdateUserInput,
    correlationId?: string,
  ): AsyncResult<User> {
    const existingUser = await this.userRepo.findById(id, correlationId);

    if (!isSuccessResponse(existingUser)) {
      return existingUser;
    }

    const currentUser = existingUser.body().data;
    if (!currentUser) {
      return new NotFoundError('User not found', correlationId);
    }

    if (updates.email && updates.email !== currentUser.email) {
      const emailExists = await this.userRepo.findByEmail(updates.email, correlationId);
      if (isSuccessResponse(emailExists) && emailExists.body().data) {
        return new ConflictError('Email already exists', correlationId);
      }
    }

    const updateData: Partial<Omit<User, 'id' | 'createdAt'>> = {
      firstName: updates.firstName,
      lastName: updates.lastName,
      email: updates.email,
      phone: updates.phone,
    };

    if (updates.password) {
      updateData.passwordHash = await hashPassword(updates.password);
    }

    Object.keys(updateData).forEach((key) => {
      if (updateData[key as keyof typeof updateData] === undefined) {
        delete updateData[key as keyof typeof updateData];
      }
    });

    const result = await this.userRepo.update(id, updateData, correlationId);

    if (!isSuccessResponse(result)) {
      return result;
    }

    const updatedUser = result.body().data;
    if (!updatedUser) {
      return new InternalServerError(correlationId, {
        message: 'Update succeeded but user not found',
      });
    }

    return ResponseBuilder.ok(updatedUser, correlationId);
  }

  @CacheInvalidate({
    patterns: (id: string) => [`UserService:findUserById:${id}`],
    tags: ['users', 'user-list'],
  })
  async deleteUser(id: string, correlationId?: string): AsyncResult<boolean> {
    const existingUser = await this.userRepo.findById(id, correlationId);

    if (!isSuccessResponse(existingUser) || !existingUser.body().data) {
      return new NotFoundError('User not found', correlationId);
    }

    return this.userRepo.delete(id, correlationId);
  }

  async verifyPassword(email: string, password: string, correlationId?: string): AsyncResult<User> {
    const userResult = await this.userRepo.findByEmail(email, correlationId);

    if (!isSuccessResponse(userResult)) {
      return userResult;
    }

    const user = userResult.body().data;
    if (!user) {
      return new NotFoundError('Invalid credentials', correlationId);
    }

    const isValid = await verifyPassword(password, user.passwordHash);

    if (!isValid) {
      return new NotFoundError('Invalid credentials', correlationId);
    }

    return ResponseBuilder.ok(user, correlationId);
  }

  private async invalidateUserCaches(): Promise<void> {
    const cacheService = getCacheService();
    await cacheService.invalidateByTags(['users', 'user-list']);
  }
}
