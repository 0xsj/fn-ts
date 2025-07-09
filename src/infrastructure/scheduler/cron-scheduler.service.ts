// src/infrastructure/scheduler/cron-scheduler.service.ts
import * as cron from 'node-cron';
import { Injectable, Inject } from '../../core/di/decorators';
import { TOKENS } from '../../core/di/tokens';
import { ILogger } from '../../shared/utils';
import { CronJobConfig, CronJobMetadata, CronJobResult } from './types';
import { EventBus } from '../events/event-bus';

@Injectable()
export class CronSchedulerService {
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private jobConfigs: Map<string, CronJobConfig> = new Map();
  private jobMetadata: Map<string, CronJobMetadata> = new Map();
  private runningJobs: Set<string> = new Set();

  constructor(
    @Inject(TOKENS.EventBus) private eventBus: EventBus,
    @Inject(TOKENS.Logger) private logger: ILogger,
  ) {}

  /**
   * Register a cron job
   */
  registerJob(config: CronJobConfig): void {
    if (this.jobs.has(config.name)) {
      throw new Error(`Cron job '${config.name}' already registered`);
    }

    // Validate cron expression
    if (!cron.validate(config.cronExpression)) {
      throw new Error(`Invalid cron expression: ${config.cronExpression}`);
    }

    this.logger.info(`Registering cron job: ${config.name}`, {
      cronExpression: config.cronExpression,
      timezone: config.timezone,
    });

    // Create wrapped handler with error handling and metrics
    const wrappedHandler = this.wrapHandler(config);

    // Create scheduled task
    const task = cron.schedule(config.cronExpression, wrappedHandler, {
      timezone: config.timezone,
    });

    // Start or stop based on disabled flag
    if (config.disabled) {
      task.stop();
    }

    // Store job references
    this.jobs.set(config.name, task);
    this.jobConfigs.set(config.name, config);
    this.jobMetadata.set(config.name, {
      name: config.name,
      cronExpression: config.cronExpression,
      isRunning: false,
      consecutiveFailures: 0,
      totalRuns: 0,
      totalFailures: 0,
    });

    // Run on init if specified
    if (config.runOnInit && !config.disabled) {
      this.runJob(config.name);
    }
  }

  /**
   * Manually trigger a job
   */
  async runJob(jobName: string): Promise<CronJobResult> {
    const config = this.jobConfigs.get(jobName);
    if (!config) {
      throw new Error(`Cron job '${jobName}' not found`);
    }

    const wrappedHandler = this.wrapHandler(config);
    return wrappedHandler();
  }

  /**
   * Start a stopped job
   */
  startJob(jobName: string): void {
    const task = this.jobs.get(jobName);
    if (!task) {
      throw new Error(`Cron job '${jobName}' not found`);
    }

    task.start();
    this.logger.info(`Started cron job: ${jobName}`);
  }

  /**
   * Stop a running job
   */
  stopJob(jobName: string): void {
    const task = this.jobs.get(jobName);
    if (!task) {
      throw new Error(`Cron job '${jobName}' not found`);
    }

    task.stop();
    this.logger.info(`Stopped cron job: ${jobName}`);

    const metadata = this.jobMetadata.get(jobName);
    if (metadata) {
      metadata.nextRun = undefined;
    }
  }

  /**
   * Get all registered jobs
   */
  getAllJobs(): CronJobMetadata[] {
    return Array.from(this.jobMetadata.values());
  }

  /**
   * Wrap job handler with error handling and metrics
   */
  private wrapHandler(config: CronJobConfig): () => Promise<CronJobResult> {
    return async () => {
      const jobName = config.name;
      const metadata = this.jobMetadata.get(jobName)!;

      // Check if job is already running
      if (this.runningJobs.has(jobName)) {
        this.logger.warn(`Job '${jobName}' is already running, skipping execution`);
        return {
          jobName,
          startTime: new Date(),
          endTime: new Date(),
          duration: 0,
          success: false,
          error: 'Job already running',
        };
      }

      const startTime = new Date();
      this.runningJobs.add(jobName);
      metadata.isRunning = true;
      metadata.lastRun = startTime;

      this.logger.info(`Starting cron job: ${jobName}`);

      try {
        // Execute job
        await config.handler();

        const endTime = new Date();
        const duration = endTime.getTime() - startTime.getTime();

        // Update metadata
        metadata.totalRuns++;
        metadata.consecutiveFailures = 0;
        metadata.averageRunTime = metadata.averageRunTime
          ? (metadata.averageRunTime + duration) / 2
          : duration;

        const result: CronJobResult = {
          jobName,
          startTime,
          endTime,
          duration,
          success: true,
        };

        this.logger.info(`Completed cron job: ${jobName}`, { duration });

        return result;
      } catch (error) {
        const endTime = new Date();
        const duration = endTime.getTime() - startTime.getTime();
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Update metadata
        metadata.totalRuns++;
        metadata.totalFailures++;
        metadata.consecutiveFailures++;

        const result: CronJobResult = {
          jobName,
          startTime,
          endTime,
          duration,
          success: false,
          error: errorMessage,
        };

        this.logger.error(`Failed cron job: ${jobName}`, { error: errorMessage, duration });

        return result;
      } finally {
        this.runningJobs.delete(jobName);
        metadata.isRunning = false;
      }
    };
  }
}
