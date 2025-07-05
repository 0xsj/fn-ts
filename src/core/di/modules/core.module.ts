// src/core/di/modules/core.module.ts
import { BaseModule } from './base.module';
import { DependencyContainer } from 'tsyringe';
import { LoggerFactory } from '../../../infrastructure/monitoring/logging/logger.factory';
import { config } from '../../config';
import { TOKENS } from '../tokens';

export class CoreModule extends BaseModule {
  constructor() {
    super('CoreModule');
  }

  register(container: DependencyContainer): void {
    this.log('Registering core services...');

    // Register Config first
    container.registerInstance(TOKENS.Config, config);
    this.log('Registered Config');

    // Register Logger early since many services need it
    container.register(TOKENS.Logger, {
      useFactory: () => {
        const factory = LoggerFactory.getInstance();
        return factory.getLogger('app');
      },
    });
    this.log('Registered Logger');

    this.log('Core services registered');
  }
}
