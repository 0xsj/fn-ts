// src/infrastructure/monitoring/health/indicators/redis.indicator.ts
import { BaseHealthIndicator } from './base.indicator';
import { HealthCheckData } from '../types';
import { RedisClient } from '../../../cache/redis.client';

export class RedisHealthIndicator extends BaseHealthIndicator {
  name = 'redis';

  constructor() {
    super({
      isEssential: true,
      circuitBreaker: {
        failureThreshold: 3,
        resetTimeout: 30000, // 30 seconds
        halfOpenRetries: 1,
      },
      cacheDuration: 10000, // 10 seconds
    });
  }

  protected async performCheck(): Promise<HealthCheckData> {
    try {
      const redis = RedisClient.getInstance().getClient();
      
      // Ping to check connectivity
      const pingStart = Date.now();
      await redis.ping();
      const pingTime = Date.now() - pingStart;
      
      // Get server info
      const info = await redis.info('server');
      const memoryInfo = await redis.info('memory');
      
      // Parse memory usage
      const usedMemoryMatch = memoryInfo.match(/used_memory_human:(.+)/);
      const usedMemory = usedMemoryMatch ? usedMemoryMatch[1].trim() : 'unknown';
      
      // Parse uptime
      const uptimeMatch = info.match(/uptime_in_seconds:(\d+)/);
      const uptimeSeconds = uptimeMatch ? parseInt(uptimeMatch[1]) : 0;
      
      // Get client count
      const clientInfo = await redis.info('clients');
      const connectedClientsMatch = clientInfo.match(/connected_clients:(\d+)/);
      const connectedClients = connectedClientsMatch ? parseInt(connectedClientsMatch[1]) : 0;
      
      // Get some stats
      const dbSize = await redis.dbSize();
      
      return {
        status: 'healthy',
        details: {
          ping: `${pingTime}ms`,
          usedMemory,
          uptimeSeconds,
          connectedClients,
          keyCount: dbSize,
          version: info.match(/redis_version:(.+)/)?.[1]?.trim(),
        },
      };
    } catch (error) {
      throw new Error(`Redis check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}