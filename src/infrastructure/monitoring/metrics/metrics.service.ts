// src/infrastructure/monitoring/metrics/metrics.service.ts
import { PrometheusRegistry } from './prometheus/prometheus-registry';
import { HealthCollector } from './collectors/health.collector';
import { HttpCollector } from './collectors/http.collector';
import { QueueCollector } from './collectors/queue.collector';
import { BusinessCollector } from './collectors/business.collector';
import { Injectable, Inject } from '../../../core/di/decorators';

@Injectable()
export class MetricsService {
  private collectors: Map<string, any> = new Map();

  constructor(
    private prometheusRegistry: PrometheusRegistry,
    private healthCollector: HealthCollector,
    private httpCollector: HttpCollector,
    private queueCollector: QueueCollector,
    private businessCollector: BusinessCollector,
  ) {
    this.registerCollectors();
  }

  private registerCollectors(): void {
    this.collectors.set('health', this.healthCollector);
    this.collectors.set('http', this.httpCollector);
    this.collectors.set('queue', this.queueCollector);
    this.collectors.set('business', this.businessCollector);
  }

  /**
   * Start all metric collectors
   */
  public async startCollection(): Promise<void> {
    // Start health metrics collection (every 30s)
    this.healthCollector.startCollection(30000);

    // HTTP collector doesn't need to start - it's triggered by middleware

    // Queue collector might poll queue stats
    this.queueCollector.startCollection(15000);

    // Business metrics might be event-driven or polled
    this.businessCollector.startCollection(60000);
  }

  /**
   * Stop all metric collectors
   */
  public async stopCollection(): Promise<void> {
    this.healthCollector.stopCollection();
    this.queueCollector.stopCollection();
    this.businessCollector.stopCollection();
  }

  /**
   * Get metrics in Prometheus format
   */
  public async getMetrics(): Promise<string> {
    return this.prometheusRegistry.getMetrics();
  }

  /**
   * Get specific collector
   */
  public getCollector<T>(name: string): T {
    return this.collectors.get(name);
  }
}
