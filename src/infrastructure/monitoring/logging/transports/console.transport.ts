// src/infrastructure/monitoring/logging/transports/console.transport.ts
import { BaseTransport } from './base.transport';
import { LogEntry, LogLevel, LogContext } from '../types';
import { config } from '../../../../core/config';

export class ConsoleTransport extends BaseTransport {
  private readonly colors = {
    fatal: '\x1b[35m', // Magenta
    error: '\x1b[31m', // Red
    warn: '\x1b[33m', // Yellow
    info: '\x1b[36m', // Cyan
    debug: '\x1b[32m', // Green
    trace: '\x1b[37m', // White
    reset: '\x1b[0m',
  };

  private readonly levelEmojis = {
    fatal: '💀',
    error: '❌',
    warn: '⚠️',
    info: 'ℹ️',
    debug: '🐛',
    trace: '🔍',
  };

  private readonly useColors: boolean;
  private readonly usePrettyPrint: boolean;

  constructor(level: LogLevel = 'info') {
    super('console', level);
    this.useColors = config.app.env !== 'production';
    this.usePrettyPrint = config.app.env !== 'production';

    // Don't buffer console logs - write immediately
    this.maxBufferSize = 1;
    this.flushInterval = 0;
  }

  isReady(): boolean {
    return true; // Console is always ready
  }

  protected async writeLog(entry: LogEntry): Promise<void> {
    if (this.usePrettyPrint) {
      this.prettyPrint(entry);
    } else {
      console.log(JSON.stringify(this.formatForProduction(entry)));
    }
  }

  private prettyPrint(entry: LogEntry): void {
    const { level, message, timestamp, context, error, data } = entry;
    const color = this.useColors ? this.colors[level] : '';
    const reset = this.useColors ? this.colors.reset : '';
    const emoji = this.levelEmojis[level];

    // Format timestamp
    const time = timestamp.toISOString().split('T')[1].split('.')[0];

    // Build log line
    let logLine = `${color}[${time}] ${emoji} ${level.toUpperCase().padEnd(5)}${reset}`;

    // Add correlation ID if present
    if (context.correlationId) {
      logLine += ` ${color}[${context.correlationId.substring(0, 8)}]${reset}`;
    }

    // Add service/module context
    if (context.service || context.module) {
      logLine += ` ${color}[${context.service || ''}${context.module ? '/' + context.module : ''}]${reset}`;
    }

    // Add message
    logLine += ` ${message}`;

    console.log(logLine);

    // Log additional context
    if (context.userId || context.tenantId || context.method) {
      const contextLine = this.formatContext(context);
      if (contextLine) {
        console.log(`  ${color}→${reset} ${contextLine}`);
      }
    }

    // Log data if present
    if (data && Object.keys(data).length > 0) {
      console.log(`  ${color}→${reset} Data:`, this.formatData(data));
    }

    // Log error if present
    if (error) {
      console.log(`  ${color}→${reset} Error:`, error);
    }

    // Add duration if present
    if (context.duration !== undefined) {
      console.log(`  ${color}→${reset} Duration: ${context.duration}ms`);
    }
  }

  private formatContext(context: LogContext): string {
    const parts: string[] = [];

    if (context.userId) parts.push(`user=${context.userId}`);
    if (context.tenantId) parts.push(`tenant=${context.tenantId}`);
    if (context.method) parts.push(`method=${context.method}`);

    return parts.join(', ');
  }

  private formatData(data: Record<string, unknown>): string {
    if (this.usePrettyPrint) {
      return JSON.stringify(data, null, 2);
    }
    return JSON.stringify(data);
  }

  private formatForProduction(entry: LogEntry): Record<string, unknown> {
    // Fixed: destructure to avoid message override
    const { error, message, timestamp, ...restContext } = entry;

    return {
      message,
      timestamp: timestamp.toISOString(),
      ...restContext,
      error: error ? this.serializeError(error) : undefined,
    };
  }

  private serializeError(error: any): Record<string, unknown> {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }
    return { error: String(error) };
  }
}
