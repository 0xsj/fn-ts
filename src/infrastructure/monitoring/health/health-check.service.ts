// src/infrastructure/monitoring/health/health-check.service.ts
import { injectable } from 'tsyringe';
import { HealthIndicator, SystemHealth, HealthStatus, HealthCheckOptions } from './types';
import { DatabaseHealthIndicator } from './indicators/database.indicator';
import { RedisHealthIndicator } from './indicators/redis.indicator';
import { DiskHealthIndicator } from './indicators/disk.indicator';
import { MemoryHealthIndicator } from './indicators/memory.indicator';
import { config } from '../../../core/config';
import { logger } from '../../../shared/utils/logger';
import { Injectable } from '../../../core/di/decorators/injectable.decorator';
import { DIContainer } from '../../../core/di/container';
import { TOKENS } from '../../../core/di/tokens';
import { SocketServer } from '../../websocket/server/socket.server';

@Injectable()
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

  /**
   * Check WebSocket server health
   */
  /**
   * Check WebSocket server health
   */
  private async checkWebSocket(): Promise<any> {
    try {
      if (!config.websocket.enabled) {
        return {
          status: 'healthy',
          details: {
            enabled: false,
            message: 'WebSocket disabled by configuration',
          },
          lastChecked: new Date(),
        };
      }

      // Try to resolve SocketServer safely - check if DI container is fully initialized
      let socketServer: SocketServer | null = null;
      try {
        socketServer = DIContainer.resolve<SocketServer>(TOKENS.SocketServer);
      } catch (resolutionError) {
        // During startup, this is expected - WebSocket module loads after MonitoringModule
        return {
          status: 'degraded',
          details: {
            enabled: config.websocket.enabled,
            registered: false,
            message: 'WebSocket server not yet registered (startup in progress)',
            phase: 'initialization',
          },
          lastChecked: new Date(),
        };
      }

      if (!socketServer) {
        return {
          status: 'degraded',
          details: {
            enabled: config.websocket.enabled,
            registered: true,
            initialized: false,
            message: 'WebSocket server registered but not initialized',
          },
          lastChecked: new Date(),
        };
      }

      const server = socketServer.getServer();

      if (!server) {
        return {
          status: 'degraded',
          details: {
            enabled: config.websocket.enabled,
            registered: true,
            initialized: false,
            message: 'WebSocket server not yet initialized (startup in progress)',
          },
          lastChecked: new Date(),
        };
      }

      const stats = socketServer.getStats();

      return {
        status: 'healthy',
        details: {
          enabled: true,
          registered: true,
          initialized: true,
          path: config.websocket.path,
          redisAdapter: config.websocket.redis.enabled,
          totalConnections: stats.totalConnections,
          authenticatedUsers: stats.authenticatedUsers,
          uniqueUsers: stats.uniqueUsers,
          serverRunning: true,
        },
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'WebSocket check failed',
        details: {
          enabled: config.websocket.enabled,
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
        lastChecked: new Date(),
      };
    }
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

      // Add WebSocket check to the parallel checks
      checkPromises.push(
        (async () => {
          try {
            checks['websocket'] = await this.checkWebSocket();

            // WebSocket is not essential, so degraded/unhealthy won't fail the whole system
            if (checks['websocket'].status === 'degraded' && overallStatus === 'healthy') {
              overallStatus = 'degraded';
            }
          } catch (error) {
            checks['websocket'] = {
              status: 'unhealthy',
              error: error instanceof Error ? error.message : 'WebSocket check failed',
              lastChecked: new Date(),
            };

            // WebSocket failure only degrades the system, doesn't make it unhealthy
            if (overallStatus === 'healthy') {
              overallStatus = 'degraded';
            }
          }
        })(),
      );

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

      // Add WebSocket check sequentially
      try {
        checks['websocket'] = await this.checkWebSocket();

        if (checks['websocket'].status === 'degraded' && overallStatus === 'healthy') {
          overallStatus = 'degraded';
        }
      } catch (error) {
        checks['websocket'] = {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'WebSocket check failed',
          lastChecked: new Date(),
        };

        if (overallStatus === 'healthy') {
          overallStatus = 'degraded';
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

    // Filter to only essential checks (WebSocket is not essential)
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
