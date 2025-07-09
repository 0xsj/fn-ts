// src/core/di/modules/operations.module.ts
import { BaseModule } from './base.module';
import { DependencyContainer } from 'tsyringe';
import { CronSchedulerService } from '../../../infrastructure/scheduler/cron-scheduler.service';
import { CleanupJob } from '../../../infrastructure/scheduler/jobs/cleanup.job';
import { registerCronJobs } from '../../../infrastructure/scheduler/decorators/cron.decorator';
import { OperationsService } from '../../../domain/services/operations.service';
import { OperationsRepository } from '../../../infrastructure/database/repositories/operations.repository';
import { TOKENS } from '../tokens';
import { Kysely } from 'kysely';
import { Database } from '../../../infrastructure/database/types';

export class OperationsModule extends BaseModule {
  constructor() {
    super('OperationsModule');
  }

  register(container: DependencyContainer): void {
    this.log('Registering operations services...');

    // Register repository
    container.register(TOKENS.OperationsRepository, {
      useFactory: (c) => {
        const db = c.resolve<Kysely<Database>>(TOKENS.Database);
        return new OperationsRepository(db);
      },
    });

    // Register service
    container.registerSingleton(TOKENS.OperationsService, OperationsService);

    // Register CronSchedulerService (which manages scheduled tasks)
    container.registerSingleton(TOKENS.CronScheduler, CronSchedulerService);

    // Register job classes
    container.registerSingleton(CleanupJob);

    // Initialize cron jobs (scheduled tasks)
    this.initializeScheduledTasks(container);

    this.log('Operations services registered');
  }

  private initializeScheduledTasks(container: DependencyContainer): void {
    const jobClasses = [
      CleanupJob,
      // Add more job classes here
    ];

    for (const JobClass of jobClasses) {
      const instance = container.resolve(JobClass);
      registerCronJobs(instance);
      this.log(`Registered scheduled tasks from ${JobClass.name}`);
    }
  }
}
