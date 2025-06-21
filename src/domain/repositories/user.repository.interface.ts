import { AsyncResult } from '../../shared/response';
import { CreateUserInput, User } from '../entities';

export interface IUserRepository {
  findById(id: string, correlationid?: string): AsyncResult<User | null>;
  findByEmail(email: string, correlationId?: string): AsyncResult<User | null>;
  findAll(correlationId?: string): AsyncResult<User[]>;
  create(
    input: CreateUserInput & { passwordHash: string },
    correlationId?: string,
  ): AsyncResult<User>;
  update(
    id: string,
    updates: Partial<Omit<User, 'id' | 'createdAt'>>,
    correlationId?: string,
  ): AsyncResult<User | null>;
  delete(id: string, correlationid?: string): AsyncResult<boolean>;
}
