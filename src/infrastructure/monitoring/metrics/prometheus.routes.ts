// src/infrastructure/monitoring/metrics/prometheus.routes.ts
import { Router, Request, Response } from 'express';
import { DIContainer } from '../../../core/di/container';
import { TOKENS } from '../../../core/di/tokens';
import { MetricsService } from './metrics.service';
import { PrometheusRegistry } from './prometheus/prometheus-registry';

export function createPrometheusRoutes(): Router {
  const router = Router();

  /**
   * GET /metrics
   * Prometheus scrape endpoint
   */
  router.get('/metrics', async (_req: Request, res: Response) => {
    try {
      const metricsService = DIContainer.resolve<MetricsService>(TOKENS.MetricsService);
      const registry = DIContainer.resolve<PrometheusRegistry>(TOKENS.PrometheusRegistry);

      // Get metrics in Prometheus format
      const metrics = await metricsService.getMetrics();

      // Set the appropriate content type for Prometheus
      res.set('Content-Type', registry.getRegistry().contentType);
      res.end(metrics);
    } catch (error) {
      console.error('Failed to get metrics:', error);
      res.status(500).json({
        error: 'Failed to retrieve metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /metrics/health
   * Simple health check for the metrics endpoint itself
   */
  router.get('/metrics/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'prometheus-metrics',
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /metrics/json
   * Optional: Get metrics in JSON format for debugging
   */
  router.get('/metrics/json', async (_req: Request, res: Response) => {
    try {
      const registry = DIContainer.resolve<PrometheusRegistry>(TOKENS.PrometheusRegistry);

      // Get the raw metric objects
      const metrics = await registry.getRegistry().getMetricsAsJSON();

      res.json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to get metrics as JSON:', error);
      res.status(500).json({
        error: 'Failed to retrieve metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return router;
}
