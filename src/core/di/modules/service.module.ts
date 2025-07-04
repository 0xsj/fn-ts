// src/core/di/modules/service.module.ts
import { BaseModule } from './base.module';
import { DependencyContainer } from 'tsyringe';
import { TOKENS } from '../tokens';
import {
  UserService,
  AuthService,
  OrganizationService,
  AccessControlService,
  AnalyticsService,
  CommunicationService,
  FileService,
  LocationService,
  NotificationService,
  OperationsService,
} from '../../../domain/services';

export class ServiceModule extends BaseModule {
  constructor() {
    super('ServiceModule');
  }

  register(container: DependencyContainer): void {
    this.log('Registering domain services...');

    // All services are singletons since they're stateless
    const services = [
      { token: TOKENS.UserService, class: UserService },
      { token: TOKENS.AuthService, class: AuthService },
      { token: TOKENS.OrganizationService, class: OrganizationService },
      { token: TOKENS.AccessControlService, class: AccessControlService },
      { token: TOKENS.AnalyticsService, class: AnalyticsService },
      { token: TOKENS.CommunicationService, class: CommunicationService },
      { token: TOKENS.FileService, class: FileService },
      { token: TOKENS.LocationService, class: LocationService },
      { token: TOKENS.NotificationService, class: NotificationService },
      { token: TOKENS.OperationsService, class: OperationsService },
    ];

    // Register each service as singleton
    services.forEach(({ token, class: ServiceClass }) => {
      container.registerSingleton(token, ServiceClass);
      this.log(`Registered ${ServiceClass.name}`);
    });

    this.log('All domain services registered');
  }
}
