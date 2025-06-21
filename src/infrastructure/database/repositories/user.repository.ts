import { Kysely } from 'kysely';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { Database } from '../types';
import { CreateUserInput, User, UserDB, UserSchema } from '../../../domain/entities';
import { AsyncResult, DatabaseError, ResponseBuilder } from '../../../shared/response';

export class UserRepository implements IUserRepository {
  constructor(private db: Kysely<Database>) {}
  findByEmail(email: string, correlationId?: string): AsyncResult<User | null> {
    throw new Error('Method not implemented.');
  }
  create(input: CreateUserInput & { passwordHash: string; }, correlationId?: string): AsyncResult<User> {
    throw new Error('Method not implemented.');
  }

  async findById(id: string, correlationid?: string): AsyncResult<User | null> {
    try {
      const row = await this.db
        .selectFrom('users')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();
      return ResponseBuilder.ok(row ? this.mapToEntity(row) : null, correlationid);
    } catch (error) {
      return new DatabaseError('findById', error, correlationid);
    }
  }

  private mapToEntity(row: UserDB): User {
    const user = {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone,
      passwordHash: row.password_hash,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
    return UserSchema.parse(user);
  }
}
