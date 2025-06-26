// src/infrastructure/monitoring/health/indicators/memory.indicator.ts
import { BaseHealthIndicator } from './base.indicator';
import { HealthCheckData } from '../types';
import * as os from 'os';

export class MemoryHealthIndicator extends BaseHealthIndicator {
  name = 'memory';
  private readonly warningThreshold: number;
  private readonly criticalThreshold: number;

  constructor(warningThreshold: number = 80, criticalThreshold: number = 90) {
    super({
      isEssential: false,
      cacheDuration: 5000, // 5 seconds
    });
    this.warningThreshold = warningThreshold;
    this.criticalThreshold = criticalThreshold;
  }

  protected async performCheck(): Promise<HealthCheckData> {
    try {
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const usedPercent = (usedMemory / totalMemory) * 100;

      // Get process memory usage
      const processMemory = process.memoryUsage();

      const status = this.determineStatus(
        usedPercent,
        this.warningThreshold,
        this.criticalThreshold,
      );

      return {
        status,
        details: {
          system: {
            total: this.formatBytes(totalMemory),
            used: this.formatBytes(usedMemory),
            free: this.formatBytes(freeMemory),
            usedPercent: `${usedPercent.toFixed(1)}%`,
          },
          process: {
            rss: this.formatBytes(processMemory.rss),
            heapTotal: this.formatBytes(processMemory.heapTotal),
            heapUsed: this.formatBytes(processMemory.heapUsed),
            external: this.formatBytes(processMemory.external),
          },
          thresholds: {
            warning: `${this.warningThreshold}%`,
            critical: `${this.criticalThreshold}%`,
          },
        },
      };
    } catch (error) {
      throw new Error(
        `Memory check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private formatBytes(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }
}
