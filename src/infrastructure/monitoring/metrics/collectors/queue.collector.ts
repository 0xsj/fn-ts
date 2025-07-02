// src/infrastructure/monitoring/metrics/collectors/queue.collector.ts
import { injectable } from 'tsyringe';
import { PrometheusRegistry } from '../prometheus/prometheus-registry';
import { QueueManager } from '../../../queue/queue.manager';

@injectable()
export class QueueCollector {
  private collectionInterval?: NodeJS.Timeout;

  constructor(
    private registry: PrometheusRegistry,
    private queueManager: QueueManager,
  ) {}

  public startCollection(intervalMs: number = 15000): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
    }

    // Collect immediately
    this.collect();

    // Then collect on interval
    this.collectionInterval = setInterval(() => {
      this.collect();
    }, intervalMs);
  }

  public stopCollection(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = undefined;
    }
  }

  private async collect(): Promise<void> {
    try {
      const metrics = await this.queueManager.getAllMetrics();

      // Update queue-specific gauges
      for (const [queueName, queueMetrics] of Object.entries(metrics)) {
        // You might want to add these gauges to your registry:
        // this.registry.queueSize.set({ queue_name: queueName }, queueMetrics.waiting);
        // this.registry.queueActive.set({ queue_name: queueName }, queueMetrics.active);
        // this.registry.queueCompleted.set({ queue_name: queueName }, queueMetrics.completed);
        // this.registry.queueFailed.set({ queue_name: queueName }, queueMetrics.failed);
      }
    } catch (error) {
      console.error('Failed to collect queue metrics:', error);
    }
  }

  /**
   * Record job completion (called from queue processors)
   */
  public recordJobCompleted(queueName: string, jobType: string, duration: number): void {
    this.registry.queueJobsProcessed.inc({ queue_name: queueName, job_type: jobType });
    this.registry.queueJobDuration.observe(
      { queue_name: queueName, job_type: jobType },
      duration / 1000,
    );
  }

  /**
   * Record job failure (called from queue processors)
   */
  public recordJobFailed(queueName: string, jobType: string, errorType: string): void {
    this.registry.queueJobsFailed.inc({
      queue_name: queueName,
      job_type: jobType,
      error_type: errorType,
    });
  }
}
