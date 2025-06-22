import { Kysely } from 'kysely';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '../types';
import { CreateUserInput, User, UserDB, UserSchema } from '../../../domain/entities';
import { AsyncResult, DatabaseError, ok, ResponseBuilder } from '../../../shared/response';

export class UserRepository implements IUserRepository {
  constructor(private db: Kysely<Database>) {}

  async findByEmail(email: string, correlationId?: string): AsyncResult<User | null> {
    try {
      const row = await this.db
        .selectFrom('users')
        .selectAll()
        .where('email', '=', email)
        .executeTakeFirst();
      return ResponseBuilder.ok(row ? this.mapToEntity(row) : null, correlationId);
    } catch (error) {
      return new DatabaseError('findByEmail', error, correlationId);
    }
  }

  async create(
    input: CreateUserInput & { passwordHash: string },
    correlationId?: string,
  ): AsyncResult<User> {
    try {
      const user: UserDB = {
        id: uuidv4(),
        first_name: input.firstName,
        last_name: input.lastName,
        email: input.email,
        phone: input.phone,
        password_hash: input.passwordHash,
        created_at: new Date(),
        updated_at: new Date(),
      };

      await this.db.insertInto('users').values(user).execute();
      return ResponseBuilder.ok(this.mapToEntity(user), correlationId);
    } catch (error) {
      return new DatabaseError('create', error, correlationId);
    }
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

  async findAll(correlationId?: string): AsyncResult<User[]> {
    try {
      const rows = await this.db.selectFrom('users').selectAll().execute();
      return ResponseBuilder.ok(rows.map(this.mapToEntity), correlationId);
    } catch (error) {
      return new DatabaseError('findAll', error, correlationId);
    }
  }

  async update(
    id: string,
    updates: Partial<Omit<User, 'id' | 'createdAt'>>,
    correlationId?: string,
  ): AsyncResult<User | null> {
    try {
      const dbUpdates: Partial<UserDB> = {};
      if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName;
      if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.passwordHash !== undefined) dbUpdates.password_hash = updates.passwordHash;

      dbUpdates.updated_at = new Date();

      await this.db.updateTable('users').set(dbUpdates).where('id', '=', id).execute();

      return this.findById(id, correlationId);
    } catch (error) {
      return new DatabaseError('update', error, correlationId);
    }
  }

  async delete(id: string, correlationId?: string): AsyncResult<boolean> {
    try {
      const result = await this.db.deleteFrom('users').where('id', '=', id).execute();
      return ok(result.length > 0, correlationId);
    } catch (error) {
      return new DatabaseError('delete', error, correlationId);
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
