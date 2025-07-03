// src/infrastructure/queue/base.queue.ts
import { Queue, Worker, QueueEvents, Job, ConnectionOptions } from 'bullmq';
import { QueueJob } from '../types';
import { logger } from '../../../shared/utils';
import { config } from '../../../core/config';

export abstract class BaseQueue {
  protected queue: Queue;
  protected worker?: Worker;
  protected queueEvents: QueueEvents;
  protected readonly queueName: string;
  protected readonly redisConnection: ConnectionOptions;

  constructor(queueName: string) {
    this.queueName = queueName;
    this.redisConnection = {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
    };

    // Initialize queue
    this.queue = new Queue(this.queueName, {
      connection: this.redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 3600, // Keep completed jobs for 1 hour
          count: 100, // Keep last 100 completed jobs
        },
        removeOnFail: {
          age: 24 * 3600, // Keep failed jobs for 24 hours
        },
      },
    });

    // Initialize queue events for monitoring
    this.queueEvents = new QueueEvents(this.queueName, {
      connection: this.redisConnection,
    });

    this.setupEventListeners();

    logger.info(`Queue initialized: ${this.queueName}`);
  }

  /**
   * Add a job to the queue
   */
  async addJob<T = any>(jobData: QueueJob<T>): Promise<Job> {
    try {
      const job = await this.queue.add(jobData.name, jobData.data, {
        ...jobData.options,
        // Add correlation ID to job ID if available
        jobId: jobData.id || jobData.options?.jobId,
      });

      logger.info(`Job added to queue: ${this.queueName}`, {
        jobId: job.id,
        jobName: job.name,
        correlationId: (jobData.data as any).correlationId,
      });

      return job;
    } catch (error) {
      logger.error(`Failed to add job to queue: ${this.queueName}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        jobData,
      });
      throw error;
    }
  }

  /**
   * Add multiple jobs to the queue
   */
  async addBulkJobs<T = any>(jobs: QueueJob<T>[]): Promise<Job[]> {
    try {
      const bulkJobs = jobs.map((job) => ({
        name: job.name,
        data: job.data,
        opts: job.options,
      }));

      const addedJobs = await this.queue.addBulk(bulkJobs);

      logger.info(`Bulk jobs added to queue: ${this.queueName}`, {
        count: addedJobs.length,
      });

      return addedJobs;
    } catch (error) {
      logger.error(`Failed to add bulk jobs to queue: ${this.queueName}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Create and start a worker for this queue
   */
  protected createWorker(processor: (job: Job) => Promise<any>): Worker {
    this.worker = new Worker(this.queueName, processor, {
      connection: this.redisConnection,
      concurrency: this.getConcurrency(),
      limiter: {
        max: this.getRateLimitMax(),
        duration: this.getRateLimitDuration(),
      },
    });

    this.setupWorkerEventListeners();

    logger.info(`Worker started for queue: ${this.queueName}`, {
      concurrency: this.getConcurrency(),
    });

    return this.worker;
  }

  /**
   * Get queue metrics
   */
  async getMetrics() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return {
      queue: this.queueName,
      counts: {
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + completed + failed + delayed,
      },
    };
  }

  /**
   * Pause the queue
   */
  async pause(): Promise<void> {
    await this.queue.pause();
    logger.info(`Queue paused: ${this.queueName}`);
  }

  /**
   * Resume the queue
   */
  async resume(): Promise<void> {
    await this.queue.resume();
    logger.info(`Queue resumed: ${this.queueName}`);
  }

  /**
   * Clean old jobs
   */
  async clean(grace: number = 0, limit: number = 100): Promise<string[]> {
    const jobs = await this.queue.clean(grace, limit);
    logger.info(`Cleaned ${jobs.length} jobs from queue: ${this.queueName}`);
    return jobs;
  }

  /**
   * Close queue connections
   */
  async close(): Promise<void> {
    await this.queue.close();
    await this.queueEvents.close();
    if (this.worker) {
      await this.worker.close();
    }
    logger.info(`Queue closed: ${this.queueName}`);
  }

  private setupEventListeners(): void {
    this.queueEvents.on('completed', ({ jobId, returnvalue }) => {
      logger.debug(`Job completed in queue: ${this.queueName}`, {
        jobId,
        returnvalue,
      });
    });

    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      logger.error(`Job failed in queue: ${this.queueName}`, {
        jobId,
        failedReason,
      });
    });

    this.queueEvents.on('progress', ({ jobId, data }) => {
      logger.debug(`Job progress in queue: ${this.queueName}`, {
        jobId,
        progress: data,
      });
    });
  }

  private setupWorkerEventListeners(): void {
    if (!this.worker) return;

    this.worker.on('completed', (job) => {
      logger.info(`Job completed: ${job.name}`, {
        queue: this.queueName,
        jobId: job.id,
        duration: Date.now() - job.timestamp,
      });
    });

    this.worker.on('failed', (job, err) => {
      logger.error(`Job failed: ${job?.name}`, {
        queue: this.queueName,
        jobId: job?.id,
        error: err.message,
        stack: err.stack,
      });
    });

    this.worker.on('error', (err) => {
      logger.error(`Worker error in queue: ${this.queueName}`, {
        error: err.message,
        stack: err.stack,
      });
    });
  }

  // Override these in subclasses
  protected getConcurrency(): number {
    return 5; // Default concurrency
  }

  protected getRateLimitMax(): number {
    return 10; // Default: 10 jobs
  }

  protected getRateLimitDuration(): number {
    return 1000; // Default: per 1 second
  }

  public getQueue(): Queue {
    return this.queue;
  }
}
