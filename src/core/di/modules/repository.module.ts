// src/core/di/modules/repository.module.ts
import { BaseModule } from './base.module';
import { DependencyContainer } from 'tsyringe';
import { Kysely } from 'kysely';
import { Database } from '../../../infrastructure/database/types';
import { TOKENS } from '../tokens';
import {
  UserRepository,
  AuthRepository,
  OrganizationRepository,
  AccessControlRepository,
  AnalyticsRepository,
  CommunicationRepository,
  FileRepository,
  LocationRepository,
  NotificationRepository,
  OperationsRepository,
  CollectionsRepository,
} from '../../../infrastructure/database/repositories';
import { TransactionManager } from '../../../infrastructure/database/transaction/transaction-manager';

export class RepositoryModule extends BaseModule {
  constructor() {
    super('RepositoryModule');
  }

  register(container: DependencyContainer): void {
    this.log('Registering repositories...');

    // Define all repository registrations
    const repositories = [
      { token: TOKENS.UserRepository, class: UserRepository },
      { token: TOKENS.AuthRepository, class: AuthRepository },
      { token: TOKENS.OrganizationRepository, class: OrganizationRepository },
      { token: TOKENS.AccessControlRepository, class: AccessControlRepository },
      { token: TOKENS.AnalyticsRepository, class: AnalyticsRepository },
      { token: TOKENS.CommunicationRepository, class: CommunicationRepository },
      { token: TOKENS.FileRepository, class: FileRepository },
      { token: TOKENS.LocationRepository, class: LocationRepository },
      { token: TOKENS.NotificationRepository, class: NotificationRepository },
      { token: TOKENS.OperationsRepository, class: OperationsRepository },
      { token: TOKENS.CollectionRepository, class: CollectionsRepository },
    ];

    // Register each repository with the same pattern
    repositories.forEach(({ token, class: RepositoryClass }) => {
      container.register(token, {
        useFactory: (c) => {
          const db = c.resolve<Kysely<Database>>(TOKENS.Database);
          const transactionManager = c.resolve<TransactionManager>(TOKENS.TransactionManager);
          return new RepositoryClass(db, transactionManager);
        },
      });

      this.log(`Registered ${RepositoryClass.name}`);
    });

    this.log('All repositories registered');
  }
}
