// src/infrastructure/monitoring/health/health-check.service.ts
import { injectable } from 'tsyringe';
import { HealthIndicator, SystemHealth, HealthStatus, HealthCheckOptions } from './types';
import { DatabaseHealthIndicator } from './indicators/database.indicator';
import { RedisHealthIndicator } from './indicators/redis.indicator';
import { DiskHealthIndicator } from './indicators/disk.indicator';
import { MemoryHealthIndicator } from './indicators/memory.indicator';
import { config } from '../../../core/config';
import { logger } from '../../../shared/utils/logger';

@injectable()
export class HealthCheckService {
  private indicators: Map<string, HealthIndicator> = new Map();
  private startTime: Date;

  constructor() {
    this.startTime = new Date();
    this.registerDefaultIndicators();
  }

  private registerDefaultIndicators(): void {
    // Register all default indicators
    this.registerIndicator(new DatabaseHealthIndicator());
    this.registerIndicator(new RedisHealthIndicator());
    this.registerIndicator(new DiskHealthIndicator());
    this.registerIndicator(new MemoryHealthIndicator());
  }

  registerIndicator(indicator: HealthIndicator): void {
    this.indicators.set(indicator.name, indicator);
    logger.info(`Registered health indicator: ${indicator.name}`);
  }

  async checkHealth(options: HealthCheckOptions = {}): Promise<SystemHealth> {
    const startTime = Date.now();
    const checks: Record<string, any> = {};

    // Determine overall status
    let overallStatus: HealthStatus = 'healthy';

    if (options.parallel !== false) {
      // Run checks in parallel (default)
      const checkPromises = Array.from(this.indicators.entries()).map(async ([name, indicator]) => {
        try {
          const result = await this.timeoutCheck(indicator, options.timeout);
          checks[name] = result;

          // Update overall status
          if (indicator.isEssential && result.status === 'unhealthy') {
            overallStatus = 'unhealthy';
          } else if (result.status === 'degraded' && overallStatus === 'healthy') {
            overallStatus = 'degraded';
          } else if (result.status === 'unhealthy' && overallStatus !== 'unhealthy') {
            overallStatus = 'degraded';
          }
        } catch (error) {
          checks[name] = {
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Check timeout',
            lastChecked: new Date(),
          };

          if (indicator.isEssential) {
            overallStatus = 'unhealthy';
          } else if (overallStatus === 'healthy') {
            overallStatus = 'degraded';
          }
        }
      });

      await Promise.all(checkPromises);
    } else {
      // Run checks sequentially
      for (const [name, indicator] of this.indicators) {
        try {
          const result = await this.timeoutCheck(indicator, options.timeout);
          checks[name] = result;

          // Update overall status
          if (indicator.isEssential && result.status === 'unhealthy') {
            overallStatus = 'unhealthy';
          } else if (result.status === 'degraded' && overallStatus === 'healthy') {
            overallStatus = 'degraded';
          } else if (result.status === 'unhealthy' && overallStatus !== 'unhealthy') {
            overallStatus = 'degraded';
          }
        } catch (error) {
          checks[name] = {
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Check timeout',
            lastChecked: new Date(),
          };

          if (indicator.isEssential) {
            overallStatus = 'unhealthy';
          } else if (overallStatus === 'healthy') {
            overallStatus = 'degraded';
          }
        }
      }
    }

    const endTime = Date.now();
    const uptime = Math.floor((Date.now() - this.startTime.getTime()) / 1000);

    // Remove details if not requested
    if (!options.includeDetails) {
      for (const check of Object.values(checks)) {
        delete check.details;
      }
    }

    return {
      status: overallStatus,
      timestamp: new Date(),
      uptime,
      version: config.app.version,
      environment: config.app.env,
      checks,
      totalResponseTime: endTime - startTime,
    } as SystemHealth;
  }

  async checkLiveness(): Promise<{ status: string; timestamp: Date }> {
    // Simple liveness check - just return OK if the app is running
    return {
      status: 'ok',
      timestamp: new Date(),
    };
  }

  async checkReadiness(options: HealthCheckOptions = {}): Promise<SystemHealth> {
    // Readiness check - only check essential services
    const essentialIndicators = Array.from(this.indicators.values()).filter(
      (indicator) => indicator.isEssential,
    );

    const health = await this.checkHealth(options);

    // Filter to only essential checks
    const essentialChecks: Record<string, any> = {};
    for (const [name, indicator] of this.indicators) {
      if (indicator.isEssential) {
        essentialChecks[name] = health.checks[name];
      }
    }

    health.checks = essentialChecks;
    return health;
  }

  private async timeoutCheck(indicator: HealthIndicator, timeout: number = 10000): Promise<any> {
    return Promise.race([
      indicator.check(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Health check timeout')), timeout),
      ),
    ]);
  }

  getUptime(): number {
    return Math.floor((Date.now() - this.startTime.getTime()) / 1000);
  }

  getIndicators(): string[] {
    return Array.from(this.indicators.keys());
  }
}
