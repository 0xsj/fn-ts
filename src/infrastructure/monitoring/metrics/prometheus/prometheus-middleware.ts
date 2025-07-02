// src/infrastructure/monitoring/metrics/prometheus/prometheus-middleware.ts
import { Request, Response, NextFunction } from 'express';
import { PrometheusRegistry } from './prometheus-registry';
import { DIContainer } from '../../../../core/di/container';
import { TOKENS } from '../../../../core/di/tokens';

export function prometheusMiddleware() {
  const registry = DIContainer.resolve<PrometheusRegistry>(TOKENS.PrometheusRegistry);
  
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    // Get route pattern (e.g., /users/:id instead of /users/123)
    const route = req.route?.path || req.path;
    
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      
      // Record metrics
      registry.httpRequestDuration.observe(
        {
          method: req.method,
          route: route,
          status_code: res.statusCode.toString(),
        },
        duration
      );
      
      registry.httpRequestTotal.inc({
        method: req.method,
        route: route,
        status_code: res.statusCode.toString(),
      });
      
      // Record errors
      if (res.statusCode >= 400) {
        registry.httpRequestErrors.inc({
          method: req.method,
          route: route,
          error_type: res.statusCode >= 500 ? 'server_error' : 'client_error',
        });
      }
    });
    
    next();
  };
}