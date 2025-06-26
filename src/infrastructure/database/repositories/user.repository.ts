// src/infrastructure/database/repositories/user.repository.ts
import { Kysely } from 'kysely';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '../types';
import { CreateUserInput, User, UserDB, UserSchema, UserDBSchema } from '../../../domain/entities';
import { AsyncResult, DatabaseError, ok, ResponseBuilder } from '../../../shared/response';
import { mapper } from '../../../shared/utils/mapper';
import { NamingConvention, MappingConfig } from '../../../shared/types/mapper.types';

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
      const now = new Date();

      // Create UserDB object with all required fields and defaults
      const userDB: UserDB = {
        // Base fields
        id: uuidv4(),
        created_at: now,
        updated_at: now,

        // Soft delete fields (from SoftDeletableDBSchema)
        deleted_at: null,
        deleted_by: null,

        // Basic info
        first_name: input.firstName,
        last_name: input.lastName,
        display_name: input.displayName ?? null,
        username: input.username ?? null,

        // Contact
        email: input.email,
        email_verified: input.autoActivate ?? false,
        email_verified_at: input.autoActivate ? now : null,
        phone: input.phone ?? null,
        phone_verified: false,
        phone_verified_at: null,

        // Status
        status: input.autoActivate ? 'active' : 'pending_verification',
        type: input.type ?? 'internal',

        // Organization
        organization_id: input.organizationId ?? null,

        // Profile
        avatar_url: null,
        title: input.title ?? null,
        department: input.department ?? null,
        employee_id: input.employeeId ?? null,

        // Location
        timezone: 'UTC',
        locale: 'en',
        location_id: null,

        // Emergency contact
        emergency_contact: null,

        // Preferences (with defaults)
        preferences: {
          theme: 'system',
          language: 'en',
          date_format: 'YYYY-MM-DD',
          time_format: '24h',
          profile_visibility: 'organization',
          show_online_status: true,
        },

        // Permissions
        cached_permissions: [],
        permissions_updated_at: null,

        // Activity
        last_activity_at: null,
        total_login_count: 0,

        // Metadata
        custom_fields: {},
        tags: [],

        // Deactivation
        deactivated_reason: null,
      };

      await this.db.insertInto('users').values(userDB).execute();

      // Store password in separate table (user_passwords)
      await this.createUserPassword(userDB.id, input.passwordHash);

      return ResponseBuilder.ok(this.mapToEntity(userDB), correlationId);
    } catch (error) {
      return new DatabaseError('create', error, correlationId);
    }
  }

  async findById(id: string, correlationId?: string): AsyncResult<User | null> {
    try {
      const row = await this.db
        .selectFrom('users')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();

      return ResponseBuilder.ok(row ? this.mapToEntity(row) : null, correlationId);
    } catch (error) {
      return new DatabaseError('findById', error, correlationId);
    }
  }

  async findAll(correlationId?: string): AsyncResult<User[]> {
    try {
      const rows = await this.db.selectFrom('users').selectAll().execute();
      return ResponseBuilder.ok(
        rows.map((row) => this.mapToEntity(row)),
        correlationId,
      );
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
      const dbUpdates: Partial<UserDB> = {
        updated_at: new Date(),
      };

      // Map simple fields
      if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName;
      if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName;
      if (updates.displayName !== undefined) dbUpdates.display_name = updates.displayName;
      if (updates.username !== undefined) dbUpdates.username = updates.username;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.type !== undefined) dbUpdates.type = updates.type;
      if (updates.organizationId !== undefined) dbUpdates.organization_id = updates.organizationId;
      if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.department !== undefined) dbUpdates.department = updates.department;
      if (updates.employeeId !== undefined) dbUpdates.employee_id = updates.employeeId;
      if (updates.timezone !== undefined) dbUpdates.timezone = updates.timezone;
      if (updates.locale !== undefined) dbUpdates.locale = updates.locale;
      if (updates.locationId !== undefined) dbUpdates.location_id = updates.locationId;

      // Map complex fields
      if (updates.emergencyContact !== undefined) {
        dbUpdates.emergency_contact = updates.emergencyContact
          ? {
              name: updates.emergencyContact.name,
              relationship: updates.emergencyContact.relationship,
              phone: updates.emergencyContact.phone,
              email: updates.emergencyContact.email,
            }
          : null;
      }

      if (updates.preferences !== undefined) {
        dbUpdates.preferences = {
          theme: updates.preferences.theme ?? 'system',
          language: updates.preferences.language ?? 'en',
          date_format: updates.preferences.dateFormat ?? 'YYYY-MM-DD',
          time_format: updates.preferences.timeFormat ?? '24h',
          profile_visibility: updates.preferences.profileVisibility ?? 'organization',
          show_online_status: updates.preferences.showOnlineStatus ?? true,
        };
      }

      if (updates.customFields !== undefined) dbUpdates.custom_fields = updates.customFields;
      if (updates.tags !== undefined) dbUpdates.tags = updates.tags;

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

  /**
   * Create user password in separate table
   */
  private async createUserPassword(userId: string, passwordHash: string): Promise<void> {
    await this.db
      .insertInto('user_passwords')
      .values({
        id: uuidv4(),
        user_id: userId,
        password_hash: passwordHash,
        created_at: new Date(),
        expires_at: null,
        must_change: false,
      })
      .execute();
  }

  /**
   * Map database row to entity
   * Using mapper with type assertions to avoid TS issues
   */
  private mapToEntity(row: UserDB): User {
    const config: MappingConfig<any, any> = {
      sourceNaming: NamingConvention.SNAKE_CASE,
      targetNaming: NamingConvention.CAMEL_CASE,
      beforeMap: (source: any) => ({
        ...source,
        // Ensure required fields have values
        status: source.status || 'pending_verification',
        type: source.type || 'internal',
        email_verified: source.email_verified ?? false,
        phone_verified: source.phone_verified ?? false,
        timezone: source.timezone || 'UTC',
        locale: source.locale || 'en',
        preferences: source.preferences || {
          theme: 'system',
          language: 'en',
          date_format: 'YYYY-MM-DD',
          time_format: '24h',
          profile_visibility: 'organization',
          show_online_status: true,
        },
        cached_permissions: source.cached_permissions || [],
        total_login_count: source.total_login_count || 0,
        custom_fields: source.custom_fields || {},
        tags: source.tags || [],
      }),
    };

    return mapper.map(row as any, UserDBSchema as any, UserSchema as any, config);
  }
}
