// src/infrastructure/monitoring/metrics/collectors/http.collector.ts
import { injectable } from 'tsyringe';
import { PrometheusRegistry } from '../prometheus/prometheus-registry';

@injectable()
export class HttpCollector {
  constructor(private registry: PrometheusRegistry) {}

  /**
   * Record HTTP request (called from middleware)
   */
  public recordRequest(method: string, route: string, statusCode: number, duration: number): void {
    // Record in histogram
    this.registry.httpRequestDuration.observe(
      { method, route, status_code: statusCode.toString() },
      duration / 1000, // Convert to seconds
    );

    // Increment counter
    this.registry.httpRequestTotal.inc({
      method,
      route,
      status_code: statusCode.toString(),
    });

    // Record errors
    if (statusCode >= 400) {
      this.registry.httpRequestErrors.inc({
        method,
        route,
        error_type: statusCode >= 500 ? 'server_error' : 'client_error',
      });
    }
  }
}
