// src/core/di/modules/integration.module.ts
import { BaseModule } from './base.module';
import { DependencyContainer } from 'tsyringe';
import { EmailService } from '../../../infrastructure/integrations/email/email.service';
// import { PushService } from '../../../infrastructure/integrations/push/push.service';
import { TOKENS } from '../tokens';

export class IntegrationModule extends BaseModule {
  constructor() {
    super('IntegrationModule');
  }

  register(container: DependencyContainer): void {
    this.log('Registering integration services...');

    // Register Email Service
    container.registerSingleton(TOKENS.EmailService, EmailService);
    this.log('Registered EmailService');

    // Register Push Service (if you implement it)
    // container.registerSingleton(TOKENS.PushService, PushService);
    // this.log('Registered PushService');

    // Future integrations can be added here:
    // - SMS Service (Twilio, etc.)
    // - Storage Service (S3, MinIO)
    // - Payment Service (Stripe, etc.)
    // - Analytics Service (Segment, Mixpanel)
    // - Monitoring Service (Sentry, DataDog)

    this.log('Integration services registered');
  }
}
