// src/core/di/modules/database.module.ts
import { BaseModule } from './base.module';
import { DependencyContainer } from 'tsyringe';
import { createDatabase } from '../../../infrastructure/database/connection';
import { Kysely } from 'kysely';
import { Database } from '../../../infrastructure/database/types';
import { TransactionManager } from '../../../infrastructure/database/transaction/transaction-manager';
import { TOKENS } from '../tokens';

export class DatabaseModule extends BaseModule {
  constructor() {
    super('DatabaseModule');
  }

  async register(container: DependencyContainer): Promise<void> {
    this.log('Registering database connection...');

    try {
      // Create and register database connection
      const db = await createDatabase();
      container.registerInstance<Kysely<Database>>(TOKENS.Database, db);
      this.log('Database connection established');

      // Register TransactionManager
      container.register(TOKENS.TransactionManager, {
        useFactory: (c) => {
          const database = c.resolve<Kysely<Database>>(TOKENS.Database);
          return new TransactionManager(database);
        },
      });
      this.log('TransactionManager registered');
    } catch (error) {
      this.logError('Failed to establish database connection', error);
      throw error;
    }
  }
}
