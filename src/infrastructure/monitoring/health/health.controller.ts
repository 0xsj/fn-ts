// src/infrastructure/monitoring/health/health.controller.ts
import { Request, Response } from 'express';
import { injectable } from 'tsyringe';
import { HealthCheckService } from './health-check.service';
import { HealthCheckOptions } from './types';
import { DIContainer } from '../../../core/di/container';
import { TOKENS } from '../../../core/di/tokens';

@injectable()
export class HealthController {
  private healthCheckService: HealthCheckService;

  constructor() {
    this.healthCheckService = DIContainer.resolve<HealthCheckService>(TOKENS.HealthCheckService);
  }

  async getHealth(req: Request, res: Response): Promise<void> {
    try {
      const options: HealthCheckOptions = {
        includeDetails: req.query.details !== 'false',
        parallel: req.query.parallel !== 'false',
        timeout: req.query.timeout ? parseInt(req.query.timeout as string) : 10000,
      };

      const health = await this.healthCheckService.checkHealth(options);
      
      // Set appropriate status code
      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 200 : 503;
      
      res.status(statusCode).json(health);
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Health check failed',
        timestamp: new Date(),
      });
    }
  }

  async getLiveness(req: Request, res: Response): Promise<void> {
    const liveness = await this.healthCheckService.checkLiveness();
    res.status(200).json(liveness);
  }

  async getReadiness(req: Request, res: Response): Promise<void> {
    try {
      const options: HealthCheckOptions = {
        includeDetails: req.query.details !== 'false',
        parallel: req.query.parallel !== 'false',
        timeout: req.query.timeout ? parseInt(req.query.timeout as string) : 5000,
      };

      const health = await this.healthCheckService.checkReadiness(options);
      
      // For readiness, we're more strict
      const statusCode = health.status === 'healthy' ? 200 : 503;
      
      res.status(statusCode).json(health);
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Readiness check failed',
        timestamp: new Date(),
      });
    }
  }
}