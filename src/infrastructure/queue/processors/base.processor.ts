// src/infrastructure/queue/processors/base.processor.ts
import { Job } from 'bullmq';
import { logger } from '../../../shared/utils/logger';

export abstract class BaseProcessor<T = any> {
  abstract name: string;

  async process(job: Job<T>): Promise<any> {
    const startTime = Date.now();

    try {
      logger.info(`Processing ${this.name} job`, {
        jobId: job.id,
        jobName: job.name,
        attemptNumber: job.attemptsMade,
      });

      const result = await this.execute(job);

      logger.info(`${this.name} job completed`, {
        jobId: job.id,
        duration: Date.now() - startTime,
      });

      return result;
    } catch (error) {
      logger.error(`${this.name} job failed`, {
        jobId: job.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  protected abstract execute(job: Job<T>): Promise<any>;
}
