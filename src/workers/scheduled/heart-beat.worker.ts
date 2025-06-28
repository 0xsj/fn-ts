// src/workers/scheduled/heartbeat.worker.ts
import { CronJob } from 'cron';
import { logger } from '../../shared/utils';

export class HeartbeatWorker {
  private job: CronJob;
  private counter = 0;

  constructor(private schedule: string = '*/30 * * * * *') { // Every 30 seconds
    this.job = new CronJob(this.schedule, this.execute.bind(this), null, false);
  }

  async execute(): Promise<void> {
    this.counter++;
    const timestamp = new Date().toISOString();
    
    logger.info(`💓 Heartbeat #${this.counter} at ${timestamp}`);
    
    // Simulate some work
    const randomDelay = Math.floor(Math.random() * 1000) + 500; // 500-1500ms
    await this.simulateWork(randomDelay);
    
    logger.info(`✅ Heartbeat #${this.counter} completed (took ${randomDelay}ms)`);
  }

  private simulateWork(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  start(): void {
    this.job.start();
    logger.info('🚀 Heartbeat worker started - will pulse every 30 seconds');
  }

  stop(): void {
    this.job.stop();
    logger.info(`🛑 Heartbeat worker stopped after ${this.counter} beats`);
  }
}