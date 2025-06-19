import { AsyncResult } from '../../shared/response';
import { CreateUserInput, User } from '../entities';

export interface IUserRepository {
  findById(id: string, correlationid?: string): AsyncResult<User | null>;
  // findByEmail(email: string, correlationId?: string): AsyncResult<User | null>;
  // create(input: CreateUserInput, correlationId?:string ): AsyncResult<User>;
}
