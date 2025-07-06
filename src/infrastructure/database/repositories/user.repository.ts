// src/infrastructure/database/repositories/user.repository.ts
import { Kysely } from 'kysely';
import type { IUser } from '../../../domain/interface/user.interface';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '../types';
import {
  CreateUserInput,
  User,
  UserDB,
  UserSchema,
  UserDBSchema,
  UserPasswordDB,
  UserStatus,
} from '../../../domain/entities';
import { AsyncResult, DatabaseError, ok, ResponseBuilder } from '../../../shared/response';
import { mapper } from '../../../shared/utils/mapper';
import { NamingConvention, MappingConfig } from '../../../shared/types/mapper.types';
import { logger } from '../../../shared/utils';

export class UserRepository implements IUser {
  constructor(private db: Kysely<Database>) {}
  async findByUsername(username: string, correlationId?: string): AsyncResult<User | null> {
    try {
      const row = await this.db
        .selectFrom('users')
        .selectAll()
        .where('username', '=', username)
        .executeTakeFirst();

      return ResponseBuilder.ok(row ? this.mapToEntity(row) : null, correlationId);
    } catch (error) {
      return new DatabaseError('findByUsername', error, correlationId);
    }
  }
  async getUserPassword(
    userId: string,
    correlationId?: string,
  ): AsyncResult<UserPasswordDB | null> {
    try {
      const row = await this.db
        .selectFrom('user_passwords')
        .selectAll()
        .where('user_id', '=', userId)
        .orderBy('created_at', 'desc')
        .executeTakeFirst();

      return ResponseBuilder.ok(row || null, correlationId);
    } catch (error) {
      return new DatabaseError('getUserPassword', error, correlationId);
    }
  }

  async updateUserPassword(
    userId: string,
    passwordHash: string,
    mustChange?: boolean,
    correlationId?: string,
  ): AsyncResult<boolean> {
    try {
      // Deactivate old passwords (if you want to keep history)
      await this.db
        .updateTable('user_passwords')
        .set({ expires_at: new Date() })
        .where('user_id', '=', userId)
        .where('expires_at', 'is', null)
        .execute();

      // Insert new password
      await this.db
        .insertInto('user_passwords')
        .values({
          id: uuidv4(),
          user_id: userId,
          password_hash: passwordHash,
          created_at: new Date(),
          expires_at: null,
          must_change: mustChange ?? false,
        })
        .execute();

      return ResponseBuilder.ok(true, correlationId);
    } catch (error) {
      return new DatabaseError('updateUserPassword', error, correlationId);
    }
  }

  async updateLastActivity(userId: string, correlationId?: string): AsyncResult<boolean> {
    try {
      const result = await this.db
        .updateTable('users')
        .set({
          last_activity_at: new Date(),
          updated_at: new Date(),
        })
        .where('id', '=', userId)
        .execute();

      return ResponseBuilder.ok(result.length > 0, correlationId);
    } catch (error) {
      return new DatabaseError('updateLastActivity', error, correlationId);
    }
  }

  async incrementLoginCount(userId: string, correlationId?: string): AsyncResult<boolean> {
    try {
      const result = await this.db
        .updateTable('users')
        .set((eb) => ({
          total_login_count: eb('total_login_count', '+', 1),
          last_activity_at: new Date(),
          updated_at: new Date(),
        }))
        .where('id', '=', userId)
        .execute();

      return ResponseBuilder.ok(result.length > 0, correlationId);
    } catch (error) {
      return new DatabaseError('incrementLoginCount', error, correlationId);
    }
  }

  async findByIds(ids: string[], correlationId?: string): AsyncResult<User[]> {
    try {
      if (ids.length === 0) {
        return ResponseBuilder.ok([], correlationId);
      }

      const rows = await this.db.selectFrom('users').selectAll().where('id', 'in', ids).execute();

      return ResponseBuilder.ok(
        rows.map((row) => this.mapToEntity(row)),
        correlationId,
      );
    } catch (error) {
      return new DatabaseError('findByIds', error, correlationId);
    }
  }
  async findByOrganization(organizationId: string, correlationId?: string): AsyncResult<User[]> {
    try {
      const rows = await this.db
        .selectFrom('users')
        .selectAll()
        .where('organization_id', '=', organizationId)
        .execute();

      return ResponseBuilder.ok(
        rows.map((row) => this.mapToEntity(row)),
        correlationId,
      );
    } catch (error) {
      return new DatabaseError('findByOrganization', error, correlationId);
    }
  }

  async updateStatus(
    userId: string,
    status: UserStatus,
    correlationId?: string,
  ): AsyncResult<boolean> {
    try {
      const result = await this.db
        .updateTable('users')
        .set({
          status,
          updated_at: new Date(),
        })
        .where('id', '=', userId)
        .execute();

      return ResponseBuilder.ok(result.length > 0, correlationId);
    } catch (error) {
      return new DatabaseError('updateStatus', error, correlationId);
    }
  }

  async markEmailVerified(
    userId: string,
    verifiedAt?: Date,
    correlationId?: string,
  ): AsyncResult<boolean> {
    try {
      const result = await this.db
        .updateTable('users')
        .set({
          email_verified: true,
          email_verified_at: verifiedAt || new Date(),
          updated_at: new Date(),
        })
        .where('id', '=', userId)
        .execute();

      return ResponseBuilder.ok(result.length > 0, correlationId);
    } catch (error) {
      return new DatabaseError('markEmailVerified', error, correlationId);
    }
  }

  async markPhoneVerified(
    userId: string,
    verifiedAt?: Date,
    correlationId?: string,
  ): AsyncResult<boolean> {
    try {
      const result = await this.db
        .updateTable('users')
        .set({
          phone_verified: true,
          phone_verified_at: verifiedAt || new Date(),
          updated_at: new Date(),
        })
        .where('id', '=', userId)
        .execute();

      return ResponseBuilder.ok(result.length > 0, correlationId);
    } catch (error) {
      return new DatabaseError('markPhoneVerified', error, correlationId);
    }
  }

  async existsByEmail(
    email: string,
    excludeId?: string,
    correlationId?: string,
  ): AsyncResult<boolean> {
    try {
      let query = this.db.selectFrom('users').select('id').where('email', '=', email);

      if (excludeId) {
        query = query.where('id', '!=', excludeId);
      }

      const result = await query.executeTakeFirst();

      return ResponseBuilder.ok(!!result, correlationId);
    } catch (error) {
      return new DatabaseError('existsByEmail', error, correlationId);
    }
  }

  async existsByUsername(
    username: string,
    excludeId?: string,
    correlationId?: string,
  ): AsyncResult<boolean> {
    try {
      let query = this.db.selectFrom('users').select('id').where('username', '=', username);

      if (excludeId) {
        query = query.where('id', '!=', excludeId);
      }

      const result = await query.executeTakeFirst();

      return ResponseBuilder.ok(!!result, correlationId);
    } catch (error) {
      return new DatabaseError('existsByUsername', error, correlationId);
    }
  }

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

      const userDB: UserDB = {
        // Base fields
        id: uuidv4(),
        created_at: now,
        updated_at: now,

        // Soft delete fields
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
        organization_id: input.organizationId || null,

        // Profile
        avatar_url: null,
        title: input.title ?? null,
        department: input.department ?? null,
        employee_id: input.employeeId ?? null,

        // Location
        timezone: 'UTC',
        locale: 'en',
        location_id: null,

        emergency_contact: null,

        // Preferences - properly formatted as JSON object
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

      // Use Kysely's json functions for JSON columns
      await this.db
        .insertInto('users')
        .values({
          ...userDB,
          // Convert JSON fields to proper format
          preferences: JSON.stringify(userDB.preferences),
          emergency_contact: userDB.emergency_contact
            ? JSON.stringify(userDB.emergency_contact)
            : null,
          custom_fields: JSON.stringify(userDB.custom_fields),
          tags: JSON.stringify(userDB.tags),
          cached_permissions: JSON.stringify(userDB.cached_permissions),
        } as any)
        .execute();

      // Store password in separate table
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

      logger.debug(`Found ${rows.length} users in database`);

      const users: User[] = [];

      for (const row of rows) {
        try {
          // Convert date strings to Date objects
          const dateFields = [
            'created_at',
            'updated_at',
            'deleted_at',
            'email_verified_at',
            'phone_verified_at',
            'permissions_updated_at',
            'last_activity_at',
          ];

          for (const field of dateFields) {
            if (
              row[field as keyof typeof row] &&
              typeof row[field as keyof typeof row] === 'string'
            ) {
              (row as any)[field] = new Date(row[field as keyof typeof row] as string);
            }
          }

          // Parse JSON fields for each row
          const parsedRow = {
            ...row,
            preferences:
              typeof row.preferences === 'string' ? JSON.parse(row.preferences) : row.preferences,
            emergency_contact:
              typeof row.emergency_contact === 'string' && row.emergency_contact
                ? JSON.parse(row.emergency_contact)
                : row.emergency_contact,
            custom_fields:
              typeof row.custom_fields === 'string'
                ? JSON.parse(row.custom_fields)
                : row.custom_fields,
            tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags,
            cached_permissions:
              typeof row.cached_permissions === 'string'
                ? JSON.parse(row.cached_permissions)
                : row.cached_permissions,
          };

          const user = this.mapToEntity(parsedRow);
          users.push(user);
        } catch (error) {
          logger.error('Error parsing user row', {
            userId: row.id,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
          });
          // Skip this user and continue with others
        }
      }

      logger.debug(`Returning ${users.length} users`);

      return ResponseBuilder.ok(users, correlationId);
    } catch (error) {
      logger.error('Database error in findAll', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      return new DatabaseError('findAll', error, correlationId);
    }
  }

  async update(
    id: string,
    updates: Partial<Omit<User, 'id' | 'createdAt'>>,
    correlationId?: string,
  ): AsyncResult<User | null> {
    try {
      const dbUpdates: any = {
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

      // Map JSON fields with proper stringification
      if (updates.emergencyContact !== undefined) {
        dbUpdates.emergency_contact = updates.emergencyContact
          ? JSON.stringify(updates.emergencyContact)
          : null;
      }

      if (updates.preferences !== undefined) {
        const preferences = {
          theme: updates.preferences.theme ?? 'system',
          language: updates.preferences.language ?? 'en',
          date_format: updates.preferences.dateFormat ?? 'YYYY-MM-DD',
          time_format: updates.preferences.timeFormat ?? '24h',
          profile_visibility: updates.preferences.profileVisibility ?? 'organization',
          show_online_status: updates.preferences.showOnlineStatus ?? true,
        };
        dbUpdates.preferences = JSON.stringify(preferences);
      }

      if (updates.customFields !== undefined) {
        dbUpdates.custom_fields = JSON.stringify(updates.customFields);
      }

      if (updates.tags !== undefined) {
        dbUpdates.tags = JSON.stringify(updates.tags);
      }

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
  async createUserPassword(
    userId: string,
    passwordHash: string,
    correlationId?: string,
  ): AsyncResult<boolean> {
    try {
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

      return ResponseBuilder.ok(true, correlationId);
    } catch (error) {
      return new DatabaseError('createUserPassword', error, correlationId);
    }
  }

  async register(
    input: CreateUserInput & { passwordHash: string },
    correlationId?: string,
  ): AsyncResult<User> {
    const { organizationId, autoActivate, ...registrationFields } = input;

    const registrationInput = {
      ...registrationFields,
      autoActivate: false,
    };

    return this.create(registrationInput, correlationId);
  }

  private mapToEntity(row: any): User {
    try {
      // Direct mapping without the generic mapper
      const user: User = {
        // Base entity fields
        id: row.id,
        createdAt: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
        updatedAt: row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at),

        // Soft deletable fields
        deletedAt: row.deleted_at
          ? row.deleted_at instanceof Date
            ? row.deleted_at
            : new Date(row.deleted_at)
          : null,
        deletedBy: row.deleted_by || null,

        // User fields
        firstName: row.first_name,
        lastName: row.last_name,
        displayName: row.display_name || null,
        username: row.username || null,

        email: row.email,
        emailVerified: Boolean(row.email_verified),
        emailVerifiedAt: row.email_verified_at
          ? row.email_verified_at instanceof Date
            ? row.email_verified_at
            : new Date(row.email_verified_at)
          : null,

        phone: row.phone || null,
        phoneVerified: Boolean(row.phone_verified),
        phoneVerifiedAt: row.phone_verified_at
          ? row.phone_verified_at instanceof Date
            ? row.phone_verified_at
            : new Date(row.phone_verified_at)
          : null,

        status: row.status || 'pending_verification',
        type: row.type || 'internal',

        organizationId: row.organization_id || null,

        avatarUrl: row.avatar_url || null,
        title: row.title || null,
        department: row.department || null,
        employeeId: row.employee_id || null,

        timezone: row.timezone || 'UTC',
        locale: row.locale || 'en',
        locationId: row.location_id || null,

        emergencyContact: row.emergency_contact || null,

        preferences: row.preferences || {
          theme: 'system',
          language: 'en',
          dateFormat: 'YYYY-MM-DD',
          timeFormat: '24h',
          profileVisibility: 'organization',
          showOnlineStatus: true,
        },

        cachedPermissions: row.cached_permissions || [],
        permissionsUpdatedAt: row.permissions_updated_at
          ? row.permissions_updated_at instanceof Date
            ? row.permissions_updated_at
            : new Date(row.permissions_updated_at)
          : null,

        lastActivityAt: row.last_activity_at
          ? row.last_activity_at instanceof Date
            ? row.last_activity_at
            : new Date(row.last_activity_at)
          : null,
        totalLoginCount: Number(row.total_login_count) || 0,

        customFields: row.custom_fields || {},
        tags: row.tags || [],

        deactivatedReason: row.deactivated_reason || null,
      };

      // Validate with Zod to ensure it matches the schema
      const validated = UserSchema.parse(user);
      return validated;
    } catch (error) {
      logger.error('Error mapping database row to entity', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        row: {
          id: row.id,
          email: row.email,
        },
      });
      throw error;
    }
  }
}
