// src/infrastructure/scheduler/decorators/cron.decorator.ts
import { CronSchedulerService } from '../cron-scheduler.service';
import { DIContainer } from '../../../core/di/container';
import { TOKENS } from '../../../core/di/tokens';

export interface CronOptions {
  name?: string;
  timezone?: string;
  runOnInit?: boolean;
  disabled?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

/**
 * Schedule a method to run on a cron schedule
 */
export function Cron(cronExpression: string, options: CronOptions = {}): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const methodName = String(propertyKey);
    const className = target.constructor.name;
    const jobName = options.name || `${className}.${methodName}`;

    // Store metadata for later registration
    const cronJobs = Reflect.getMetadata('cron:jobs', target.constructor) || [];
    cronJobs.push({
      jobName,
      methodName,
      cronExpression,
      options,
    });
    Reflect.defineMetadata('cron:jobs', cronJobs, target.constructor);

    // Mark class as having cron jobs
    Reflect.defineMetadata('cron:hasjobs', true, target.constructor);

    return descriptor;
  };
}

/**
 * Register all @Cron decorated methods from a class instance
 */
export function registerCronJobs(instance: any): void {
  const constructor = instance.constructor;
  const cronJobs = Reflect.getMetadata('cron:jobs', constructor) || [];

  if (cronJobs.length === 0) return;

  const scheduler = DIContainer.resolve<CronSchedulerService>(TOKENS.CronScheduler);

  for (const job of cronJobs) {
    scheduler.registerJob({
      name: job.jobName,
      cronExpression: job.cronExpression,
      handler: instance[job.methodName].bind(instance),
      ...job.options,
    });
  }
}
