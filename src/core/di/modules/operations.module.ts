// src/core/di/modules/operations.module.ts
import { BaseModule } from './base.module';
import { DependencyContainer } from 'tsyringe';
import { CronSchedulerService } from '../../../infrastructure/scheduler/cron-scheduler.service';
import { CleanupJob } from '../../../infrastructure/scheduler/jobs/cleanup.job';
import { registerCronJobs } from '../../../infrastructure/scheduler/decorators/cron.decorator';
import { TOKENS } from '../tokens';

export class OperationsModule extends BaseModule {
  constructor() {
    super('OperationsModule');
  }

  register(container: DependencyContainer): void {
    try {
      this.log('Registering operations services...');

      // Register CronSchedulerService
      container.registerSingleton(TOKENS.CronScheduler, CronSchedulerService);
      this.log('CronScheduler registered');

      // Register job classes
      container.registerSingleton(CleanupJob);
      this.log('CleanupJob registered');

      // Initialize cron jobs after a short delay to ensure all dependencies are ready
      setTimeout(() => {
        try {
          this.initializeScheduledTasks(container);
        } catch (error) {
          this.logError('Failed to initialize scheduled tasks', error);
          // Don't throw - let the app continue without cron jobs
        }
      }, 1000);

      this.log('Operations services registered');
    } catch (error) {
      this.logError('Failed to register operations services', error);
      throw error;
    }
  }

  private initializeScheduledTasks(container: DependencyContainer): void {
    try {
      const jobClasses = [
        CleanupJob,
        // Add more job classes here
      ];

      for (const JobClass of jobClasses) {
        const instance = container.resolve(JobClass);
        registerCronJobs(instance);
        this.log(`Registered scheduled tasks from ${JobClass.name}`);
      }
    } catch (error) {
      this.logError('Error initializing scheduled tasks', error);
      throw error;
    }
  }
}
