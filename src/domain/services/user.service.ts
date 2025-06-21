import { injectable, inject } from 'tsyringe';
import { TOKENS } from '../../core/di/tokens';
import type { IUserRepository } from '../repositories/user.repository.interface';
import type { CreateUserInput, User } from '../entities';
import type { AsyncResult } from '../../shared/response';
import { ConflictError } from '../../shared/response';
import { isSuccessResponse } from '../../shared/response';
import { hashPassword } from '../../shared/utils/crypto';

@injectable()
export class UserService {
  constructor(@inject(TOKENS.UserRepository) private userRepo: IUserRepository) {}

  async createUser(input: CreateUserInput, correlationId?: string): AsyncResult<User> {
    const existingUser = await this.userRepo.findByEmail(input.email, correlationId);

    if (isSuccessResponse(existingUser)) {
      return new ConflictError('Email already exists', correlationId);
    }

    const passwordHash = await hashPassword(input.password);
    return this.userRepo.create(
      {
        ...input,
        passwordHash,
      },
      correlationId,
    );
  }

  async findUserById(id: string, correlationId?: string): AsyncResult<User | null> {
    return this.userRepo.findById(id, correlationId);
  }
}
