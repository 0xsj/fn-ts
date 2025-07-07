// src/core/di/modules/database.module.ts
import { BaseModule } from './base.module';
import { DependencyContainer } from 'tsyringe';
import { Kysely } from 'kysely';
import { Database } from '../../../infrastructure/database/types';
import { createDatabase } from '../../../infrastructure/database/connection';
import { TOKENS } from '../tokens';

export class DatabaseModule extends BaseModule {
  constructor() {
    super('DatabaseModule');
  }

  async register(container: DependencyContainer): Promise<void> {
    try {
      this.log('Creating database connection...');

      const db = await createDatabase();

      container.registerInstance<Kysely<Database>>(TOKENS.Database, db);

      this.log('Database connection established');
    } catch (error) {
      this.logError('Failed to create database connection', error);
      throw error;
    }
  }
}
