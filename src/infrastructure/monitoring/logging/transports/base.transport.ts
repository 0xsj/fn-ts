// src/infrastructure/monitoring/logging/transports/base.transport.ts
import { LoggerTransport, LogEntry, LogLevel, shouldLog } from '../types';
import { serializeError } from '../../../../shared/utils';

export abstract class BaseTransport implements LoggerTransport {
  public readonly name: string;
  public readonly level: LogLevel;
  protected readonly buffer: LogEntry[] = [];
  protected readonly maxBufferSize: number = 100;
  protected readonly flushInterval: number = 5000; // 5 seconds
  protected flushTimer?: NodeJS.Timeout;

  constructor(name: string, level: LogLevel = 'info') {
    this.name = name;
    this.level = level;
    this.startFlushTimer();
  }

  abstract isReady(): boolean;
  protected abstract writeLog(entry: LogEntry): Promise<void>;
  protected abstract writeBatch?(entries: LogEntry[]): Promise<void>; // Made optional with ?

  async log(entry: LogEntry): Promise<void> {
    // Check if we should log this entry based on level
    if (!shouldLog(entry.level, this.level)) {
      return;
    }

    // Add to buffer
    this.buffer.push(this.formatEntry(entry));

    // Flush if buffer is full
    if (this.buffer.length >= this.maxBufferSize) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const entries = [...this.buffer]; // Fixed typo: entires -> entries
    this.buffer.length = 0;

    try {
      if (this.writeBatch) {
        await this.writeBatch(entries);
      } else {
        // Fallback to individual writes
        await Promise.all(entries.map((entry) => this.writeLog(entry)));
      }
    } catch (error) {
      // Re-add entries to buffer on failure
      this.buffer.unshift(...entries);
      console.error(`Failed to flush logs in ${this.name} transport:`, error);
    }
  }

  async close(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
    await this.flush();
  }

  protected formatEntry(entry: LogEntry): LogEntry {
    // Serialize error if present
    if (entry.error) {
      return {
        ...entry,
        error: serializeError(entry.error),
      };
    }
    return entry;
  }

  protected startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(error => {
        console.error(`Error in flush timer for ${this.name}:`, error);
      });
    }, this.flushInterval); // Pass the interval duration as second parameter
  }

  protected sanitizeData(
    data: Record<string, unknown>,
    redactPaths: string[] = [],
  ): Record<string, unknown> {
    if (redactPaths.length === 0) return data;

    const sanitized = { ...data };
    
    for (const path of redactPaths) {
      const keys = path.split('.');
      let current: any = sanitized;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (current[keys[i]] === undefined) break;
        current = current[keys[i]];
      }
      
      const lastKey = keys[keys.length - 1];
      if (current && current[lastKey] !== undefined) {
        current[lastKey] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}