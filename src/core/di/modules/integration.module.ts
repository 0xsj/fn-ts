// src/core/di/modules/integration.module.ts (updated)
import { BaseModule } from './base.module';
import { DependencyContainer } from 'tsyringe';
import { EmailService } from '../../../infrastructure/integrations/email/email.service';
// import { PushService } from '../../../infrastructure/integrations/push/push.service';
import { LoggerFactory } from '../../../infrastructure/monitoring/logging/logger.factory';
import { config } from '../../config';
import { TOKENS } from '../tokens';

export class IntegrationModule extends BaseModule {
  constructor() {
    super('IntegrationModule');
  }

  register(container: DependencyContainer): void {
    this.log('Registering integration services...');

    // // Register Logger
    // container.register(TOKENS.Logger, {
    //   useFactory: () => {
    //     const factory = LoggerFactory.getInstance();
    //     return factory.getLogger('app');
    //   },
    // });
    // this.log('Registered Logger');

    // Register Config
    container.registerInstance(TOKENS.Config, config);
    this.log('Registered Config');

    // Register Email Service
    container.registerSingleton(TOKENS.EmailService, EmailService);
    this.log('Registered EmailService');

    this.log('Integration services registered');
  }
}
