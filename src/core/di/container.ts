import 'reflect-metadata';
import { container } from 'tsyringe';
import { Kysely } from 'kysely';
import type { Database } from '../../infrastructure/database/types';
import { createDatabase } from '../../infrastructure/database/connection';
import { UserRepository } from '../../infrastructure/database/repositories/user.repository';
import { UserService } from '../../domain/services/user.service';
import { logger } from '../../shared/utils';
import { TOKENS } from './tokens';

export class DIContainer {
  private static initialized = false;
  static async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('DI Container already initialized');
      return;
    }

    await this.registerDatabase();
    this.registerRepositories();
    this.registerServices();
  }

  private static async registerDatabase(): Promise<void> {
    const db = await createDatabase();
    container.registerInstance<Kysely<Database>>(TOKENS.Database, db);
  }

  private static registerRepositories(): void {
    container.register(TOKENS.UserRepository, {
      useFactory: (c) => {
        const db = c.resolve<Kysely<Database>>(TOKENS.Database);
        return new UserRepository(db);
      },
    });
  }

  private static registerServices(): void {
    container.registerSingleton(TOKENS.UserService, UserService);
  }

  static resolve<T>(token: symbol): T {
    return container.resolve<T>(token);
  }

  static async dispose(): Promise<void> {
    const db = container.resolve<Kysely<Database>>(TOKENS.Database);
    await db.destroy();
    container.reset();
    this.initialized = false;
  }
}

export { container };
