// src/infrastructure/monitoring/metrics/collectors/health.collector.ts
import { injectable } from 'tsyringe';
import { PrometheusRegistry } from '../prometheus/prometheus-registry';
import { HealthCheckService } from '../../health/health-check.service';
import { Injectable, Inject } from '../../../../core/di/decorators/';

@Injectable()
export class HealthCollector {
  private collectionInterval?: NodeJS.Timeout;

  constructor(
    private prometheusRegistry: PrometheusRegistry,
    private healthService: HealthCheckService,
  ) {}

  /**
   * Start collecting health metrics
   */
  public startCollection(intervalMs: number = 30000): void {
    // Clear any existing interval
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

  /**
   * Stop collecting health metrics
   */
  public stopCollection(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = undefined;
    }
  }

  /**
   * Collect health metrics once
   */
  private async collect(): Promise<void> {
    try {
      const health = await this.healthService.checkHealth({ includeDetails: true });

      // Update overall system health
      const overallValue = this.healthStatusToValue(health.status);
      this.prometheusRegistry.healthCheckStatus.set({ check_name: 'overall' }, overallValue);

      // Update individual health checks
      for (const [name, check] of Object.entries(health.checks)) {
        const value = this.healthStatusToValue(check.status);
        this.prometheusRegistry.healthCheckStatus.set({ check_name: name }, value);

        // If the check has response time, record it
        if (check.responseTime !== undefined) {
          // You might want to add a response time histogram for health checks
          // this.prometheusRegistry.healthCheckResponseTime.observe(
          //   { check_name: name },
          //   check.responseTime / 1000
          // );
        }
      }
    } catch (error) {
      // Log error but don't throw - we don't want to crash the collector
      console.error('Failed to collect health metrics:', error);
    }
  }

  private healthStatusToValue(status: string): number {
    switch (status) {
      case 'healthy':
        return 1;
      case 'degraded':
        return 0.5;
      case 'unhealthy':
        return 0;
      default:
        return 0;
    }
  }
}
