import { Kysely } from 'kysely';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { Database } from '../types';
import { User, UserDB } from '../../../domain/entities';
import { AsyncResult, DatabaseError, ResponseBuilder } from '../../../shared/response';

export class UserRepository implements IUserRepository {
  constructor(private db: Kysely<Database>) {}

  async findById(id: string, correlationid?: string): AsyncResult<User | null> {
    try {
      const row = await this.db
        .selectFrom('user')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();
      return ResponseBuilder.ok(row ? this.mapToEntity(row) : null, correlationid);
    } catch (error) {
      return new DatabaseError('findById', error, correlationid);
    }
  }

  private mapToEntity(row: UserDB): User {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
