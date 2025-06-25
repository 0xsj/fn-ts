// src/infrastructure/monitoring/health/indicators/disk.indicator.ts
import { BaseHealthIndicator } from './base.indicator';
import { HealthCheckData } from '../types';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class DiskHealthIndicator extends BaseHealthIndicator {
  name = 'disk';
  private readonly path: string;
  private readonly warningThreshold: number;
  private readonly criticalThreshold: number;

  constructor(
    path: string = '/',
    warningThreshold: number = 80,
    criticalThreshold: number = 90
  ) {
    super({
      isEssential: false,
      cacheDuration: 30000, // 30 seconds
    });
    this.path = path;
    this.warningThreshold = warningThreshold;
    this.criticalThreshold = criticalThreshold;
  }

  protected async performCheck(): Promise<HealthCheckData> {
    try {
      const diskInfo = await this.getDiskUsage();
      
      const usedPercent = diskInfo.usedPercent;
      const status = this.determineStatus(
        usedPercent,
        this.warningThreshold,
        this.criticalThreshold
      );
      
      return {
        status,
        details: {
          path: this.path,
          total: diskInfo.total,
          used: diskInfo.used,
          free: diskInfo.free,
          usedPercent: `${usedPercent.toFixed(1)}%`,
          thresholds: {
            warning: `${this.warningThreshold}%`,
            critical: `${this.criticalThreshold}%`,
          },
        },
      };
    } catch (error) {
      throw new Error(`Disk check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getDiskUsage(): Promise<{
    total: string;
    used: string;
    free: string;
    usedPercent: number;
  }> {
    const platform = os.platform();
    
    if (platform === 'darwin' || platform === 'linux') {
      // Use df command for Unix-like systems
      const { stdout } = await execAsync(`df -k "${this.path}" | tail -1`);
      const parts = stdout.trim().split(/\s+/);
      
      const totalKb = parseInt(parts[1]);
      const usedKb = parseInt(parts[2]);
      const availableKb = parseInt(parts[3]);
      const usedPercent = parseInt(parts[4]);
      
      return {
        total: this.formatBytes(totalKb * 1024),
        used: this.formatBytes(usedKb * 1024),
        free: this.formatBytes(availableKb * 1024),
        usedPercent,
      };
    } else if (platform === 'win32') {
      // Windows implementation
      const { } = await execAsync('wmic logicaldisk get size,freespace,caption');
      // Parse Windows output (simplified)
      return {
        total: 'N/A',
        used: 'N/A',
        free: 'N/A',
        usedPercent: 0,
      };
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  private formatBytes(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }
}